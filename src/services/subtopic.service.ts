import prisma from '../lib/prisma';
import { CreateSubtopicDTO, UpdateSubtopicDTO, SubtopicResponse } from '../types';
import { NotFoundError } from '../utils/errors';

export class SubtopicService {
  async getSubtopics(topicId: number): Promise<SubtopicResponse[]> {
    const subtopics = await prisma.subtopics.findMany({
      where: { topic_id: topicId },
      include: {
        topics: {
          include: {
            subjects: true,
          },
        },
      },
    });

    return subtopics.map(this.formatSubtopicResponse);
  }

  async createSubtopic(data: CreateSubtopicDTO): Promise<SubtopicResponse> {
    const subtopic = await prisma.subtopics.create({
      data: {
        topic_id: data.topicId,
        subtopic_name: data.subtopicName,
        description: data.description,
      },
      include: {
        topics: {
          include: {
            subjects: true,
          },
        },
      },
    });

    return this.formatSubtopicResponse(subtopic);
  }

  async updateSubtopic(
    id: number,
    data: UpdateSubtopicDTO
  ): Promise<SubtopicResponse> {
    const subtopic = await prisma.subtopics.update({
      where: { subtopic_id: id },
      data: {
        subtopic_name: data.subtopicName,
        description: data.description,
      },
      include: {
        topics: {
          include: {
            subjects: true,
          },
        },
      },
    });

    return this.formatSubtopicResponse(subtopic);
  }

  async deleteSubtopic(id: number): Promise<void> {
    await prisma.subtopics.delete({
      where: { subtopic_id: id },
    });
  }

  private formatSubtopicResponse(subtopic: any): SubtopicResponse {
    return {
      id: subtopic.subtopic_id,
      name: subtopic.subtopic_name,
      description: subtopic.description,
      topic: {
        id: subtopic.topics.topic_id,
        name: subtopic.topics.topic_name,
        subject: {
          id: subtopic.topics.subjects.subject_id,
          name: subtopic.topics.subjects.subject_name,
        },
      },
    };
  }
}