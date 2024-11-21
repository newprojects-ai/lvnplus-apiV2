import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateTestPlanDTO, TestPlanResponse } from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

export class TestPlanService {
  async createTestPlan(
    plannerId: bigint,
    data: CreateTestPlanDTO
  ): Promise<TestPlanResponse> {
    const testPlan = await prisma.testPlan.create({
      data: {
        ...data,
        plannedBy: plannerId,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        executions: {
          select: {
            status: true,
            startedAt: true,
            completedAt: true,
            score: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    const selectedQuestions = await this.selectQuestions(data.configuration);
    
    if (selectedQuestions.length < this.getTotalQuestionCount(data.configuration.questionCounts)) {
      throw new ValidationError('Not enough questions available for the selected criteria');
    }

    // Create initial test execution
    await prisma.testExecution.create({
      data: {
        testPlanId: testPlan.id,
        status: 'NOT_STARTED',
        testData: {
          questions: selectedQuestions,
          responses: [],
          timing: [],
        },
      },
    });

    return this.formatTestPlanResponse(testPlan);
  }

  async getTestPlan(
    testPlanId: bigint,
    userId: bigint
  ): Promise<TestPlanResponse> {
    const testPlan = await prisma.testPlan.findUnique({
      where: { id: testPlanId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        executions: {
          select: {
            status: true,
            startedAt: true,
            completedAt: true,
            score: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!testPlan) {
      throw new NotFoundError('Test plan not found');
    }

    if (testPlan.plannedBy !== userId && testPlan.studentId !== userId) {
      throw new UnauthorizedError('Unauthorized access to test plan');
    }

    return this.formatTestPlanResponse(testPlan);
  }

  private async selectQuestions(configuration: CreateTestPlanDTO['configuration']) {
    const { questionCounts, subtopics } = configuration;
    const totalQuestions = this.getTotalQuestionCount(questionCounts);
    
    // Get all available questions grouped by difficulty
    const availableQuestions = await prisma.question.findMany({
      where: {
        subtopicId: { in: subtopics },
        active: true,
      },
      select: {
        id: true,
        questionText: true,
        options: true,
        difficultyLevel: true,
        subtopicId: true,
        subtopic: {
          select: {
            topic: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Group questions by difficulty level
    const questionsByDifficulty = {
      1: availableQuestions.filter(q => q.difficultyLevel === 1), // Easy
      2: availableQuestions.filter(q => q.difficultyLevel === 2), // Medium
      3: availableQuestions.filter(q => q.difficultyLevel === 3), // Hard
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
      const topicId = q.subtopic.topic.id;
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
      id: testPlan.id,
      testType: testPlan.testType,
      timingType: testPlan.timingType,
      timeLimit: testPlan.timeLimit,
      student: testPlan.student,
      configuration: testPlan.configuration,
      execution: testPlan.executions[0],
    };
  }
}