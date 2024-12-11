import { PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateTestPlanDTO, UpdateTestPlanDTO, TestPlanResponse } from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { QuestionService } from './question.service';
import { distributeQuestions, validateQuestionDistribution } from '../utils/questionDistribution';

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
    
    // Determine difficulty level and total questions
    const difficultyMap: { [key: string]: number } = {
      'EASY': 1,
      'MEDIUM': 2,
      'HARD': 3,
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5
    };

    // Prepare question counts
    const questionCounts: { [key: string]: number } = {};
    
    // Check if the keys in questionCounts match any of the topic IDs first
    if (Object.keys(data.configuration.questionCounts).some(key => 
      key.startsWith('topic_') || topicIds.some(id => id.toString() === key)
    )) {
      // Handle topic-based question counts
      topicIds.forEach(topicId => {
        const topicKey = `topic_${topicId}`;
        const count = data.configuration.questionCounts[topicKey] || 
                     data.configuration.questionCounts[topicId.toString()] || 0;
        questionCounts[topicId.toString()] = count;
      });
    }
    // Then check for explicit difficulty levels
    else if (Object.keys(data.configuration.questionCounts).some(key => 
      ['EASY', 'MEDIUM', 'HARD'].includes(key)
    )) {
      // Handle difficulty-based question counts
      Object.keys(data.configuration.questionCounts).forEach(key => {
        const mappedKey = difficultyMap[key] || key;
        questionCounts[mappedKey] = data.configuration.questionCounts[key];
      });
    }
    // Default case: distribute questions equally across difficulty levels 1 to 3
    else {
      const totalQuestions = Object.values(data.configuration.questionCounts).reduce((a, b) => a + b, 0);
      const difficultyLevels = [1, 2, 3]; // Default difficulties
      const questionsPerDifficulty = Math.floor(totalQuestions / difficultyLevels.length);
      const remainingQuestions = totalQuestions % difficultyLevels.length;

      difficultyLevels.forEach((difficulty, index) => {
        questionCounts[difficulty] = questionsPerDifficulty + (index < remainingQuestions ? 1 : 0);
      });
    }

    // Calculate total questions
    const totalQuestions = Object.values(questionCounts).reduce((a, b) => a + b, 0);

    // Select questions using the new question distribution utility
    const selectedQuestions = await this.selectQuestions(data);

    if (selectedQuestions.length < totalQuestions) {
      throw new ValidationError(`Not enough questions available. Found ${selectedQuestions.length}, needed ${totalQuestions}`);
    }

    // Randomly select questions based on the configuration
    const randomQuestions = this.selectRandomQuestions(selectedQuestions, totalQuestions);

    // Create test plan in the database
    const testPlan = await prisma.test_plans.create({
      data: {
        board_id: safeBoardId ? Number(safeBoardId) : null,
        student_id: safeStudentId ? Number(safeStudentId) : null,
        planned_by: Number(safePlannerId),
        test_type: data.testType,
        timing_type: data.timingType,
        time_limit: data.timeLimit,
        planned_at: new Date(), // Use planned_at instead of test_start_time
        configuration: JSON.stringify({
          topics: [topicIds.map(id => id.toString())],
          subtopics: subtopicIds.map(id => id.toString()),
          questionCounts: questionCounts
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
      questionCounts,
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

  private async selectQuestions(testPlan: CreateTestPlanDTO): Promise<any[]> {
    const questionService = new QuestionService();
    
    // Calculate total questions
    const totalQuestions = Object.values(testPlan.configuration.questionCounts).reduce((a, b) => a + b, 0);
    
    // Distribute questions across difficulty levels
    const questionDistribution = distributeQuestions(totalQuestions);
    
    // Validate the distribution
    if (!validateQuestionDistribution(questionDistribution)) {
      throw new ValidationError('Invalid question distribution');
    }

    const questionResults: any[] = [];

    // Fetch questions for each difficulty level
    for (const [difficulty, count] of Object.entries(questionDistribution)) {
      const filterParams = {
        difficulty: Number(difficulty),
        limit: count,
        offset: 0,
        ...(testPlan.configuration.subtopics.length > 0 && { 
          subtopicId: Number(testPlan.configuration.subtopics[0]) 
        })
      };

      const questionResult = await questionService.filterQuestions(filterParams);
      questionResults.push(...questionResult.data);
    }

    return questionResults;
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