import { Request, Response, NextFunction } from 'express';
import { TestExecutionService } from '../services/execution.service';
import { UpdateExecutionDTO } from '../types';

const executionService = new TestExecutionService();

export const getExecution = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - User ID is required' });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: 'Invalid execution ID provided' });
    }

    const execution = await executionService.getExecution(id, userId);
    res.json(execution);
  } catch (error) {
    next(error);
  }
};

export const startExecution = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || '0';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.startExecution(id, userId);
    res.json(execution);
  } catch (error) {
    next(error);
  }
};

export const submitAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || '0';
    const updateData: UpdateExecutionDTO = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.submitAnswer(id, userId, updateData);
    res.json(execution);
  } catch (error) {
    next(error);
  }
};

export const completeExecution = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || '0';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.completeExecution(id, userId);
    res.json(execution);
  } catch (error) {
    next(error);
  }
};

export const createExecution = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { planId } = req.params;
    const userId = req.user?.id || '0';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.createExecution(planId, userId);
    res.status(201).json(execution);
  } catch (error) {
    next(error);
  }
};

export const resumeTest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { executionId } = req.params;
    const userId = req.user?.id || '0';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.resumeExecution(executionId, userId);
    res.status(200).json(execution);
  } catch (error) {
    next(error);
  }
};

export const pauseTest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { executionId } = req.params;
    const userId = req.user?.id || '0';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.pauseExecution(executionId, userId);
    res.status(200).json(execution);
  } catch (error) {
    next(error);
  }
};