import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  CreateTestPlanDTO,
  TestPlanResponse,
  TestExecutionResponse,
} from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

export class TestService {
  async createTestPlan(
    plannerId: bigint,
    data: CreateTestPlanDTO
  ): Promise<TestPlanResponse> {
    const testPlan = await prisma.test_plans.create({
      data: {
        template_id: data.templateId ? BigInt(data.templateId) : null,
        board_id: data.boardId,
        test_type: data.testType,
        timing_type: data.timingType,
        time_limit: data.timeLimit,
        student_id: BigInt(data.studentId),
        planned_by: plannerId,
        configuration: JSON.stringify(data.configuration),
      },
      include: {
        users_test_plans_student_idTousers: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        test_executions: {
          select: {
            status: true,
            started_at: true,
            completed_at: true,
            score: true,
          },
          take: 1,
          orderBy: {
            execution_id: 'desc',
          },
        },
      },
    });

    // Create initial test execution
    await prisma.test_executions.create({
      data: {
        test_plan_id: testPlan.test_plan_id,
        status: 'NOT_STARTED',
        test_data: JSON.stringify({
          questions: await this.selectQuestions(data.configuration),
          responses: [],
          timing: [],
        }),
      },
    });

    return this.formatTestPlanResponse(testPlan);
  }

  async getTestPlan(
    testPlanId: bigint,
    userId: bigint
  ): Promise<TestPlanResponse> {
    const testPlan = await prisma.test_plans.findUnique({
      where: { test_plan_id: testPlanId },
      include: {
        users_test_plans_student_idTousers: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        test_executions: {
          select: {
            status: true,
            started_at: true,
            completed_at: true,
            score: true,
          },
          take: 1,
          orderBy: {
            execution_id: 'desc',
          },
        },
      },
    });

    if (!testPlan) {
      throw new NotFoundError('Test plan not found');
    }

    if (testPlan.student_id !== userId && testPlan.planned_by !== userId) {
      throw new UnauthorizedError('Unauthorized access to test plan');
    }

    return this.formatTestPlanResponse(testPlan);
  }

  async getStudentTests(
    studentId: bigint,
    userId: bigint,
    filters: {
      status?: string;
      from?: string;
      to?: string;
    }
  ) {
    // Verify access rights
    if (studentId !== userId) {
      const hasAccess = await this.verifyStudentAccess(userId, studentId);
      if (!hasAccess) {
        throw new UnauthorizedError('Unauthorized access to student tests');
      }
    }

    const where: Prisma.test_plansWhereInput = {
      student_id: studentId,
    };

    if (filters.status) {
      where.test_executions = {
        some: {
          status: filters.status as any,
        },
      };
    }

    if (filters.from || filters.to) {
      where.planned_at = {};
      if (filters.from) {
        where.planned_at.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.planned_at.lte = new Date(filters.to);
      }
    }

    const testPlans = await prisma.test_plans.findMany({
      where,
      include: {
        users_test_plans_student_idTousers: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        test_executions: {
          select: {
            status: true,
            started_at: true,
            completed_at: true,
            score: true,
          },
          take: 1,
          orderBy: {
            execution_id: 'desc',
          },
        },
      },
      orderBy: {
        planned_at: 'desc',
      },
    });

    return testPlans.map(this.formatTestPlanResponse);
  }

