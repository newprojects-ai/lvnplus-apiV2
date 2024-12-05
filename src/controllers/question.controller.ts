import { Request, Response, NextFunction } from 'express';
import { QuestionService } from '../services/question.service';
import { CreateQuestionDTO, UpdateQuestionDTO } from '../types';

const questionService = new QuestionService();

export const getQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const questions = await questionService.getQuestions(page, limit);
    res.json(questions);
  } catch (error) {
    next(error);
  }
};

export const createQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const questionData: CreateQuestionDTO = req.body;
    
    const question = await questionService.createQuestion(userId, questionData);
    res.status(201).json(question);
  } catch (error) {
    next(error);
  }
};

export const getQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const question = await questionService.getQuestion(BigInt(id));
    res.json(question);
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData: UpdateQuestionDTO = req.body;
    
    const question = await questionService.updateQuestion(
      BigInt(id),
      userId,
      updateData
    );
    res.json(question);
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    await questionService.deleteQuestion(BigInt(id), userId);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const filterQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = {
      topicId: req.query.topicId ? parseInt(req.query.topicId as string) : undefined,
      subtopicId: req.query.subtopicId ? parseInt(req.query.subtopicId as string) : undefined,
      difficulty: req.query.difficulty ? parseInt(req.query.difficulty as string) : undefined,
      examBoard: req.query.examBoard ? parseInt(req.query.examBoard as string) : undefined,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
      offset: parseInt(req.query.offset as string) || 0,
    };

    // Validate difficulty range
    if (filters.difficulty !== undefined && (filters.difficulty < 0 || filters.difficulty > 5)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Difficulty must be between 0 and 5',
      });
    }

    const questions = await questionService.filterQuestions({
      ...filters,
    });

    res.json(questions);
  } catch (error) {
    next(error);
  }
};

export const bulkCreateQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { questions } = req.body;
    
    const createdQuestions = await questionService.bulkCreateQuestions(
      userId,
      questions
    );
    res.status(201).json(createdQuestions);
  } catch (error) {
    next(error);
  }
};

export const getRandomQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      count,
      difficulty,
      topicIds,
      subtopicIds,
    } = req.query;
    
    if (!count) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Count parameter is required'
      });
    }

    const parsedCount = parseInt(count as string);
    if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 50) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Count must be between 1 and 50'
      });
    }

    const parsedDifficulty = difficulty ? parseInt(difficulty as string) : undefined;
    if (parsedDifficulty !== undefined && (isNaN(parsedDifficulty) || parsedDifficulty < 0 || parsedDifficulty > 5)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Difficulty must be between 0 and 5'
      });
    }
    
    const questions = await questionService.getRandomQuestions({
      count: parsedCount,
      difficulty: parsedDifficulty,
      topicIds: topicIds ? (topicIds as string).split(',').map(Number) : undefined,
      subtopicIds: subtopicIds ? (subtopicIds as string).split(',').map(Number) : undefined,
    });
    res.json(questions);
  } catch (error) {
    next(error);
  }
};

export const getTopics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const topics = await questionService.getTopics();
    res.json(topics);
  } catch (error) {
    next(error);
  }
};

export const getSubtopics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const subtopics = await questionService.getSubtopics(parseInt(id));
    res.json(subtopics);
  } catch (error) {
    next(error);
  }
};