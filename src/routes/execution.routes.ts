import { Router } from 'express';
import {
  getExecution,
  createExecution,
  submitAnswer,
  completeExecution,
  pauseTest,
  resumeTest,
} from '../controllers/execution.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /tests/plans/{planId}/executions:
 *   post:
 *     summary: Create a new test execution
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Test execution created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 */
router.post('/plans/:planId/executions', authenticate, createExecution);

/**
 * @swagger
 * /tests/executions/{executionId}:
 *   get:
 *     summary: Get a test execution by ID
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test execution retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 */
router.get('/executions/:executionId', authenticate, getExecution);

/**
 * @swagger
 * /tests/executions/{executionId}/answers:
 *   post:
 *     summary: Submit an answer for a test
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionId
 *               - answer
 *             properties:
 *               questionId:
 *                 type: string
 *               answer:
 *                 type: string
 *     responses:
 *       204:
 *         description: Answer submitted successfully
 */
router.post('/executions/:executionId/answers', authenticate, submitAnswer);

/**
 * @swagger
 * /tests/executions/{executionId}/complete:
 *   post:
 *     summary: Complete a test execution
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestResult'
 */
router.post('/executions/:executionId/complete', authenticate, completeExecution);

/**
 * @swagger
 * /tests/executions/{executionId}/pause:
 *   post:
 *     summary: Pause a test execution
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test execution paused successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 */
router.post('/executions/:executionId/pause', authenticate, pauseTest);

/**
 * @swagger
 * /tests/executions/{executionId}/resume:
 *   post:
 *     summary: Resume a test execution
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test execution resumed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 */
router.post('/executions/:executionId/resume', authenticate, resumeTest);

export default router;