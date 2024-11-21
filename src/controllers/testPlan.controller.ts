import { Request, Response, NextFunction } from 'express';
import { TestPlanService } from '../services/testPlan.service';
import { CreateTestPlanDTO } from '../types';

const testPlanService = new TestPlanService();

export const createTestPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const testPlanData: CreateTestPlanDTO = req.body;
    
    const testPlan = await testPlanService.createTestPlan(userId, testPlanData);
    
    res.status(201).json(testPlan);
  } catch (error) {
    next(error);
  }
};

export const getTestPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const testPlan = await testPlanService.getTestPlan(BigInt(id), userId);
    
    res.json(testPlan);
  } catch (error) {
    next(error);
  }
};