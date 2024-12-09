import { Request, Response, NextFunction } from 'express';
import { TestPlanService } from '../services/testPlan.service';
import { CreateTestPlanDTO, UpdateTestPlanDTO } from '../types';

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
    const { planId } = req.params;
    const userId = req.user?.id;
    
    const testPlan = await testPlanService.getTestPlan(BigInt(planId), userId);
    
    res.json(testPlan);
  } catch (error) {
    next(error);
  }
};

export const updateTestPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { planId } = req.params;
    const userId = req.user?.id;
    const updateData: UpdateTestPlanDTO = req.body;
    
    const testPlan = await testPlanService.updateTestPlan(
      BigInt(planId),
      userId,
      updateData
    );
    
    res.json(testPlan);
  } catch (error) {
    next(error);
  }
};

export const deleteTestPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { planId } = req.params;
    const userId = req.user?.id;
    
    await testPlanService.deleteTestPlan(BigInt(planId), userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};