import { Request, Response, NextFunction } from 'express';
import { TemplateService } from '../services/template.service';
import { CreateTemplateDTO, UpdateTemplateDTO } from '../types';

const templateService = new TemplateService();

export const getTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { source, boardId } = req.query;
    const filters = {
      source: source as 'SYSTEM' | 'USER' | undefined,
      boardId: boardId ? parseInt(boardId as string) : undefined,
    };
    
    const templates = await templateService.getTemplates(filters);
    res.json(templates);
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const templateData: CreateTemplateDTO = req.body;
    
    const template = await templateService.createTemplate(userId, templateData);
    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
};

export const getTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const template = await templateService.getTemplate(BigInt(id), userId);
    res.json(template);
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData: UpdateTemplateDTO = req.body;
    
    const template = await templateService.updateTemplate(
      BigInt(id),
      userId,
      updateData
    );
    res.json(template);
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    await templateService.deleteTemplate(BigInt(id), userId);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
};