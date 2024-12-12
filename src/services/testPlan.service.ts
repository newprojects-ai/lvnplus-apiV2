import { PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateTestPlanDTO, UpdateTestPlanDTO, TestPlanResponse } from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { QuestionService } from './question.service';
import { questionSelectorService } from './questionSelector.service';

export class TestPlanService {
  async createTestPlan(
    plannerId: bigint,
    data: CreateTestPlanDTO
  ): Promise<TestPlanResponse> {
    // Ensure all IDs are converted to BigInt
    const safePlannerId = BigInt(plannerId);
    const safeStudentId = data.studentId ? BigInt(data.studentId) : null;
    const safeBoardId = data.boardId ? BigInt(data.boardId) : null;

    // Validate and convert subtopic IDs
    const subtopicIds = data.configuration.subtopics.map(id => BigInt(id));
    const topicIds = data.configuration.topics.map(id => BigInt(id));
  
    // Use totalQuestionCount
    const totalQuestionCount = data.configuration.totalQuestionCount;

    // Select questions using the new QuestionSelectorService
    const selectedQuestions = await this.selectQuestions(
      subtopicIds.length > 0 ? subtopicIds.map(id => Number(id)) : undefined,
      topicIds.length > 0 ? topicIds.map(id => Number(id)) : undefined,
      totalQuestionCount
    );

    if (selectedQuestions.length < totalQuestionCount) {
      throw new ValidationError(`Not enough questions available. Found ${selectedQuestions.length}, needed ${totalQuestionCount}`);
    }

    // Randomly select questions based on the configuration
    const randomQuestions = this.selectRandomQuestions(selectedQuestions, totalQuestionCount);

    // Create test plan in the database
    const testPlan = await prisma.test_plans.create({
      data: {
        board_id: safeBoardId ? Number(safeBoardId) : null,
        student_id: safeStudentId ? Number(safeStudentId) : null,
        planned_by: Number(safePlannerId),
        test_type: data.testType,
        timing_type: data.timingType,
        time_limit: data.timeLimit,
        planned_at: new Date(),
        configuration: JSON.stringify({
          topics: topicIds.map(id => id.toString()),
          subtopics: subtopicIds.map(id => id.toString()),
          totalQuestionCount: data.configuration.totalQuestionCount,
        }),
        template_id: data.templateId || undefined,
      },
    });

    // Create test execution for the test plan
    const testExecution = await prisma.test_executions.create({
      data: {
        test_plan_id: testPlan.test_plan_id,
        status: 'NOT_STARTED',
        test_data: JSON.stringify({
          questions: randomQuestions.map(q => ({
            question_id: Number(q.question_id),
            subtopic_id: Number(q.subtopic_id),
            question_text: q.question_text,
            options: JSON.parse(q.options),
            difficulty_level: Number(q.difficulty_level),
          })),
          responses: randomQuestions.map(q => ({
            question_id: Number(q.question_id),
            student_answer: null,
            is_correct: null,
            time_spent: 0
          })),
        }),
      },
    });

    console.log('Test plan and execution created', {
      testPlanId: testPlan.test_plan_id,
      testExecutionId: testExecution.execution_id,
      selectedQuestionsCount: randomQuestions.length,
      totalQuestionCount,
    });

    // Fetch the complete test plan with the newly created execution
    const completeTestPlan = await prisma.test_plans.findUnique({
      where: { test_plan_id: testPlan.test_plan_id },
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

    return this.formatTestPlanResponse(completeTestPlan);
  }

  private async selectQuestions(
    subtopicIds?: number[], 
    topicIds?: number[], 
    totalQuestions?: number
  ): Promise<any[]> {
    // Use the new QuestionSelectorService to select questions
    const selectedQuestions = await questionSelectorService.selectQuestions({
      subtopicIds,
      topicIds,
      totalQuestionCount: totalQuestions || 10,  // Default to 10 if not specified
    }, {
      randomize: true,
      allowCrossDifficulty: true,
      topicDistributionStrategy: 'PROPORTIONAL'
    });

    return selectedQuestions;
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

    if (testPlan.planned_by !== userId && testPlan.student_id !== userId) {
      throw new UnauthorizedError('Unauthorized access to test plan');
    }

    return this.formatTestPlanResponse(testPlan);
  }

  async updateTestPlan(
    testPlanId: bigint,
    userId: bigint,
    data: UpdateTestPlanDTO
  ): Promise<TestPlanResponse> {
    const testPlan = await this.findTestPlanWithAccess(testPlanId, userId);

    const updatedTestPlan = await prisma.test_plans.update({
      where: { test_plan_id: testPlanId },
      data: {
        ...(data.templateId && { template_id: data.templateId }),
        ...(data.boardId && { board_id: data.boardId }),
        ...(data.testType && { test_type: data.testType }),
        ...(data.timingType && { timing_type: data.timingType }),
        ...(data.timeLimit !== undefined && { time_limit: data.timeLimit }),
        ...(data.studentId && { student_id: typeof data.studentId === 'bigint' 
          ? data.studentId 
          : BigInt(String(data.studentId)) }),
        ...(data.configuration && { configuration: JSON.stringify(data.configuration) }),
      },
      include: this.getTestPlanIncludes(),
    });

    return this.formatTestPlanResponse(updatedTestPlan);
  }

  async deleteTestPlan(testPlanId: bigint, userId: bigint): Promise<void> {
    await this.findTestPlanWithAccess(testPlanId, userId);
    await prisma.test_plans.delete({
      where: { test_plan_id: testPlanId },
    });
  }

  private async findTestPlanWithAccess(testPlanId: bigint, userId: bigint) {
    const testPlan = await prisma.test_plans.findUnique({
      where: { test_plan_id: testPlanId },
      include: this.getTestPlanIncludes(),
    });

    if (!testPlan) {
      throw new NotFoundError('Test plan not found');
    }

    if (testPlan.planned_by !== userId) {
      throw new UnauthorizedError('Not authorized to access this test plan');
    }

    return testPlan;
  }

  private getTestPlanIncludes() {
    return {
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
    };
  }

  private selectRandomQuestions(questions: any[], count: number): any[] {
    // Shuffle the questions array
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    
    // Return the first 'count' questions
    return shuffled.slice(0, count);
  }

  private formatTestPlanResponse(
    testPlan: any
  ): TestPlanResponse {
    return {
      testPlanId: testPlan.test_plan_id,
      templateId: testPlan.template_id,
      boardId: testPlan.board_id,
      testType: testPlan.test_type,
      timingType: testPlan.timing_type,
      timeLimit: testPlan.time_limit,
      student: {
        userId: testPlan.users_test_plans_student_idTousers.user_id,
        email: testPlan.users_test_plans_student_idTousers.email,
        firstName: testPlan.users_test_plans_student_idTousers.first_name,
        lastName: testPlan.users_test_plans_student_idTousers.last_name,
      },
      plannedBy: testPlan.planned_by,
      plannedAt: testPlan.planned_at,
      configuration: JSON.parse(testPlan.configuration),
      execution: testPlan.test_executions[0] ? {
        status: testPlan.test_executions[0].status,
        startedAt: testPlan.test_executions[0].started_at,
        completedAt: testPlan.test_executions[0].completed_at,
        score: testPlan.test_executions[0].score,
      } : undefined,
    };
  }
}