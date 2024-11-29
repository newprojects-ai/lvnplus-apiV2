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
 * @swagger
 * /subtopics/topic/{topicId}:
 *   get:
 *     summary: Get all subtopics for a topic
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtopicName
 *               - topicId
 *             properties:
 *               topicId:
 *                 type: integer
 *                 description: ID of the parent topic
 *               subtopicName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subtopic created successfully
 */
router.get('/topic/:topicId', authenticate, getSubtopics);

/**
 * @swagger
 * /subtopics:
 *   post:
 *     summary: Create a new subtopic
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtopicName
 *               - topicId
 *             properties:
 *               topicId:
 *                 type: integer
 *                 description: ID of the parent topic
 *               subtopicName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subtopic created successfully
 */
router.post(
  '/',
  authenticate,
  checkRole(['ADMIN']),
  validateSubtopicCreation,
  createSubtopic
);

/**
 * @swagger
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
  '/:id',
  authenticate,
  checkRole(['ADMIN']),
  validateSubtopicUpdate,
  updateSubtopic
);

/**
 * @swagger
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
  '/:id',
  authenticate,
  checkRole(['ADMIN']),
  deleteSubtopic
);

export default router;