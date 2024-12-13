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
    const executionId = req.params.executionId;
    const userId = req.user?.id;

    console.log('Get execution request:', {
      executionId,
      userId: userId?.toString(),
      params: req.params,
      query: req.query
    });

    if (!userId) {
      console.error('Unauthorized - Missing user ID');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User ID is required',
        details: 'No user ID found in request'
      });
    }

    if (!executionId) {
      console.error('Bad request - Missing execution ID');
      return res.status(400).json({ 
        error: 'ValidationError',
        message: 'Invalid execution ID provided',
        details: 'Execution ID is required'
      });
    }

    // Try to parse the ID as a number first
    const numericId = Number(executionId);
    if (isNaN(numericId)) {
      console.error('Bad request - Invalid execution ID format:', executionId);
      return res.status(400).json({ 
        error: 'ValidationError',
        message: 'Invalid execution ID provided',
        details: 'Execution ID must be a valid number'
      });
    }

    const execution = await executionService.getExecution(executionId, userId);
    
    console.log('Successfully retrieved execution:', {
      executionId: execution.executionId?.toString(),
      status: execution.status
    });

    res.json(execution);
  } catch (error) {
    console.error('Error in getExecution:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle specific error types
    if (error instanceof Error) {
      const errorResponse = {
        error: error.constructor.name,
        message: error.message,
        details: error.stack
      };

      switch (error.constructor.name) {
        case 'ValidationError':
          return res.status(400).json(errorResponse);
        case 'NotFoundError':
          return res.status(404).json(errorResponse);
        case 'UnauthorizedError':
          return res.status(401).json(errorResponse);
        default:
          return res.status(500).json({
            error: 'InternalServerError',
            message: 'An unexpected error occurred',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      }
    }

    next(error);
  }
};

export const startExecution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { executionId } = req.params;
    const userId = req.user?.id;

    console.log('Start Test Execution Request:', {
      executionId,
      userId: userId?.toString()
    });

    // Validate input
    if (!executionId) {
      console.error('Missing executionId in request');
      return res.status(400).json({ 
        message: 'Execution ID is required', 
        error: 'BAD_REQUEST' 
      });
    }

    if (!userId) {
      console.error('Unauthorized - Missing user ID');
      return res.status(401).json({ 
        message: 'User ID is required',
        error: 'UNAUTHORIZED'
      });
    }

    // Start the execution
    const result = await executionService.startExecution(
      BigInt(executionId),
      userId
    );

    // Send successful response
    res.status(200).json({
      message: 'Test execution started successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in startExecution controller:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });

    // Pass to error handling middleware
    next(error);
  }
};

export const submitAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const executionId = req.params.executionId;
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      console.error('Unauthorized - Missing user ID');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User ID is required',
        details: 'No user ID found in request'
      });
    }

    const execution = await executionService.submitAnswer(executionId, userId, updateData);
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
    const executionId = req.params.executionId;
    const userId = req.user?.id;

    if (!userId) {
      console.error('Unauthorized - Missing user ID');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User ID is required',
        details: 'No user ID found in request'
      });
    }

    const execution = await executionService.completeExecution(executionId, userId);
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
    const planId = req.params.planId;
    const userId = req.user?.id;

    if (!userId) {
      console.error('Unauthorized - Missing user ID');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User ID is required',
        details: 'No user ID found in request'
      });
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
    const executionId = req.params.executionId;
    const userId = req.user?.id;

    if (!userId) {
      console.error('Unauthorized - Missing user ID');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User ID is required',
        details: 'No user ID found in request'
      });
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
    const executionId = req.params.executionId;
    const userId = req.user?.id;

    if (!userId) {
      console.error('Unauthorized - Missing user ID');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User ID is required',
        details: 'No user ID found in request'
      });
    }

    const execution = await executionService.pauseExecution(executionId, userId);
    res.status(200).json(execution);
  } catch (error) {
    next(error);
  }
};

export const submitAllAnswers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { executionId } = req.params;
    const { endTime, responses } = req.body;
    const userId = req.user.id;

    console.log('Submit All Answers Controller Method Called:', {
      executionId,
      userId: userId.toString(),
      endTime,
      responsesCount: responses?.length
    });

    // Validate input
    if (!executionId) {
      console.error('Missing executionId in request');
      return res.status(400).json({ 
        message: 'Execution ID is required', 
        error: 'BAD_REQUEST' 
      });
    }

    // Create service instance
    const testExecutionService = new TestExecutionService();

    // Submit answers
    const result = await testExecutionService.submitAllAnswers(
      BigInt(executionId), 
      userId, 
      { 
        endTime, 
        responses 
      }
    );

    // Send successful response
    res.status(200).json({
      message: 'Answers submitted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in submitAllAnswers controller:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      requestBody: JSON.stringify(req.body)
    });

    // Pass to error handling middleware
    next(error);
  }
};