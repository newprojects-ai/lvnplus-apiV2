import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { TestExecutionResponse, UpdateExecutionDTO } from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

export class TestExecutionService {
  async getExecution(
    executionId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);
    return this.formatExecutionResponse(execution);
  }

  async startExecution(
    executionId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'NOT_STARTED') {
      throw new ValidationError('Test has already been started');
    }

    const updatedExecution = await prisma.testExecution.update({
      where: { id: executionId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async submitAnswer(
    executionId: bigint,
    userId: bigint,
    updateData: UpdateExecutionDTO
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const testData = execution.testData as any;
    testData.responses.push(updateData.response);

    const updatedExecution = await prisma.testExecution.update({
      where: { id: executionId },
      data: {
        testData: testData,
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  async completeExecution(
    executionId: bigint,
    userId: bigint
  ): Promise<TestExecutionResponse> {
    const execution = await this.findExecutionWithAccess(executionId, userId);

    if (execution.status !== 'IN_PROGRESS') {
      throw new ValidationError('Test is not in progress');
    }

    const score = await this.calculateScore(execution);

    const updatedExecution = await prisma.testExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score,
      },
    });

    return this.formatExecutionResponse(updatedExecution);
  }

  private async findExecutionWithAccess(executionId: bigint, userId: bigint) {
    const execution = await prisma.testExecution.findUnique({
      where: { id: executionId },
      include: {
        testPlan: {
          include: {
            student: true,
            planner: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundError('Test execution not found');
    }

    if (
      execution.testPlan.studentId !== userId &&
      execution.testPlan.plannedBy !== userId
    ) {
      throw new UnauthorizedError('Unauthorized access to test execution');
    }

    return execution;
  }

  private async calculateScore(execution: any): Promise<number> {
    const testData = execution.testData as any;
    let score = 0;

    for (const response of testData.responses) {
      const question = testData.questions.find(
        (q: any) => q.id === response.questionId
      );
      if (question && question.correctAnswer === response.answer) {
        score++;
      }
    }

    return Math.round((score / testData.questions.length) * 100);
  }

  private formatExecutionResponse(execution: any): TestExecutionResponse {
    return {
      id: execution.id,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      score: execution.score,
      testData: execution.testData,
    };
  }
}