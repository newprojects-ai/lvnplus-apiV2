import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const subjectSchema = z.object({
  subjectName: z.string().min(1),
  description: z.string().optional(),
});

const subtopicSchema = z.object({
  subtopicName: z.string().min(1),
  description: z.string().optional(),
});

const templateSchema = z.object({
  templateName: z.string().min(1),
  boardId: z.number(),
  testType: z.enum(['TOPIC', 'MIXED', 'MENTAL_ARITHMETIC']),
  timingType: z.enum(['TIMED', 'UNTIMED']),
  timeLimit: z.number().optional(),
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

export const validateRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    registerSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    loginSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

export const validateSubjectCreation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    subjectSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

export const validateSubjectUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    subjectSchema.partial().parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

export const validateSubtopicCreation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    subtopicSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

export const validateSubtopicUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    subtopicSchema.partial().parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

export const validateTemplateCreation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    templateSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

export const validateTemplateUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    templateSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }
};

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