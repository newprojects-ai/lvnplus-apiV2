import { Router } from 'express';
import { 
  createTestPlan, 
  getTestPlan, 
  updateTestPlan, 
  deleteTestPlan 
} from '../controllers/testPlan.controller';
import { 
  validateTestPlanCreation, 
  validateTestPlanUpdate 
} from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { checkRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * /api/tests/plans:
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
 * /api/tests/plans/{planId}:
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
  '/:planId',
  authenticate,
  getTestPlan
);

/**
 * @swagger
 * /api/tests/plans/{planId}:
 *   patch:
 *     summary: Update a test plan
 *     tags: [Test Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestPlan'
 *     responses:
 *       200:
 *         description: Test plan updated successfully
 */
router.patch(
  '/:planId',
  authenticate,
  checkRole(['TEACHER', 'PARENT']),
  validateTestPlanUpdate,
  updateTestPlan
);

/**
 * @swagger
 * /api/tests/plans/{planId}:
 *   delete:
 *     summary: Delete a test plan
 *     tags: [Test Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Test plan deleted successfully
 */
router.delete(
  '/:planId',
  authenticate,
  checkRole(['TEACHER', 'PARENT']),
  deleteTestPlan
);

export default router;