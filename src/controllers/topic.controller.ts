import { Request, Response, NextFunction } from 'express';
import { TopicService } from '../services/topic.service';
import { CreateTopicDTO, UpdateTopicDTO } from '../types';

const topicService = new TopicService();

export const getTopics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) {
      throw new ValidationError('Subject ID is required');
    }
    const topics = await topicService.getTopics(parseInt(subjectId));
    res.json(topics);
  } catch (error) {
    next(error);
  }
};

export const createTopic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const topicData: CreateTopicDTO = req.body;
    const topic = await topicService.createTopic(topicData);
    res.status(201).json(topic);
  } catch (error) {
    next(error);
  }
};

export const getTopic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const topic = await topicService.getTopic(parseInt(id));
    res.json(topic);
  } catch (error) {
    next(error);
  }
};

export const updateTopic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData: UpdateTopicDTO = req.body;
    const topic = await topicService.updateTopic(parseInt(id), updateData);
    res.json(topic);
  } catch (error) {
    next(error);
  }
};

export const deleteTopic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await topicService.deleteTopic(parseInt(id));
    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    next(error);
  }
};