  async startTest(
    testPlanId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const testPlan = await prisma.test_plans.findUnique({
      where: { test_plan_id: testPlanId },
      include: {
        test_executions: {
          orderBy: {
            execution_id: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!testPlan) {
      throw new NotFoundError('Test plan not found');
    }

    if (testPlan.student_id !== userId) {
      throw new UnauthorizedError('Only the assigned student can start the test');
    }

    const latestExecution = testPlan.test_executions[0];
    if (!latestExecution || latestExecution.status !== 'NOT_STARTED') {
      throw new ValidationError('Test cannot be started');
    }

    const execution = await prisma.test_executions.update({
      where: { execution_id: latestExecution.execution_id },
      data: {
        status: 'IN_PROGRESS',
        started_at: new Date(),
      },
    });

    return this.formatExecutionResponse(execution);
  }

  async submitAnswer(
    executionId: bigint,
    userId: bigint,
    answer: {
      questionId: bigint;
      answer: string;
      timeSpent: number;
    }
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const testData = JSON.parse(execution.test_data);
    testData.responses.push(answer);

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: executionId },
      data: {
        test_data: JSON.stringify(testData),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async getTestStatus(
    executionId: bigint,
    userId: bigint
  ) {
    const execution = await this.findExecutionWithAccess(executionId, userId);
    const testData = JSON.parse(execution.test_data);

    return {
      status: execution.status,
      timeRemaining: this.calculateTimeRemaining(execution),
      questionsAnswered: testData.responses.length,
      totalQuestions: testData.questions.length,
    };
  }

  async getTestResults(
    executionId: bigint,
    userId: bigint
  ) {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'COMPLETED') {
      throw new ValidationError('Test results are not available');
    }

    const testData = JSON.parse(execution.test_data);
    const analysis = this.analyzeTestResults(testData);

    return {
      score: execution.score,
      totalQuestions: testData.questions.length,
      correctAnswers: analysis.correctAnswers,
      timeSpent: analysis.totalTimeSpent,
      questionAnalysis: analysis.questionAnalysis,
    };
  }

  private async selectQuestions(configuration: any) {
    // Implementation of question selection logic
    // This should be similar to the logic in TestPlanService
    return [];
  }

  private async findExecutionWithAccess(executionId: bigint, userId: bigint) {
    const execution = await prisma.test_executions.findUnique({
      where: { execution_id: executionId },
      include: {
        test_plans: true,
      },
    });

    if (!execution) {
      throw new NotFoundError('Test execution not found');
    }

    if (
      execution.test_plans.student_id !== userId &&
      execution.test_plans.planned_by !== userId
    ) {
      throw new UnauthorizedError('Unauthorized access to test execution');
    }

    return execution;
  }

  private async verifyStudentAccess(teacherId: bigint, studentId: bigint) {
    // In a real implementation, this would check if the teacher has access to the student
    // For now, we'll assume all teachers have access to all students
    const teacher = await prisma.users.findFirst({
      where: {
        user_id: teacherId,
        user_roles: {
          some: {
            roles: {
              role_name: {
                in: ['TEACHER', 'ADMIN'],
              },
            },
          },
        },
      },
    });

    return !!teacher;
  }

  private calculateTimeRemaining(execution: any) {
    if (!execution.test_plans.time_limit || execution.status !== 'IN_PROGRESS') {
      return null;
    }

    const startTime = new Date(execution.started_at).getTime();
    const timeLimit = execution.test_plans.time_limit * 60 * 1000; // Convert minutes to milliseconds
    const elapsed = Date.now() - startTime;

    return Math.max(0, timeLimit - elapsed);
  }

  private analyzeTestResults(testData: any) {
    let correctAnswers = 0;
    let totalTimeSpent = 0;
    const questionAnalysis = [];

    for (const response of testData.responses) {
      const question = testData.questions.find(
        (q: any) => q.question_id === response.questionId
      );

      const isCorrect = question?.correct_answer === response.answer;
      if (isCorrect) correctAnswers++;

      totalTimeSpent += response.timeSpent;

      questionAnalysis.push({
        questionId: response.questionId,
        correct: isCorrect,
        timeSpent: response.timeSpent,
        topic: question?.topic?.name,
      });
    }

    return {
      correctAnswers,
      totalTimeSpent,
      questionAnalysis,
    };
  }

  private formatTestPlanResponse(testPlan: any): TestPlanResponse {
    return {
      testPlanId: testPlan.test_plan_id,
      testType: testPlan.test_type,
      timingType: testPlan.timing_type,
      timeLimit: testPlan.time_limit,
      student: {
        userId: testPlan.users_test_plans_student_idTousers.user_id,
        email: testPlan.users_test_plans_student_idTousers.email,
        firstName: testPlan.users_test_plans_student_idTousers.first_name,
        lastName: testPlan.users_test_plans_student_idTousers.last_name,
      },
      configuration: JSON.parse(testPlan.configuration),
      execution: testPlan.test_executions[0] ? {
        status: testPlan.test_executions[0].status,
        startedAt: testPlan.test_executions[0].started_at,
        completedAt: testPlan.test_executions[0].completed_at,
        score: testPlan.test_executions[0].score,
      } : undefined,
    };
  }

  private formatExecutionResponse(execution: any): TestExecutionResponse {
    return {
      executionId: execution.execution_id,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      score: execution.score,
      testData: JSON.parse(execution.test_data),
    };
  }
}