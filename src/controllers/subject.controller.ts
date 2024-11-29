import { Request, Response, NextFunction } from 'express';
import { SubjectService } from '../services/subject.service';
import { CreateSubjectDTO, UpdateSubjectDTO } from '../types';

const subjectService = new SubjectService();

export const getSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subjects = await subjectService.getSubjects();
    res.json(subjects);
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subjectData: CreateSubjectDTO = req.body;
    const subject = await subjectService.createSubject(subjectData);
    res.status(201).json(subject);
  } catch (error) {
    next(error);
  }
};

export const getSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const subject = await subjectService.getSubject(parseInt(id));
    res.json(subject);
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData: UpdateSubjectDTO = req.body;
    const subject = await subjectService.updateSubject(parseInt(id), updateData);
    res.json(subject);
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await subjectService.deleteSubject(parseInt(id));
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
};