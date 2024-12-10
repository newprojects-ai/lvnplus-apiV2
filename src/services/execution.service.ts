import { Prisma, test_executions, test_plans } from '@prisma/client';
import prisma from '../lib/prisma';
import { TestExecutionResponse, UpdateExecutionDTO } from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

interface ExecutionWithPlan extends test_executions {
  test_plans: test_plans & {
    users_test_plans_student_idTousers: { user_id: bigint }[];
    users_test_plans_planned_byTousers: { user_id: bigint }[];
  };
}

interface TestData {
  responses: { questionId: string; answer: string }[];
  questions: { question_id: string; correct_answer: string }[];
}

export class TestExecutionService {
  async getExecution(
    executionId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);
    return this.formatExecutionResponse(execution);
  }

  async startExecution(
    executionId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'NOT_STARTED') {
      throw new ValidationError('Test has already been started');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: executionId },
      data: {
        status: 'IN_PROGRESS',
        started_at: new Date(),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async submitAnswer(
    executionId: bigint,
    userId: bigint,
    updateData: UpdateExecutionDTO
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const testData: TestData = JSON.parse(execution.test_data);
    testData.responses.push(updateData.response);

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: executionId },
      data: {
        test_data: JSON.stringify(testData),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async completeExecution(
    executionId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const score = await this.calculateScore(execution);

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: executionId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        score,
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async createExecution(
    planId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    // Fetch the test plan with all related users
    const testPlan = await prisma.test_plans.findUnique({
      where: { test_plan_id: planId },
      include: {
        users_test_plans_student_idTousers: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        },
        users_test_plans_planned_byTousers: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        },
        test_templates: true,
        exam_boards: true,
      },
    });

    // Comprehensive logging for debugging
    console.log('Test Plan Raw Data:', JSON.stringify(testPlan, null, 2));

    if (!testPlan) {
      throw new NotFoundError('Test plan not found');
    }

    // Safe extraction of user IDs with extensive error handling
    const extractUserIds = (users: any): bigint[] => {
      // If users is an array, map user IDs
      if (Array.isArray(users)) {
        return users.map(u => BigInt(u.user_id));
      }
      
      // If users is a single object, convert its user_id
      if (users && typeof users === 'object' && 'user_id' in users) {
        return [BigInt(users.user_id)];
      }
      
      // If no valid users found, return empty array
      console.error('Invalid users structure:', users);
      return [];
    };

    // Extract student and planner user IDs
    const studentUserIds = extractUserIds(testPlan.users_test_plans_student_idTousers);
    const plannedByUserIds = extractUserIds(testPlan.users_test_plans_planned_byTousers);

    // Detailed logging of extracted user IDs
    console.log('User Authorization Check:', {
      planId: planId.toString(),
      userId: userId.toString(),
      studentUserIds: studentUserIds.map(String),
      plannedByUserIds: plannedByUserIds.map(String),
      isStudent: studentUserIds.includes(userId),
      isPlanner: plannedByUserIds.includes(userId),
    });

    // Check user authorization
    const isAuthorized = studentUserIds.some(id => id === userId) || 
                         plannedByUserIds.some(id => id === userId);
  
    if (!isAuthorized) {
      console.error('Authorization Failed', {
        userId: userId.toString(),
        studentUsers: studentUserIds.map(String),
        plannedByUsers: plannedByUserIds.map(String),
        studentUserIdsType: typeof studentUserIds[0],
        userIdType: typeof userId,
      });
      throw new UnauthorizedError('You are not authorized to start this test');
    }

    // Create a new test execution
    const newExecution = await prisma.test_executions.create({
      data: {
        test_plan_id: planId,
        status: 'NOT_STARTED',
        test_data: JSON.stringify({ responses: [] }),
        started_at: null,
        completed_at: null,
        score: null,
      },
    });

    return this.formatExecutionResponse(newExecution);
  }

  async resumeExecution(
    executionId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'PAUSED') {
      throw new ValidationError('Test is not paused');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: executionId },
      data: {
        status: 'IN_PROGRESS',
        paused_at: null,
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async pauseExecution(
    executionId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: executionId },
      data: {
        status: 'PAUSED',
        paused_at: new Date(),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  private async findExecutionWithAccess(executionId: bigint, userId: bigint): Promise<ExecutionWithPlan> {
    const execution = await prisma.test_executions.findUnique({
      where: { execution_id: executionId },
      include: {
        test_plans: {
          include: {
            users_test_plans_student_idTousers: true,
            users_test_plans_planned_byTousers: true,
          },
        },
      },
    }) as ExecutionWithPlan | null;

    if (!execution) {
      throw new NotFoundError('Test execution not found');
    }

    const studentIds = Array.isArray(execution.test_plans.users_test_plans_student_idTousers) 
      ? execution.test_plans.users_test_plans_student_idTousers.map(u => u.user_id)
      : [];
    
    const plannedByIds = Array.isArray(execution.test_plans.users_test_plans_planned_byTousers)
      ? execution.test_plans.users_test_plans_planned_byTousers.map(u => u.user_id)
      : [];

    if (!studentIds.includes(userId) && !plannedByIds.includes(userId)) {
      throw new UnauthorizedError('Unauthorized access to test execution');
    }

    return execution;
  }

  private async calculateScore(execution: ExecutionWithPlan): Promise<number> {
    try {
      const testData: TestData = JSON.parse(execution.test_data);

      if (!testData.questions || !testData.responses) {
        throw new ValidationError('Invalid test data structure');
      }

      const totalQuestions = testData.questions.length;
      if (totalQuestions === 0) {
        return 0;
      }

      const correctAnswers = testData.responses.filter(response => {
        const question = testData.questions.find(
          q => q.question_id === response.questionId
        );
        return question && question.correct_answer === response.answer;
      }).length;

      return Math.round((correctAnswers / totalQuestions) * 100);
    } catch (error) {
      console.error('Error calculating score:', error);
      throw new ValidationError('Unable to calculate test score');
    }
  }

  private formatExecutionResponse(execution: ExecutionWithPlan): TestExecutionResponse {
    return {
      executionId: execution.execution_id,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      pausedAt: execution.paused_at,
      score: execution.score,
      testData: JSON.parse(execution.test_data),
    };
  }
}