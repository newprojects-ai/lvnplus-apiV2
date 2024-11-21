import { Router } from 'express';
import {
  createTestPlan,
  getTestPlan,
  getStudentTests,
  startTest,
  submitTest,
  getTestStatus,
  getTestResults,
} from '../controllers/test.controller';
import { authenticate } from '../middleware/auth';
import { checkRole } from '../middleware/roles';
import { validateTestPlanCreation } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /tests/plan:
 *   post:
 *     summary: Create a new test plan
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - studentId
 *             properties:
 *               templateId:
 *                 type: string
 *               studentId:
 *                 type: string
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Test plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestPlan'
 */
router.post('/plan', authenticate, checkRole(['TEACHER', 'PARENT']), validateTestPlanCreation, createTestPlan);

/**
 * @swagger
 * /tests/plan/{id}:
 *   get:
 *     summary: Get a test plan by ID
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test plan details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestPlan'
 */
router.get('/plan/:id', authenticate, getTestPlan);

/**
 * @swagger
 * /tests/student/{studentId}:
 *   get:
 *     summary: Get all tests for a student
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED, ABANDONED]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of student's tests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TestPlan'
 */
router.get('/student/:studentId', authenticate, getStudentTests);

/**
 * @swagger
 * /tests/{planId}/start:
 *   post:
 *     summary: Start a test execution
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 */
router.post('/:planId/start', authenticate, startTest);

/**
 * @swagger
 * /tests/{executionId}/submit:
 *   put:
 *     summary: Submit an answer for a test
 *     tags: [Tests]
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
 *               - timeSpent
 *             properties:
 *               questionId:
 *                 type: string
 *               answer:
 *                 type: string
 *               timeSpent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Answer submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestExecution'
 */
router.put('/:executionId/submit', authenticate, submitTest);

/**
 * @swagger
 * /tests/{executionId}/status:
 *   get:
 *     summary: Get test execution status
 *     tags: [Tests]
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
 *         description: Test execution status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [NOT_STARTED, IN_PROGRESS, COMPLETED, ABANDONED]
 *                 timeRemaining:
 *                   type: number
 *                 questionsAnswered:
 *                   type: number
 *                 totalQuestions:
 *                   type: number
 */
router.get('/:executionId/status', authenticate, getTestStatus);

/**
 * @swagger
 * /tests/{executionId}/results:
 *   get:
 *     summary: Get test results
 *     tags: [Tests]
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
 *         description: Test results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 score:
 *                   type: number
 *                 totalQuestions:
 *                   type: number
 *                 correctAnswers:
 *                   type: number
 *                 timeSpent:
 *                   type: number
 *                 questionAnalysis:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       questionId:
 *                         type: string
 *                       correct:
 *                         type: boolean
 *                       timeSpent:
 *                         type: number
 *                       topic:
 *                         type: string
 */
router.get('/:executionId/results', authenticate, getTestResults);

export default router;