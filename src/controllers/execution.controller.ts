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
    const userId = req.user?.id;
    
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
    const userId = req.user?.id;
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
    const userId = req.user?.id;
    
    const execution = await executionService.completeExecution(BigInt(id), userId);
    res.json(execution);
  } catch (error) {
    next(error);
  }
};