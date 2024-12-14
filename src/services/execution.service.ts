import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { 
  CreateTestExecutionDTO, 
  UpdateTestExecutionDTO, 
  TestExecutionResponse,
  SubmitAllAnswersDTO
} from '../types';
import { 
  NotFoundError, 
  UnauthorizedError, 
  ValidationError, 
  BadRequestError
} from '../utils/errors';

interface ExecutionWithPlan extends Prisma.test_executions {
  test_plans: Prisma.test_plans;
}

interface TestData {
  responses: { questionId: string; answer: string }[];
  questions: { question_id: string; correct_answer: string }[];
}

export class TestExecutionService {
  // Utility function to safely convert to BigInt
  private safeBigInt(value: bigint | string | undefined, defaultValue: bigint = BigInt(0)): bigint {
    if (value === undefined) {
      return defaultValue;
    }
    
    try {
      // Handle empty strings
      if (typeof value === 'string' && value.trim() === '') {
        throw new Error('Empty string is not a valid BigInt');
      }
      
      // Convert to BigInt
      const result = typeof value === 'string' ? BigInt(value) : value;
      
      // Validate the result
      if (result === BigInt(0) && value !== '0' && value !== 0n) {
        throw new Error(`Invalid BigInt value: ${value}`);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to convert to BigInt:', {
        value,
        type: typeof value,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new ValidationError(`Invalid execution ID: ${value}`);
    }
  }

  async getExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);
    return this.formatExecutionResponse(execution);
  }

  async startExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    if (execution.status !== 'NOT_STARTED') {
      throw new ValidationError('Test has already been started');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        status: 'IN_PROGRESS',
        started_at: new Date(),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async submitAnswer(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined,
    updateData: UpdateTestExecutionDTO
  ): Promise<TestExecutionResponse> {
    console.log('FULL submitAnswer Input', {
      executionId, 
      userId, 
      updateData,
      updateDataType: typeof updateData
    });

    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);
    const safeQuestionId = this.safeBigInt(updateData.question_id);

    console.log('Safe Conversion', {
      safeExecutionId, 
      safeUserId, 
      safeQuestionId
    });

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    console.log('Execution Data', {
      executionStatus: execution.status,
      testData: execution.test_data
    });

    // Parse the existing test data
    let testData;
    try {
      testData = JSON.parse(execution.test_data || '{}');
    } catch (error) {
      console.error('Error parsing test data', { 
        rawTestData: execution.test_data,
        error 
      });
      throw new Error('Invalid test data format');
    }

    console.log('Parsed Test Data', {
      questions: testData.questions,
      responses: testData.responses,
      questionsType: typeof testData.questions,
      responsesType: typeof testData.responses
    });

    // Ensure responses array exists
    if (!testData.responses || !Array.isArray(testData.responses)) {
      console.error('Responses is not an array', { testData });
      throw new Error('Invalid responses format');
    }

    // Find the question being answered
    const questionIndex = testData.responses.findIndex(
      (resp: { question_id: bigint }) => resp.question_id === safeQuestionId
    );

    console.log('Question Index Search', {
      questionIndex,
      safeQuestionId,
      responsesLength: testData.responses.length
    });

    if (questionIndex === -1) {
      console.error('Question not found in responses', { 
        safeQuestionId, 
        responses: testData.responses 
      });
      throw new NotFoundError('Question not found in the test execution');
    }

    // Find the corresponding question details
    const currentQuestion = testData.questions.find(
      (q: { question_id: bigint }) => q.question_id === safeQuestionId
    );

    if (!currentQuestion) {
      console.error('Question details not found', { 
        safeQuestionId, 
        questions: testData.questions 
      });
      throw new NotFoundError('Question details not found');
    }

    // Update the response for the specific question
    const updatedResponses = [...testData.responses];
    updatedResponses[questionIndex] = {
      ...updatedResponses[questionIndex],
      student_answer: updateData.student_answer,
      is_correct: this.checkAnswer(
        currentQuestion, 
        updateData.student_answer
      ),
      time_spent: updateData.time_spent || 0
    };

    console.log('Updated Responses', {
      originalResponse: testData.responses[questionIndex],
      updatedResponse: updatedResponses[questionIndex]
    });

    // Update the test data with the new responses
    const updatedTestData = {
      ...testData,
      responses: updatedResponses
    };

    // Update the test execution in the database
    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        test_data: JSON.stringify(updatedTestData),
        status: this.determineExecutionStatus(updatedResponses)
      }
    });

    console.log('Final Execution Update', {
      updatedTestData,
      executionStatus: updatedExecution.status
    });

    return {
      execution: updatedExecution,
      testData: updatedTestData
    };
  }

  async completeExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    // Enhanced logging for debugging
    console.log('Complete Execution Request', { 
      executionId, 
      userId,
      executionIdType: typeof executionId,
      userIdType: typeof userId,
      prismaClientStatus: prisma ? 'initialized' : 'NOT_INITIALIZED' 
    });

    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    // Defensive check for Prisma client
    if (!prisma) {
      console.error('Prisma client is not initialized');
      throw new Error('Database connection is not available');
    }

    try {
      // Detailed query with full logging
      console.log('Querying test execution', {
        executionId: safeExecutionId,
        userId: safeUserId
      });

      const existingExecution = await prisma.test_executions.findUnique({
        where: { execution_id: safeExecutionId },
        select: { 
          status: true, 
          student_id: true,
          test_plan_id: true,
          test_data: true // Include test_data for score calculation
        }
      });

      // Extensive logging for found execution
      console.log('Execution Query Result', {
        executionFound: !!existingExecution,
        executionDetails: existingExecution ? {
          status: existingExecution.status,
          studentId: existingExecution.student_id,
          testPlanId: existingExecution.test_plan_id,
          testDataType: typeof existingExecution.test_data,
          testDataLength: existingExecution.test_data?.length
        } : null
      });

      // Validate execution existence
      if (!existingExecution) {
        throw new NotFoundError(`Test execution ${safeExecutionId} not found`);
      }

      // Verify user access - ensure the user is the student for this execution
      console.log('Access Verification', {
        expectedStudentId: existingExecution.student_id,
        providedUserId: safeUserId,
        accessCheck: existingExecution.student_id === safeUserId
      });

      if (existingExecution.student_id !== safeUserId) {
        throw new UnauthorizedError('You are not authorized to complete this test execution');
      }

      // Check execution status
      if (existingExecution.status === 'NOT_STARTED') {
        throw new ValidationError(
          'Cannot complete test. Test must be started first. Please click "Start Test" before attempting to complete the test.'
        );
      }

      if (existingExecution.status === 'COMPLETED') {
        throw new ValidationError(
          'Cannot complete test. Test has already been completed.'
        );
      }

      if (existingExecution.status === 'PAUSED') {
        throw new ValidationError(
          'Cannot complete test while it is paused. Please resume the test first.'
        );
      }

      // Calculate score - pass the entire execution object
      const scoreResult = await this.calculateAndUpdateTestScore(
        safeExecutionId, 
        safeUserId
      );

      // Update the execution
      const updatedExecution = await prisma.test_executions.update({
        where: { execution_id: safeExecutionId },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          score: scoreResult.execution.score,
          test_data: scoreResult.execution.test_data
        },
      });

      // Log successful update
      console.log('Execution Completed Successfully', {
        executionId: safeExecutionId,
        updatedStatus: updatedExecution.status,
        score: updatedExecution.score
      });

      return {
        execution: updatedExecution,
        testData: JSON.parse(updatedExecution.test_data)
      };
    } catch (error) {
      // Comprehensive error logging
      console.error('Error in completeExecution', {
        executionId: safeExecutionId,
        userId: safeUserId,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        // Additional context about the error
        errorDetails: {
          isNotFoundError: error instanceof NotFoundError,
          isUnauthorizedError: error instanceof UnauthorizedError,
          isValidationError: error instanceof ValidationError
        }
      });

      // Rethrow the error to maintain existing error handling
      throw error;
    }
  }

  async createExecution(
    planId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeUserId = this.safeBigInt(userId);
    const safePlanId = this.safeBigInt(planId);

    // Fetch the test plan with all related users
    const testPlan = await prisma.test_plans.findUnique({
      where: { test_plan_id: safePlanId },
      include: {
        users_test_plans_student_idTousers: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        },
        users_test_plans_planned_byTousers: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        },
        test_templates: true,
        exam_boards: true,
        test_executions: {
          orderBy: { execution_id: 'desc' },
          take: 1
        }
      },
    });

    // Enhanced logging for student_id
    console.log('Creating test execution', {
      testPlanId: safePlanId.toString(),
      planStudentId: testPlan?.student_id?.toString(),
      currentUserId: safeUserId.toString(),
      studentDetails: {
        id: testPlan?.users_test_plans_student_idTousers?.user_id,
        email: testPlan?.users_test_plans_student_idTousers?.email
      }
    });

    if (!testPlan) {
      throw new NotFoundError('Test plan not found');
    }

    // Safe extraction of user IDs with extensive error handling
    const extractUserIds = (users: any): bigint[] => {
      // If users is an array, map user IDs
      if (Array.isArray(users)) {
        return users.map(u => BigInt(u.user_id));
      }
      
      // If users is a single object, convert its user_id
      if (users && typeof users === 'object' && 'user_id' in users) {
        return [BigInt(users.user_id)];
      }
      
      // If no valid users found, return empty array
      console.error('Invalid users structure:', users);
      return [];
    };

    // Extract student and planner user IDs
    const studentUserIds = extractUserIds(testPlan.users_test_plans_student_idTousers);
    const plannedByUserIds = extractUserIds(testPlan.users_test_plans_planned_byTousers);

    // Check user authorization
    const isAuthorized = studentUserIds.some(id => id === safeUserId) || 
                         plannedByUserIds.some(id => id === safeUserId);

    if (!isAuthorized) {
      throw new UnauthorizedError('You are not authorized to start this test');
    }

    // If an execution already exists and is NOT_STARTED, return it
    if (testPlan.test_executions && testPlan.test_executions.length > 0) {
      const existingExecution = testPlan.test_executions[0];
      if (existingExecution.status === 'NOT_STARTED') {
        console.log('Existing NOT_STARTED execution found', {
          executionId: existingExecution.execution_id.toString(),
        });
        return this.formatExecutionResponse(existingExecution);
      }
    }

    // Fetch selected questions for the test plan
    const selectedQuestions = await prisma.questions.findMany({
      where: {
        question_id: {
          in: JSON.parse(testPlan.configuration).questions.map(q => BigInt(q.question_id))
        }
      }
    });

    // Create a new test execution
    const newExecution = await prisma.test_executions.create({
      data: {
        test_plan_id: safePlanId,
        student_id: testPlan.student_id || safeUserId,  // Use student_id from test plan or current user
        status: 'NOT_STARTED',
        test_data: JSON.stringify({
          questions: selectedQuestions.map(q => ({
            question_id: q.question_id,
            subtopic_id: q.subtopic_id,
            question_text: q.question_text,
            options: q.options,
            difficulty_level: q.difficulty_level,
            correct_answer: q.correct_answer,
            correct_answer_plain: q.correct_answer_plain,
            is_katex: q.is_katex || false,
          })),
          responses: selectedQuestions.map(q => ({
            question_id: q.question_id,
            student_answer: null,
            is_correct: null,
            time_spent: null,
          })),
          timing: {
            test_start_time: null,
            test_end_time: null,
            total_time_allowed: testPlan.time_limit,
          },
        }),
        started_at: null,
        completed_at: null,
        score: null,
      },
    });

    console.log('Test execution created', {
      executionId: newExecution.execution_id.toString(),
      testPlanId: newExecution.test_plan_id.toString(),
    });

    return this.formatExecutionResponse(newExecution);
  }

  async resumeExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    if (execution.status !== 'PAUSED') {
      throw new ValidationError('Test is not paused');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        status: 'IN_PROGRESS',
        paused_at: null,
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async pauseExecution(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findExecutionWithAccess(safeExecutionId, safeUserId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: safeExecutionId },
      data: {
        status: 'PAUSED',
        paused_at: new Date(),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async submitAllAnswers(
    executionId: bigint, 
    userId: bigint, 
    submissionData: Omit<SubmitAllAnswersDTO, 'executionId'> & { executionId?: number }
  ): Promise<TestExecutionResponse> {
    console.log('Submit All Answers Service Method Called:', {
      executionId: executionId.toString(),
      userId: userId.toString(),
      submissionDataDetails: {
        responsesCount: submissionData.responses?.length,
        endTime: submissionData.endTime
      }
    });

    try {
      // Validate execution belongs to user
      const execution = await this.findTestExecutionWithAccess(executionId, userId);

      console.log('Execution Lookup Result:', {
        executionFound: !!execution,
        executionStatus: execution?.status,
        executionTestId: execution?.test_plan_id.toString()
      });

      // Validate execution is in progress
      if (execution.status !== 'IN_PROGRESS') {
        console.error('Cannot submit answers - Invalid execution status', {
          currentStatus: execution.status,
          expectedStatus: 'IN_PROGRESS'
        });
        throw new ValidationError('Cannot submit answers. Test must be started first. Please click "Start Test" before submitting answers.');
      }

      // Validate responses
      if (!submissionData.responses || submissionData.responses.length === 0) {
        console.error('No responses provided in submission');
        throw new ValidationError('No answers to submit');
      }

      // Validate response structure
      const invalidResponses = submissionData.responses.filter(
        r => !r.questionId || !r.answer || typeof r.timeTaken !== 'number'
      );
      if (invalidResponses.length > 0) {
        console.error('Invalid response structure', {
          invalidResponses,
          totalResponses: submissionData.responses.length
        });
        throw new ValidationError('Invalid response structure. Each response must have questionId, answer, and timeTaken.');
      }

      // Parse existing test data
      const testData = JSON.parse(execution.test_data);

      // Validate and update responses
      const updatedResponses = testData.responses.map((existingResponse: any) => {
        const submittedResponse = submissionData.responses.find(
          r => r.questionId === Number(existingResponse.question_id)
        );

        // Find the corresponding question for this response
        const currentQuestion = testData.questions.find(
          (q: { question_id: bigint }) => q.question_id === BigInt(existingResponse.question_id)
        );

        return {
          ...existingResponse,
          ...(submittedResponse && {
            student_answer: submittedResponse.answer,
            is_correct: currentQuestion 
              ? this.checkAnswer(currentQuestion, submittedResponse.answer) 
              : null,
            time_spent: submittedResponse.timeTaken || 0
          })
        };
      });

      console.log('Updated Responses in Submit All', {
        originalResponses: testData.responses,
        updatedResponses
      });

      // Prepare updated test data
      const updatedTestData = {
        ...testData,
        responses: updatedResponses,
        timingData: {
          ...testData.timingData,
          endTime: submissionData.endTime || Date.now()
        }
      };

      // Update test execution
      const updatedExecution = await prisma.test_executions.update({
        where: { execution_id: Number(executionId) },
        data: {
          test_data: JSON.stringify(updatedTestData)
        }
      });

      // Return formatted response
      return this.formatTestExecutionResponse(updatedExecution);

    } catch (error) {
      // Log detailed error information
      console.error('Error in submitAllAnswers service method:', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        submissionData: JSON.stringify(submissionData)
      });

      // Rethrow the error to be handled by the controller
      throw error;
    }
  }

  async getExecutionResults(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<TestExecutionResponse> {
    // Enhanced logging for debugging
    console.log('Get Execution Results Request', { 
      executionId, 
      userId,
      executionIdType: typeof executionId,
      userIdType: typeof userId
    });

    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    try {
      // Find the execution with detailed information
      const execution = await prisma.test_executions.findUnique({
        where: { execution_id: safeExecutionId },
        include: {
          test_plans: {
            include: {
              users_test_plans_student_idTousers: true // Include student details
            }
          }
        }
      });

      // Validate execution existence
      if (!execution) {
        throw new NotFoundError(`Test execution ${safeExecutionId} not found`);
      }

      // Verify user access
      if (execution.student_id !== safeUserId) {
        throw new UnauthorizedError('You are not authorized to view these results');
      }

      // Ensure the test is completed
      if (execution.status !== 'COMPLETED') {
        throw new ValidationError('Test results are only available after completing the test');
      }

      // Parse test data
      let testData;
      try {
        testData = JSON.parse(execution.test_data);
      } catch (parseError) {
        console.error('Failed to parse test data', {
          executionId: safeExecutionId,
          parseErrorMessage: parseError.message
        });
        throw new BadRequestError('Unable to process test data');
      }

      // Calculate detailed results
      const totalQuestions = testData.responses?.length || 0;
      const correctAnswers = testData.responses?.filter(
        (resp: { is_correct?: boolean }) => resp.is_correct
      ).length || 0;

      // Log result details
      console.log('Execution Results', {
        executionId: safeExecutionId,
        totalQuestions,
        correctAnswers,
        score: execution.score
      });

      // Return comprehensive results
      return {
        executionId: execution.execution_id.toString(),
        testPlanId: execution.test_plan_id.toString(),
        studentId: execution.student_id.toString(),
        status: execution.status,
        startedAt: execution.started_at || undefined,
        completedAt: execution.completed_at || undefined,
        score: execution.score,
        testData: {
          totalQuestions,
          correctAnswers,
          questions: testData.questions || [],
          responses: testData.responses || []
        }
      };
    } catch (error) {
      // Comprehensive error logging
      console.error('Error in getExecutionResults', {
        executionId: safeExecutionId,
        userId: safeUserId,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      });

      // Rethrow the error
      throw error;
    }
  }

  async calculateAndUpdateTestScore(
    executionId: bigint | string, 
    userId: bigint | string
  ): Promise<TestExecutionResponse> {
    // Fetch the execution
    const execution = await this.findExecutionWithAccess(executionId, userId);

    // Parse test data
    const testData = JSON.parse(execution.test_data);

    // Log the entire original test data
    console.log('Original Test Data (Full):', JSON.stringify(testData, null, 2));

    // Calculate score
    let totalCorrect = 0;
    const updatedResponses = testData.responses.map((response: TestExecutionResponseData) => {
      // Find the corresponding question
      const question = testData.questions.find(
        (q: TestExecutionQuestionData) => q.question_id === response.question_id
      );

      // Log individual response and question details
      console.log('Processing Response:', JSON.stringify(response, null, 2));
      console.log('Corresponding Question:', JSON.stringify(question, null, 2));

      // Check if the answer is correct
      const isCorrect = this.checkAnswer(question, response.student_answer);
      
      // Log answer checking result
      console.log(`Question ${response.question_id} - Correct: ${isCorrect}`);
      
      // Update response
      response.is_correct = isCorrect;
      
      // Count correct answers
      if (isCorrect) totalCorrect++;

      return response;
    });

    // Calculate score percentage
    const totalQuestions = testData.questions.length;
    const scorePercentage = Math.round((totalCorrect / totalQuestions) * 100);

    // Log score calculation details
    console.log('Total Correct:', totalCorrect);
    console.log('Total Questions:', totalQuestions);
    console.log('Score Percentage:', scorePercentage);

    // Prepare updated test data
    const updatedTestData = {
      ...testData,
      responses: updatedResponses,
      total_correct: totalCorrect,
      total_questions: totalQuestions,
      score: scorePercentage
    };

    // Update the execution in the database
    const updatedExecution = await prisma.test_executions.update({
      where: { execution_id: BigInt(executionId) },
      data: {
        score: scorePercentage,
        test_data: JSON.stringify(updatedTestData)
      },
    });

    // Log the data being written to the database
    console.log('Data Being Written to Database:', JSON.stringify({
      score: scorePercentage,
      test_data: updatedTestData
    }, null, 2));

    // Return formatted response
    return {
      execution: {
        ...updatedExecution,
        score: scorePercentage,
        test_data: JSON.stringify(updatedTestData)
      }
    } as TestExecutionResponse;
  }

  private async findExecutionWithAccess(
    executionId: bigint | string | undefined,
    userId: bigint | string | undefined
  ): Promise<ExecutionWithPlan> {
    const safeExecutionId = this.safeBigInt(executionId);
    const safeUserId = this.safeBigInt(userId);

    const execution = await this.findTestExecutionWithAccess(safeExecutionId, safeUserId);
    return execution;
  }

  private async findTestExecutionWithAccess(executionId: bigint, userId: bigint): Promise<ExecutionWithPlan> {
    try {
      console.log('Finding test execution with access:', {
        executionId: executionId.toString(),
        userId: userId.toString()
      });

      // First, find the specific test execution
      const execution = await prisma.test_executions.findUnique({
        where: { 
          execution_id: Number(executionId)
        },
        include: {
          test_plans: true  // Include the associated test plan
        }
      });

      if (!execution) {
        console.error('No execution found', {
          executionId: executionId.toString()
        });
        throw new NotFoundError(`Test execution not found for ID: ${executionId.toString()}`);
      }

      // Check if the user has access to this specific execution
      const userExecutionAccess = await prisma.test_executions.count({
        where: {
          execution_id: Number(executionId),
          student_id: Number(userId)  // Use student_id instead of user_id
        }
      });

      if (userExecutionAccess === 0) {
        console.error('User does not have access to this test execution', {
          executionId: executionId.toString(),
          userId: userId.toString()
        });
        throw new UnauthorizedError('User does not have access to this test execution');
      }

      // Additional logging for debugging
      console.log('Execution details:', {
        id: execution.execution_id.toString(),
        status: execution.status,
        planId: execution.test_plan_id.toString()
      });

      return execution;
    } catch (error) {
      // Comprehensive error logging
      console.error('Complete error in findTestExecutionWithAccess:', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        executionId: executionId.toString(),
        userId: userId.toString()
      });

      // Rethrow known error types
      if (error instanceof ValidationError || 
          error instanceof UnauthorizedError || 
          error instanceof NotFoundError) {
        throw error;
      }

      // Wrap any unexpected errors
      throw new ValidationError(`Failed to access test execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Consolidated and flexible calculateScore method
  private async calculateScore(execution: any): Promise<number> {
    // Enhanced logging for score calculation
    console.log('Calculating Score', {
      executionType: typeof execution,
      executionKeys: execution ? Object.keys(execution) : 'No execution provided'
    });

    try {
      // Determine the test data source
      let testData;
      if (typeof execution === 'object') {
        // If execution is an object, try to extract test_data
        testData = execution.test_data || execution;
      }

      // Parse test data if it's a string
      if (typeof testData === 'string') {
        try {
          testData = JSON.parse(testData);
        } catch (parseError) {
          console.error('Failed to parse test data for score calculation', {
            originalData: testData,
            parseErrorMessage: parseError.message
          });
          return 0;
        }
      }

      // Validate parsed test data
      if (!testData || !testData.responses) {
        console.warn('Invalid test data structure for score calculation', {
          testData
        });
        return 0;
      }

      // Calculate score based on correct answers
      const correctAnswers = testData.responses.filter(
        (resp: { is_correct?: boolean }) => resp.is_correct === true
      ).length;

      const totalQuestions = testData.responses.length;

      // Log score calculation details
      console.log('Score Calculation Details', {
        correctAnswers,
        totalQuestions,
        scorePercentage: totalQuestions > 0 
          ? Math.round((correctAnswers / totalQuestions) * 100) 
          : 0
      });

      // Calculate percentage score
      return totalQuestions > 0 
        ? Math.round((correctAnswers / totalQuestions) * 100) 
        : 0;
    } catch (error) {
      // Comprehensive error logging
      console.error('Error in calculateScore', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        executionData: execution
      });

      // Return 0 or rethrow based on your error handling strategy
      return 0;
    }
  }

  private checkAnswer(question: any, studentAnswer: string): boolean {
    // Defensive logging with more comprehensive input details
    console.log('Check Answer Input', {
      questionId: question.question_id,
      studentAnswer,
      correctAnswerKaTeX: question.correct_answer,
      correctAnswerPlain: question.correct_answer_plain,
      options: question.options,
      isKaTeX: question.is_katex
    });

    // Normalize student answer and correct answer
    const normalizeAnswer = (answer: string) => 
      (answer || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    // Determine the format to use based on the question's format
    const isKaTeXFormat = question.is_katex === true;
    const correctAnswer = isKaTeXFormat 
      ? (question.correct_answer || question.correct_answer_plain || '')
      : (question.correct_answer_plain || question.correct_answer || '');

    // Normalize answers for comparison
    const normalizedStudentAnswer = normalizeAnswer(studentAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

    // Direct comparison after normalization
    const isCorrect = normalizedStudentAnswer === normalizedCorrectAnswer;

    // Enhanced logging for comparison
    console.log('Answer Comparison', {
      studentAnswer,
      correctAnswer,
      normalizedStudentAnswer,
      normalizedCorrectAnswer,
      isCorrect,
      usingKaTeXFormat: isKaTeXFormat
    });

    return isCorrect;
  }

  private determineExecutionStatus(responses: any[]): string {
    // Check if all questions have been answered
    const allAnswered = responses.every(resp => resp.student_answer !== null);
    
    // If all answered, mark as completed
    return allAnswered ? 'COMPLETED' : 'IN_PROGRESS';
  }

  private formatExecutionResponse(execution: ExecutionWithPlan): TestExecutionResponse {
    // Pass through the test_data exactly as stored in the database
    let testData;
    try {
      // Attempt to parse the test data, but keep original format if parsing fails
      try {
        testData = JSON.parse(execution.test_data);
      } catch (parseError) {
        // If parsing fails, use the original string
        console.warn('Unable to parse test_data, using original format', {
          executionId: execution.execution_id,
          originalData: execution.test_data
        });
        testData = execution.test_data;
      }
    } catch (error) {
      // Comprehensive error logging
      console.error('Error processing test data in formatExecutionResponse', {
        executionId: execution.execution_id,
        errorName: error.name,
        errorMessage: error.message,
        originalData: execution.test_data
      });

      // Rethrow the original error to maintain existing behavior
      throw new Error(`Failed to process test data for execution ${execution.execution_id}: ${error.message}`);
    }

    return {
      executionId: execution.execution_id,
      testPlanId: execution.test_plan_id,
      studentId: execution.student_id,
      status: execution.status,
      startedAt: execution.started_at || undefined,
      testData: testData // Pass through the data exactly as stored
    };
  }

  private formatTestExecutionResponse(execution: ExecutionWithPlan): TestExecutionResponse {
    return {
      executionId: execution.execution_id,
      testPlanId: execution.test_plan_id,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      pausedAt: execution.paused_at,
      score: execution.score,
      testData: JSON.parse(execution.test_data),
    };
  }
}