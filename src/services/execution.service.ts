import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { 
  CreateTestExecutionDTO, 
  UpdateTestExecutionDTO, 
  TestExecutionResponse 
} from '../types';
import { 
  NotFoundError, 
  UnauthorizedError, 
  ValidationError 
} from '../utils/errors';

interface ExecutionWithPlan extends Prisma.test_executions {
  test_plans: Prisma.test_plans;
}

interface TestData {
  responses: { questionId: string; answer: string }[];
  questions: { question_id: string; correct_answer: string }[];
}

export class TestExecutionService {
  // Utility function to safely convert to BigInt
  private safeBigInt(value: bigint | string | undefined, defaultValue: bigint = BigInt(0)): bigint {
    if (value === undefined) {
      return defaultValue;
    }
    
    try {
      // Handle empty strings
      if (typeof value === 'string' && value.trim() === '') {
        throw new Error('Empty string is not a valid BigInt');
      }
      
      // Convert to BigInt
      const result = typeof value === 'string' ? BigInt(value) : value;
      
      // Validate the result
      if (result === BigInt(0) && value !== '0' && value !== 0n) {
        throw new Error(`Invalid BigInt value: ${value}`);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to convert to BigInt:', {
        value,
        type: typeof value,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new ValidationError(`Invalid execution ID: ${value}`);
    }
  }

  async getExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);
    return this.formatExecutionResponse(execution);
  }

  async startExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    if (execution.status !== 'NOT_STARTED') {
      throw new ValidationError('Test has already been started');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        status: 'IN_PROGRESS',
        started_at: new Date(),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async submitAnswer(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined,
    updateData: UpdateTestExecutionDTO
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);
    const safeQuestionId = this.safeBigInt(updateData.question_id);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    // Parse the existing test data
    const testData = JSON.parse(execution.test_data);
    const { questions, responses } = testData;

    // Find the question being answered
    const questionIndex = responses.findIndex(
      (resp: { question_id: bigint }) => resp.question_id === safeQuestionId
    );

    if (questionIndex === -1) {
      throw new NotFoundError('Question not found in the test execution');
    }

    // Update the response for the specific question
    const updatedResponses = [...responses];
    updatedResponses[questionIndex] = {
      ...updatedResponses[questionIndex],
      student_answer: updateData.student_answer,
      is_correct: this.checkAnswer(
        questions[questionIndex].options, 
        updateData.student_answer
      ),
      time_spent: updateData.time_spent || 0
    };

    // Update the test data with the new responses
    const updatedTestData = {
      ...testData,
      responses: updatedResponses
    };

    // Update the test execution in the database
    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        test_data: JSON.stringify(updatedTestData),
        status: this.determineExecutionStatus(updatedResponses)
      }
    });

    return {
      execution: updatedExecution,
      testData: updatedTestData
    };
  }

  async completeExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const score = await this.calculateScore(execution);

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        score,
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async createExecution(
    planId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeUserId = this.safeBigInt(userId);
    const safePlanId = this.safeBigInt(planId);

    // Fetch the test plan with all related users
    const testPlan = await prisma.test_plans.findUnique({
      where: { test_plan_id: safePlanId },
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
        test_executions: {
          orderBy: { execution_id: 'desc' },
          take: 1
        }
      },
    });

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

    // Check user authorization
    const isAuthorized = studentUserIds.some(id => id === safeUserId) || 
                         plannedByUserIds.some(id => id === safeUserId);

    if (!isAuthorized) {
      throw new UnauthorizedError('You are not authorized to start this test');
    }

    // If an execution already exists and is NOT_STARTED, return it
    if (testPlan.test_executions && testPlan.test_executions.length > 0) {
      const existingExecution = testPlan.test_executions[0];
      if (existingExecution.status === 'NOT_STARTED') {
        console.log('Existing NOT_STARTED execution found', {
          executionId: existingExecution.execution_id.toString(),
        });
        return this.formatExecutionResponse(existingExecution);
      }
    }

    // Fetch selected questions for the test plan
    const selectedQuestions = await prisma.questions.findMany({
      where: {
        question_id: {
          in: JSON.parse(testPlan.configuration).questions.map(q => BigInt(q.question_id))
        }
      }
    });

    // Create a new test execution
    const newExecution = await prisma.test_executions.create({
      data: {
        test_plan_id: safePlanId,
        status: 'NOT_STARTED',
        test_data: JSON.stringify({
          questions: selectedQuestions.map(q => ({
            question_id: q.question_id,
            subtopic_id: q.subtopic_id,
            question_text: q.question_text,
            options: q.options,
            difficulty_level: q.difficulty_level,
          })),
          responses: selectedQuestions.map(q => ({
            question_id: q.question_id,
            student_answer: null,
            is_correct: null,
            time_spent: null,
          })),
          timing: {
            test_start_time: null,
            test_end_time: null,
            total_time_allowed: testPlan.time_limit,
          },
        }),
        started_at: null,
        completed_at: null,
        score: null,
      },
    });

    console.log('Test execution created', {
      executionId: newExecution.execution_id.toString(),
      testPlanId: newExecution.test_plan_id.toString(),
    });

    return this.formatExecutionResponse(newExecution);
  }

  async resumeExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    if (execution.status !== 'PAUSED') {
      throw new ValidationError('Test is not paused');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        status: 'IN_PROGRESS',
        paused_at: null,
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async pauseExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        status: 'PAUSED',
        paused_at: new Date(),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  private async findExecutionWithAccess(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<ExecutionWithPlan> {
    try {
      // Safely convert inputs to bigint with default values
      const safeExecutionId = this.safeBigInt(executionId);
      const safeUserId = this.safeBigInt(userId);

      console.log('Finding execution with:', {
        executionId: safeExecutionId.toString(),
        userId: safeUserId.toString()
      });

      // First find the execution with its test plan
      const execution = await prisma.test_executions.findUnique({
        where: { 
          execution_id: safeExecutionId 
        },
        include: {
          test_plans: true
        }
      });

      // Enhanced logging for debugging
      if (!execution) {
        console.error('No execution found with ID:', safeExecutionId.toString());
        throw new NotFoundError(`Test execution not found for ID: ${safeExecutionId.toString()}`);
      }

      // Log execution details for debugging
      console.log('Found execution:', {
        id: execution.execution_id.toString(),
        status: execution.status,
        planId: execution.test_plan_id.toString()
      });

      // Check if the test plan exists
      if (!execution.test_plans) {
        console.error('No test plan found for execution:', safeExecutionId.toString());
        throw new ValidationError('Test execution has no associated test plan');
      }

      // Now check if the user has access to this test plan
      const hasAccess = await prisma.test_plans.count({
        where: {
          test_plan_id: execution.test_plan_id,
          OR: [
            { student_id: safeUserId },
            { planned_by: safeUserId }
          ]
        }
      });

      console.log('Access check:', {
        userId: safeUserId.toString(),
        planId: execution.test_plan_id.toString(),
        hasAccess: hasAccess > 0
      });

      if (hasAccess === 0) {
        console.error('User not associated with test plan:', {
          userId: safeUserId.toString(),
          planId: execution.test_plan_id.toString()
        });
        throw new UnauthorizedError('User does not have access to this test execution');
      }

      return execution;
    } catch (error) {
      // Enhanced error logging
      console.error('Error in findExecutionWithAccess:', {
        error: error instanceof Error ? error.message : String(error),
        executionId: executionId?.toString(),
        userId: userId?.toString()
      });

      // Rethrow the error with more context
      if (error instanceof ValidationError || 
          error instanceof UnauthorizedError || 
          error instanceof NotFoundError) {
        throw error;
      }

      throw new ValidationError(`Failed to access test execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  private checkAnswer(options: any[], studentAnswer: string): boolean {
    // Find the correct option
    const correctOption = options.find((opt: any) => opt.is_correct);
    return studentAnswer === correctOption?.option_text;
  }

  private determineExecutionStatus(responses: any[]): string {
    // Check if all questions have been answered
    const allAnswered = responses.every(resp => resp.student_answer !== null);
    
    // If all answered, mark as completed
    return allAnswered ? 'COMPLETED' : 'IN_PROGRESS';
  }

  private formatExecutionResponse(execution: ExecutionWithPlan): TestExecutionResponse {
    return {
      executionId: execution.execution_id,
      testPlanId: execution.test_plan_id,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      pausedAt: execution.paused_at,
      score: execution.score,
      testData: JSON.parse(execution.test_data),
    };
  }
}