import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  CreateQuestionDTO,
  UpdateQuestionDTO,
  QuestionResponse,
  QuestionFilters,
  RandomQuestionParams,
} from '../types';
import { NotFoundError, UnauthorizedError } from '../utils/errors';

export class QuestionService {
  async getQuestions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    const [questions, total] = await Promise.all([
      prisma.questions.findMany({
        where: { active: true },
        include: this.getQuestionIncludes(),
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.questions.count({ where: { active: true } }),
    ]);

    return {
      data: questions.map(this.formatQuestionResponse),
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        perPage: limit,
      },
    };
  }

  async createQuestion(
    userId: bigint,
    data: CreateQuestionDTO
  ): Promise<QuestionResponse> {
    const question = await prisma.questions.create({
      data: {
        subtopic_id: data.subtopicId,
        question_text: data.questionText,
        options: JSON.stringify(data.options),
        correct_answer: data.correctAnswer,
        difficulty_level: data.difficultyLevel,
        created_by: userId,
      },
      include: this.getQuestionIncludes(),
    });

    return this.formatQuestionResponse(question);
  }

  async getQuestion(questionId: bigint): Promise<QuestionResponse> {
    const question = await prisma.questions.findUnique({
      where: {
        question_id: questionId,
        active: true,
      },
      include: this.getQuestionIncludes(),
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    return this.formatQuestionResponse(question);
  }

  async updateQuestion(
    questionId: bigint,
    userId: bigint,
    data: UpdateQuestionDTO
  ): Promise<QuestionResponse> {
    const question = await prisma.questions.findUnique({
      where: { question_id: questionId },
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    if (question.created_by !== userId) {
      throw new UnauthorizedError('Not authorized to modify this question');
    }

    const updatedQuestion = await prisma.questions.update({
      where: { question_id: questionId },
      data: {
        subtopic_id: data.subtopicId,
        question_text: data.questionText,
        options: JSON.stringify(data.options),
        correct_answer: data.correctAnswer,
        difficulty_level: data.difficultyLevel,
      },
      include: this.getQuestionIncludes(),
    });

    return this.formatQuestionResponse(updatedQuestion);
  }

  async deleteQuestion(questionId: bigint, userId: bigint): Promise<void> {
    const question = await prisma.questions.findUnique({
      where: { question_id: questionId },
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    if (question.created_by !== userId) {
      throw new UnauthorizedError('Not authorized to delete this question');
    }

    await prisma.questions.update({
      where: { question_id: questionId },
      data: { active: false },
    });
  }

  async filterQuestions(filters: QuestionFilters) {
    const where: Prisma.questionsWhereInput = {
      active: true,
    };

    if (filters.topicId) {
      where.subtopics = {
        topics: {
          topic_id: filters.topicId,
        },
      };
    }

    if (filters.subtopicId) {
      where.subtopic_id = filters.subtopicId;
    }

    if (filters.difficulty) {
      where.difficulty_level = filters.difficulty;
    }

    if (filters.examBoard) {
      where.subtopics = {
        topics: {
          subjects: {
            exam_boards: {
              some: {
                board_id: filters.examBoard,
              },
            },
          },
        },
      };
    }

    const [questions, total] = await Promise.all([
      prisma.questions.findMany({
        where,
        include: this.getQuestionIncludes(),
        skip: filters.offset,
        take: filters.limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.questions.count({ where }),
    ]);

    return {
      data: questions.map(this.formatQuestionResponse),
      pagination: {
        total,
        offset: filters.offset,
        limit: filters.limit,
      },
    };
  }

  async bulkCreateQuestions(
    userId: bigint,
    questions: CreateQuestionDTO[]
  ): Promise<QuestionResponse[]> {
    const createdQuestions = await prisma.$transaction(
      questions.map(question =>
        prisma.questions.create({
          data: {
            subtopic_id: question.subtopicId,
            question_text: question.questionText,
            options: JSON.stringify(question.options),
            correct_answer: question.correctAnswer,
            difficulty_level: question.difficultyLevel,
            created_by: userId,
          },
          include: this.getQuestionIncludes(),
        })
      )
    );

    return createdQuestions.map(this.formatQuestionResponse);
  }

  async getRandomQuestions(params: RandomQuestionParams) {
    const where: Prisma.questionsWhereInput = {
      active: true,
    };

    if (params.difficulty) {
      where.difficulty_level = params.difficulty;
    }

    if (params.topicIds?.length) {
      where.subtopics = {
        topics: {
          topic_id: { in: params.topicIds },
        },
      };
    }

    if (params.subtopicIds?.length) {
      where.subtopic_id = { in: params.subtopicIds };
    }

    const questions = await prisma.questions.findMany({
      where,
      include: this.getQuestionIncludes(),
      take: params.count,
      orderBy: Prisma.sql`RAND()`,
    });

    return questions.map(this.formatQuestionResponse);
  }

  async getTopics() {
    return prisma.topics.findMany({
      include: {
        subjects: {
          select: {
            subject_id: true,
            subject_name: true,
          },
        },
      },
    });
  }

  async getSubtopics(topicId: number) {
    return prisma.subtopics.findMany({
      where: { topic_id: topicId },
      include: {
        topics: {
          select: {
            topic_id: true,
            topic_name: true,
          },
        },
      },
    });
  }

  private getQuestionIncludes() {
    return {
      subtopics: {
        include: {
          topics: {
            include: {
              subjects: true,
            },
          },
        },
      },
      users: {
        select: {
          user_id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      },
    };
  }

  private formatQuestionResponse(question: any): QuestionResponse {
    return {
      id: question.question_id.toString(),
      questionText: question.question_text,
      options: JSON.parse(question.options),
      correctAnswer: question.correct_answer,
      difficultyLevel: question.difficulty_level,
      subtopic: {
        id: question.subtopics.subtopic_id,
        name: question.subtopics.subtopic_name,
        topic: {
          id: question.subtopics.topics.topic_id,
          name: question.subtopics.topics.topic_name,
          subject: {
            id: question.subtopics.topics.subjects.subject_id,
            name: question.subtopics.topics.subjects.subject_name,
          },
        },
      },
      creator: {
        id: question.users.user_id.toString(),
        email: question.users.email,
        firstName: question.users.first_name,
        lastName: question.users.last_name,
      },
      createdAt: question.created_at,
    };
  }
}