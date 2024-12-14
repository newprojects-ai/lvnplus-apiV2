import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  CreateQuestionDTO,
  UpdateQuestionDTO,
  QuestionResponse,
  QuestionFilters,
  RandomQuestionParams,
  FilterQuestionParams,
  FilterQuestionResponse,
} from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

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
    // Determine if the correct answer is a KaTeX expression
    const isKaTeX = /\$.*\$/.test(data.correctAnswer);

    const question = await prisma.questions.create({
      data: {
        subtopic_id: data.subtopicId,
        question_text: data.questionText,
        options: JSON.stringify(data.options),
        correct_answer: isKaTeX ? data.correctAnswer : null,
        correct_answer_plain: !isKaTeX ? data.correctAnswer : null,
        is_katex: isKaTeX,
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

    // Determine if the correct answer is a KaTeX expression
    const isKaTeX = /\$.*\$/.test(data.correctAnswer);

    const updatedQuestion = await prisma.questions.update({
      where: { question_id: questionId },
      data: {
        subtopic_id: data.subtopicId,
        question_text: data.questionText,
        options: JSON.stringify(data.options),
        correct_answer: isKaTeX ? data.correctAnswer : null,
        correct_answer_plain: !isKaTeX ? data.correctAnswer : null,
        is_katex: isKaTeX,
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

  async filterQuestions(params: FilterQuestionParams): Promise<FilterQuestionResponse> {
    // Validate and convert difficulty to integer
    const difficultyMap: { [key: string]: number } = {
      'EASY': 1,
      'MEDIUM': 2,
      'HARD': 3,
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4
    };

    // Convert difficulty to integer if it's a string
    const difficulty = typeof params.difficulty === 'string' 
      ? difficultyMap[params.difficulty] || 2 
      : params.difficulty || 2;

    // Prepare base query
    const query: Prisma.QuestionsWhereInput = {
      ...(params.subtopicId && { subtopic_id: Number(params.subtopicId) }),
      difficulty_level: difficulty,
    };

    // If topicId is provided, add a nested query through subtopics
    const topicQuery = params.topicId 
      ? { 
          subtopics: {
            topic_id: Number(params.topicId)
          }
        }
      : {};

    try {
      // Fetch total count of matching questions
      const totalCount = await prisma.questions.count({ 
        where: {
          ...query,
          ...topicQuery
        } 
      });

      // If not enough questions are available, adjust difficulty dynamically
      if (totalCount < params.limit) {
        console.warn(`Not enough questions at difficulty level ${difficulty}. Attempting to find more...`);
        
        // Try adjacent difficulty levels if not enough questions
        const adjacentDifficulties = difficulty === 2 
          ? [1, 3]  // For medium, check easy and hard
          : difficulty < 2 
            ? [2, 3]  // For easy, check medium and hard 
            : [1, 2];  // For hard, check medium and easy

        for (const adjDifficulty of adjacentDifficulties) {
          const adjustedQuery = {
            ...query,
            difficulty_level: adjDifficulty,
            ...topicQuery
          };

          const adjustedCount = await prisma.questions.count({ where: adjustedQuery });
          
          if (adjustedCount >= params.limit) {
            query.difficulty_level = adjDifficulty;
            break;
          }
        }
      }

      // Fetch questions with pagination and randomization
      const questions = await prisma.questions.findMany({
        where: {
          ...query,
          ...topicQuery
        },
        include: {
          subtopics: {
            include: {
              topics: true
            }
          }
        },
        take: params.limit,
        skip: params.offset || 0,
        orderBy: {
          question_id: 'desc'  // Newest questions first
        }
      });

      // If still not enough questions, throw an error
      if (questions.length < params.limit) {
        throw new ValidationError(`Not enough questions available. Found ${questions.length}, needed ${params.limit}`);
      }

      return {
        data: questions.map(q => ({
          ...q,
          topicId: q.subtopics.topic_id,
          topicName: q.subtopics.topics.topic_name
        })),
        total: totalCount,
        limit: params.limit,
        offset: params.offset || 0
      };
    } catch (error) {
      console.error('Error filtering questions:', error);
      throw error;
    }
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
    try {
      const where: Prisma.questionsWhereInput = {
        active: true,
        ...(params.difficulty && { difficulty_level: String(params.difficulty) })
      };

      if (params.topicIds?.length) {
        where.subtopics = {
          topics: {
            topic_id: { in: params.topicIds }
          }
        };
      }

      if (params.subtopicIds?.length) {
        where.subtopic_id = {
          in: params.subtopicIds
        };
      }

      const questions = await prisma.questions.findMany({
        where,
        include: this.getQuestionIncludes(),
        take: params.count,
        orderBy: {
          question_id: 'asc'
        }
      });

      // Shuffle the results for better randomization
      const shuffled = questions.sort(() => Math.random() - 0.5);

      // Take only the requested number of questions
      return shuffled.slice(0, params.count).map(this.formatQuestionResponse);

    } catch (error) {
      console.error('Error in getRandomQuestions:', error);
      throw error;
    }
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
      correctAnswer: question.correct_answer || question.correct_answer_plain,
      correctAnswerPlain: question.correct_answer_plain,
      isKaTeX: question.is_katex,
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