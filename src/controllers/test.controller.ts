import { Request, Response, NextFunction } from 'express';
import { TestService } from '../services/test.service';
import { CreateTestPlanDTO } from '../types';

const testService = new TestService();

export const createTestPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const planData: CreateTestPlanDTO = req.body;
    
    const plan = await testService.createTestPlan(userId, planData);
    res.status(201).json(plan);
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
    
    const plan = await testService.getTestPlan(BigInt(id), userId);
    res.json(plan);
  } catch (error) {
    next(error);
  }
};

export const getStudentTests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { studentId } = req.params;
    const { status, from, to } = req.query;
    const userId = req.user?.id;
    
    const tests = await testService.getStudentTests(
      BigInt(studentId),
      userId,
      {
        status: status as string,
        from: from as string,
        to: to as string,
      }
    );
    res.json(tests);
  } catch (error) {
    next(error);
  }
};

export const startTest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { planId } = req.params;
    const userId = req.user?.id;
    
    const execution = await testService.startTest(BigInt(planId), userId);
    res.json(execution);
  } catch (error) {
    next(error);
  }
};

export const submitTest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { executionId } = req.params;
    const userId = req.user?.id;
    const { questionId, answer, timeSpent } = req.body;
    
    const execution = await testService.submitAnswer(
      BigInt(executionId),
      userId,
      {
        questionId: BigInt(questionId),
        answer,
        timeSpent,
      }
    );
    res.json(execution);
  } catch (error) {
    next(error);
  }
};

export const getTestStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { executionId } = req.params;
    const userId = req.user?.id;
    
    const status = await testService.getTestStatus(BigInt(executionId), userId);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

export const getTestResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { executionId } = req.params;
    const userId = req.user?.id;
    
    const results = await testService.getTestResults(BigInt(executionId), userId);
    res.json(results);
  } catch (error) {
    next(error);
  }
};