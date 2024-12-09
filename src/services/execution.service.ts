import { Prisma, test_executions, test_plans } from '@prisma/client';
import prisma from '../lib/prisma';
import { TestExecutionResponse, UpdateExecutionDTO } from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

interface ExecutionWithPlan extends test_executions {
  test_plans: test_plans & {
    users_test_plans_student_idTousers: { id: bigint }[];
    users_test_plans_planned_byTousers: { id: bigint }[];
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
    // Check if the user has access to the test plan
    const testPlan = await prisma.test_plans.findUnique({
      where: { plan_id: planId },
      include: {
        users_test_plans_student_idTousers: true,
        users_test_plans_planned_byTousers: true,
      },
    });

    if (!testPlan) {
      throw new NotFoundError('Test plan not found');
    }

    // Verify user access to the test plan
    const studentIds = testPlan.users_test_plans_student_idTousers.map(u => u.id);
    if (!studentIds.includes(userId)) {
      throw new UnauthorizedError('You are not authorized to start this test');
    }

    // Create a new test execution
    const newExecution = await prisma.test_executions.create({
      data: {
        test_plan_id: planId,
        student_id: userId,
        status: 'NOT_STARTED',
        test_data: JSON.stringify({ responses: [] }),
        created_at: new Date(),
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

    const studentIds = execution.test_plans.users_test_plans_student_idTousers.map(u => u.id);
    const plannedByIds = execution.test_plans.users_test_plans_planned_byTousers.map(u => u.id);

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