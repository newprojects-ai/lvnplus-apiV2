import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const testPlanSchema = z.object({
  templateId: z.string().optional(),
  boardId: z.number(),
  testType: z.enum(['TOPIC', 'MIXED', 'MENTAL_ARITHMETIC']),
  timingType: z.enum(['TIMED', 'UNTIMED']),
  timeLimit: z.number().optional(),
  studentId: z.string(),
  configuration: z.object({
    topics: z.array(z.number()),
    subtopics: z.array(z.number()),
    questionCounts: z.object({
      easy: z.number(),
      medium: z.number(),
      hard: z.number(),
    }),
  }),
});

const executionUpdateSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']).optional(),
  response: z.object({
    questionId: z.string(),
    answer: z.string(),
    timeSpent: z.number(),
  }).optional(),
});

export const validateTestPlanCreation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    testPlanSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

export const validateExecutionUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    executionUpdateSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};