import { Request, Response, NextFunction } from 'express';
import { SubtopicService } from '../services/subtopic.service';
import { CreateSubtopicDTO, UpdateSubtopicDTO } from '../types';

const subtopicService = new SubtopicService();

export const getSubtopics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { topicId } = req.params;
    const subtopics = await subtopicService.getSubtopics(parseInt(topicId));
    res.json(subtopics);
  } catch (error) {
    next(error);
  }
};

export const createSubtopic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { topicId } = req.params;
    const subtopicData: CreateSubtopicDTO = {
      ...req.body,
      topicId: parseInt(topicId),
    };
    const subtopic = await subtopicService.createSubtopic(subtopicData);
    res.status(201).json(subtopic);
  } catch (error) {
    next(error);
  }
};

export const updateSubtopic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData: UpdateSubtopicDTO = req.body;
    const subtopic = await subtopicService.updateSubtopic(parseInt(id), updateData);
    res.json(subtopic);
  } catch (error) {
    next(error);
  }
};

export const deleteSubtopic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await subtopicService.deleteSubtopic(parseInt(id));
    res.json({ message: 'Subtopic deleted successfully' });
  } catch (error) {
    next(error);
  }
};