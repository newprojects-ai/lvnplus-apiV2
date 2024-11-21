import { Router } from 'express';
import { createTestPlan, getTestPlan } from '../controllers/testPlan.controller';
import { validateTestPlanCreation } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { checkRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * /test-plans:
 *   post:
 *     summary: Create a new test plan
 *     tags: [Test Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestPlan'
 *     responses:
 *       201:
 *         description: Test plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestPlan'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/',
  authenticate,
  checkRole(['TEACHER', 'PARENT']),
  validateTestPlanCreation,
  createTestPlan
);

/**
 * @swagger
 * /test-plans/{id}:
 *   get:
 *     summary: Get a test plan by ID
 *     tags: [Test Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test plan ID
 *     responses:
 *       200:
 *         description: Test plan retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestPlan'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test plan not found
 */
router.get(
  '/:id',
  authenticate,
  getTestPlan
);

export default router;