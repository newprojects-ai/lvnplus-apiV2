import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { ValidationError } from '../utils/errors';

// Interfaces for type safety
export interface QuestionSelectionCriteria {
  topicIds?: number[];
  subtopicIds?: number[];
  totalQuestionCount: number;
}

export interface QuestionSelectionOptions {
  randomize?: boolean;
  allowCrossDifficulty?: boolean;
  topicDistributionStrategy?: string;
}

export class QuestionSelectorService {
  /**
   * Select questions based on comprehensive criteria
   * @param criteria Selection criteria
   * @param options Selection options
   * @returns Selected questions
   */
  async selectQuestions(
    criteria: QuestionSelectionCriteria, 
    options: QuestionSelectionOptions = {
      randomize: true, 
      allowCrossDifficulty: true,
      topicDistributionStrategy: 'PROPORTIONAL'
    }
  ): Promise<any[]> {
    // Validate input
    if (criteria.totalQuestionCount <= 0) {
      throw new ValidationError('Total questions must be positive');
    }

    console.log('Question Selection Criteria:', JSON.stringify(criteria, null, 2));

    // Determine distribution based on subtopics or topics
    const distributionItems = criteria.subtopicIds || criteria.topicIds;
    const distributionType = criteria.subtopicIds ? 'SUBTOPIC' : 'TOPIC';

    // Prepare base query
    const baseQuery: Prisma.QuestionsWhereInput = {
      active: true,
      ...(criteria.subtopicIds && { subtopic_id: { in: criteria.subtopicIds } }),
      ...(criteria.topicIds && {
        subtopics: {
          topics: {
            topic_id: { in: criteria.topicIds }
          }
        }
      })
    };

    // Count total available questions
    const totalAvailableQuestions = await prisma.questions.count({
      where: baseQuery
    });

    console.log(`Total available questions: ${totalAvailableQuestions}`);

    // If not enough questions, adjust strategy
    if (totalAvailableQuestions < criteria.totalQuestionCount) {
      console.warn(`Not enough questions available. Found ${totalAvailableQuestions}, needed ${criteria.totalQuestionCount}`);
      
      // If cross-difficulty is allowed, try to find more questions
      if (options.allowCrossDifficulty) {
        // Remove subtopic/topic constraints to find more questions
        const relaxedQuery = { active: true };
        const relaxedTotalQuestions = await prisma.questions.count({
          where: relaxedQuery
        });

        console.log(`Total questions after relaxing constraints: ${relaxedTotalQuestions}`);

        if (relaxedTotalQuestions >= criteria.totalQuestionCount) {
          // Use relaxed query to get questions
          const questions = await prisma.questions.findMany({
            where: relaxedQuery,
            take: criteria.totalQuestionCount,
            orderBy: options.randomize 
              ? { question_id: 'desc' }  // Newest first if randomizing
              : undefined
          });

          console.log(`Selected questions count: ${questions.length}`);
          return questions;
        }
      }

      // If still not enough, throw an error
      throw new ValidationError(`Not enough questions available. Found ${totalAvailableQuestions}, needed ${criteria.totalQuestionCount}`);
    }

    // Fetch questions
    const questions = await prisma.questions.findMany({
      where: baseQuery,
      take: criteria.totalQuestionCount,
      orderBy: options.randomize 
        ? { question_id: 'desc' }  // Newest first if randomizing
        : undefined
    });

    console.log(`Selected questions count: ${questions.length}`);
    return questions;
  }

  /**
   * Select questions for a specific item (topic or subtopic)
   * @param params Selection parameters
   * @returns Selected questions
   */
  private async selectQuestionsForItem({
    subtopicIds,
    topicIds,
    count,
    options
  }: {
    subtopicIds?: number[];
    topicIds?: number[];
    count: number;
    options: QuestionSelectionOptions;
  }): Promise<any[]> {
    // Base query construction
    const baseQuery: Prisma.QuestionsWhereInput = {
      active: true,
      ...(subtopicIds && { subtopic_id: { in: subtopicIds } }),
      ...(topicIds && {
        subtopics: {
          topics: {
            topic_id: { in: topicIds }
          }
        }
      })
    };

    console.log('Question Selection Query:', JSON.stringify({
      subtopicIds,
      topicIds,
      count,
      baseQuery
    }, null, 2));

    // Count total available questions first
    const totalQuestions = await prisma.questions.count({
      where: baseQuery
    });

    console.log(`Total available questions: ${totalQuestions}`);

    // Fetch questions
    const questions = await prisma.questions.findMany({
      where: baseQuery,
      take: count,
      orderBy: options.randomize 
        ? { question_id: 'desc' }  // Newest first if randomizing
        : undefined
    });

    console.log(`Selected questions count: ${questions.length}`);

    return questions;
  }

  /**
   * Shuffle questions randomly
   * @param questions Questions to shuffle
   * @returns Shuffled questions
   */
  private shuffleQuestions<T>(questions: T[]): T[] {
    return questions.sort(() => 0.5 - Math.random());
  }
}

// Export an instance for easier use
export const questionSelectorService = new QuestionSelectorService();
