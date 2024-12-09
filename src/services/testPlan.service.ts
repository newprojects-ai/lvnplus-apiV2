import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateTestPlanDTO, UpdateTestPlanDTO, TestPlanResponse } from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

export class TestPlanService {
  async createTestPlan(
    plannerId: bigint,
    data: CreateTestPlanDTO
  ): Promise<TestPlanResponse> {
    const testPlan = await prisma.test_plans.create({
      data: {
        template_id: data.templateId,
        board_id: data.boardId,
        test_type: data.testType,
        timing_type: data.timingType,
        time_limit: data.timeLimit,
        student_id: BigInt(data.studentId),
        planned_by: BigInt(data.plannedBy),
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

    const selectedQuestions = await this.selectQuestions(data.configuration);
    
    if (selectedQuestions.length < this.getTotalQuestionCount(data.configuration.questionCounts)) {
      throw new ValidationError('Not enough questions available for the selected criteria');
    }

    // Create initial test execution
    await prisma.test_executions.create({
      data: {
        test_plan_id: testPlan.test_plan_id,
        status: 'NOT_STARTED',
        test_data: JSON.stringify({
          questions: selectedQuestions,
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
        ...(data.studentId && { student_id: BigInt(data.studentId) }),
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

  private async selectQuestions(configuration: CreateTestPlanDTO['configuration']) {
    const { questionCounts, subtopics } = configuration;
    const totalQuestions = this.getTotalQuestionCount(questionCounts);
    
    // Get all available questions grouped by difficulty
    const availableQuestions = await prisma.questions.findMany({
      where: {
        subtopic_id: { in: subtopics },
        active: true,
      },
      select: {
        question_id: true,
        question_text: true,
        options: true,
        difficulty_level: true,
        subtopic_id: true,
        subtopics: {
          select: {
            topics: {
              select: {
                topic_id: true,
                topic_name: true,
              },
            },
          },
        },
      },
    });

    // Group questions by difficulty level
    const questionsByDifficulty = {
      1: availableQuestions.filter(q => q.difficulty_level === 1), // Easy
      2: availableQuestions.filter(q => q.difficulty_level === 2), // Medium
      3: availableQuestions.filter(q => q.difficulty_level === 3), // Hard
    };

    // Select questions based on required counts
    const selectedQuestions = [
      ...this.selectRandomQuestions(questionsByDifficulty[1], questionCounts.easy),
      ...this.selectRandomQuestions(questionsByDifficulty[2], questionCounts.medium),
      ...this.selectRandomQuestions(questionsByDifficulty[3], questionCounts.hard),
    ];

    // Ensure topic distribution
    const selectedQuestionsWithTopicBalance = this.balanceTopicDistribution(
      selectedQuestions,
      configuration.topics
    );

    // Randomize final question order
    return this.shuffleArray(selectedQuestionsWithTopicBalance);
  }

  private selectRandomQuestions(questions: any[], count: number): any[] {
    const shuffled = this.shuffleArray([...questions]);
    return shuffled.slice(0, count);
  }

  private balanceTopicDistribution(questions: any[], topics: number[]): any[] {
    const questionsPerTopic = Math.ceil(questions.length / topics.length);
    
    // Group questions by topic
    const questionsByTopic = questions.reduce((acc, q) => {
      const topicId = q.subtopics.topics.topic_id;
      if (!acc[topicId]) {
        acc[topicId] = [];
      }
      acc[topicId].push(q);
      return acc;
    }, {});

    // Ensure balanced distribution
    const balancedQuestions: any[] = [];
    topics.forEach(topicId => {
      const topicQuestions = questionsByTopic[topicId] || [];
      balancedQuestions.push(
        ...this.selectRandomQuestions(topicQuestions, questionsPerTopic)
      );
    });

    return balancedQuestions.slice(0, questions.length);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getTotalQuestionCount(questionCounts: CreateTestPlanDTO['configuration']['questionCounts']): number {
    return questionCounts.easy + questionCounts.medium + questionCounts.hard;
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