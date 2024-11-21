import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  CreateTemplateDTO,
  UpdateTemplateDTO,
  TemplateResponse,
  TemplateFilters,
} from '../types';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

export class TemplateService {
  async getTemplates(filters: TemplateFilters): Promise<TemplateResponse[]> {
    const where: Prisma.test_templatesWhereInput = {
      active: true,
    };

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.boardId) {
      where.board_id = filters.boardId;
    }

    const templates = await prisma.test_templates.findMany({
      where,
      include: {
        users: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        exam_boards: {
          select: {
            board_id: true,
            board_name: true,
            input_type: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return templates.map(this.formatTemplateResponse);
  }

  async createTemplate(
    userId: bigint,
    data: CreateTemplateDTO
  ): Promise<TemplateResponse> {
    const template = await prisma.test_templates.create({
      data: {
        template_name: data.templateName,
        source: 'USER',
        created_by: userId,
        board_id: data.boardId,
        test_type: data.testType,
        timing_type: data.timingType,
        time_limit: data.timeLimit,
        configuration: JSON.stringify(data.configuration),
      },
      include: {
        users: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        exam_boards: {
          select: {
            board_id: true,
            board_name: true,
            input_type: true,
          },
        },
      },
    });

    return this.formatTemplateResponse(template);
  }

  async getTemplate(
    templateId: bigint,
    userId: bigint
  ): Promise<TemplateResponse> {
    const template = await prisma.test_templates.findUnique({
      where: {
        template_id: templateId,
        active: true,
      },
      include: {
        users: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        exam_boards: {
          select: {
            board_id: true,
            board_name: true,
            input_type: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    return this.formatTemplateResponse(template);
  }

  async updateTemplate(
    templateId: bigint,
    userId: bigint,
    data: UpdateTemplateDTO
  ): Promise<TemplateResponse> {
    const template = await prisma.test_templates.findUnique({
      where: { template_id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    if (template.source === 'SYSTEM') {
      throw new ValidationError('System templates cannot be modified');
    }

    if (template.created_by !== userId) {
      throw new UnauthorizedError('Not authorized to modify this template');
    }

    const updatedTemplate = await prisma.test_templates.update({
      where: { template_id: templateId },
      data: {
        template_name: data.templateName,
        board_id: data.boardId,
        test_type: data.testType,
        timing_type: data.timingType,
        time_limit: data.timeLimit,
        configuration: JSON.stringify(data.configuration),
      },
      include: {
        users: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        exam_boards: {
          select: {
            board_id: true,
            board_name: true,
            input_type: true,
          },
        },
      },
    });

    return this.formatTemplateResponse(updatedTemplate);
  }

  async deleteTemplate(templateId: bigint, userId: bigint): Promise<void> {
    const template = await prisma.test_templates.findUnique({
      where: { template_id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    if (template.source === 'SYSTEM') {
      throw new ValidationError('System templates cannot be deleted');
    }

    if (template.created_by !== userId) {
      throw new UnauthorizedError('Not authorized to delete this template');
    }

    await prisma.test_templates.update({
      where: { template_id: templateId },
      data: { active: false },
    });
  }

  private formatTemplateResponse(template: any): TemplateResponse {
    return {
      id: template.template_id.toString(),
      templateName: template.template_name,
      source: template.source,
      creator: {
        id: template.users.user_id.toString(),
        email: template.users.email,
        firstName: template.users.first_name,
        lastName: template.users.last_name,
      },
      examBoard: {
        id: template.exam_boards.board_id,
        name: template.exam_boards.board_name,
        inputType: template.exam_boards.input_type,
      },
      testType: template.test_type,
      timingType: template.timing_type,
      timeLimit: template.time_limit,
      configuration: JSON.parse(template.configuration),
      createdAt: template.created_at,
    };
  }
}