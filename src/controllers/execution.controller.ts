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
    const userId = BigInt(req.user?.id || '0');
    
    const execution = await executionService.getExecution(BigInt(id), userId);
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
    const userId = BigInt(req.user?.id || '0');
    
    const execution = await executionService.startExecution(BigInt(id), userId);
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
    const userId = BigInt(req.user?.id || '0');
    const updateData: UpdateExecutionDTO = req.body;
    
    const execution = await executionService.submitAnswer(
      BigInt(id),
      userId,
      updateData
    );
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
    const userId = BigInt(req.user?.id || '0');
    
    const execution = await executionService.completeExecution(BigInt(id), userId);
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
    const userId = BigInt(req.user?.id || '0');
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.createExecution(BigInt(planId), userId);
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
    const userId = BigInt(req.user?.id || '0');
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.resumeExecution(BigInt(executionId), userId);
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
    const userId = BigInt(req.user?.id || '0');
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const execution = await executionService.pauseExecution(BigInt(executionId), userId);
    res.status(200).json(execution);
  } catch (error) {
    next(error);
  }
};