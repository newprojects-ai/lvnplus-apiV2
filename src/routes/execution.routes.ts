import { Router } from 'express';
import {
  getExecution,
  startExecution,
  submitAnswer,
  completeExecution,
} from '../controllers/execution.controller';
import { authenticate } from '../middleware/auth';
import { validateExecutionUpdate } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /executions/{id}:
 *   get:
 *     summary: Get a test execution by ID
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test execution ID
 *     responses:
 *       200:
 *         description: Test execution retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test execution not found
 */
router.get('/:id', authenticate, getExecution);

/**
 * @swagger
 * /executions/{id}/start:
 *   post:
 *     summary: Start a test execution
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test execution ID
 *     responses:
 *       200:
 *         description: Test execution started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test execution not found
 */
router.post('/:id/start', authenticate, startExecution);

/**
 * @swagger
 * /executions/{id}/answer:
 *   post:
 *     summary: Submit an answer for a test execution
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test execution ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: object
 *                 properties:
 *                   questionId: 
 *                     type: string
 *                   answer:
 *                     type: string
 *                   timeSpent:
 *                     type: number
 *     responses:
 *       200:
 *         description: Answer submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test execution not found
 */
router.post('/:id/answer', authenticate, validateExecutionUpdate, submitAnswer);

/**
 * @swagger
 * /executions/{id}/complete:
 *   post:
 *     summary: Complete a test execution
 *     tags: [Test Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test execution ID
 *     responses:
 *       200:
 *         description: Test execution completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test execution not found
 */
router.post('/:id/complete', authenticate, completeExecution);

export default router;