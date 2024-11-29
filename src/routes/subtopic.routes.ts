import { Router } from 'express';
import {
  getSubtopics,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
} from '../controllers/subtopic.controller';
import { authenticate } from '../middleware/auth';
import { checkRole } from '../middleware/roles';
import { validateSubtopicCreation, validateSubtopicUpdate } from '../middleware/validation';

const router = Router();

/**
 * /subtopics/topic/{topicId}:
 *   get:
 *     summary: Get all subtopics for a topic
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of subtopics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subtopic'
 */
router.get('/topic/:topicId', authenticate, getSubtopics);

/**
 * /subtopics:
 *   post:
 *     summary: Create a new subtopic
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtopicName
 *             properties:
 *               subtopicName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subtopic created successfully
 */
router.post(
  '/:topicId/subtopics',
  authenticate,
  checkRole(['ADMIN']),
  validateSubtopicCreation,
  createSubtopic
);

/**
 * /subtopics/{id}:
 *   put:
 *     summary: Update a subtopic
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subtopicName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subtopic updated successfully
 */
router.put(
  '/subtopics/:id',
  authenticate,
  checkRole(['ADMIN']),
  validateSubtopicUpdate,
  updateSubtopic
);

/**
 * /subtopics/{id}:
 *   delete:
 *     summary: Delete a subtopic
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subtopic deleted successfully
 */
router.delete(
  '/subtopics/:id',
  authenticate,
  checkRole(['ADMIN']),
  deleteSubtopic
);

export default router;