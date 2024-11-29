import { Router } from 'express';
import {
  getTopics,
  createTopic,
  getTopic,
  updateTopic,
  deleteTopic,
} from '../controllers/topic.controller';
import { authenticate } from '../middleware/auth';
import { checkRole } from '../middleware/roles';
import { validateTopicCreation, validateTopicUpdate } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /topics:
 *   get:
 *     summary: Get all topics for a subject
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of topics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Topic'
 */
router.get('/', authenticate, getTopics);

/**
 * @swagger
 * /topics:
 *   post:
 *     summary: Create a new topic
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjectId
 *               - topicName
 *             properties:
 *               subjectId:
 *                 type: integer
 *               topicName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Topic created successfully
 */
router.post('/', authenticate, checkRole(['ADMIN']), validateTopicCreation, createTopic);

/**
 * @swagger
 * /topics/{id}:
 *   get:
 *     summary: Get a topic by ID
 *     tags: [Topics]
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
 *         description: Topic details
 */
router.get('/:id', authenticate, getTopic);

/**
 * @swagger
 * /topics/{id}:
 *   put:
 *     summary: Update a topic
 *     tags: [Topics]
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
 *               topicName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Topic updated successfully
 */
router.put('/:id', authenticate, checkRole(['ADMIN']), validateTopicUpdate, updateTopic);

/**
 * @swagger
 * /topics/{id}:
 *   delete:
 *     summary: Delete a topic
 *     tags: [Topics]
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
 *         description: Topic deleted successfully
 */
router.delete('/:id', authenticate, checkRole(['ADMIN']), deleteTopic);

export default router;