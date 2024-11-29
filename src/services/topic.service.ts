import prisma from '../lib/prisma';
import { CreateTopicDTO, UpdateTopicDTO, TopicResponse } from '../types';
import { NotFoundError } from '../utils/errors';

export class TopicService {
  async getTopics(subjectId: number): Promise<TopicResponse[]> {
    const topics = await prisma.topics.findMany({
      where: { subject_id: subjectId },
      include: {
        subjects: true,
        subtopics: true,
      },
    });

    return topics.map(this.formatTopicResponse);
  }

  async createTopic(data: CreateTopicDTO): Promise<TopicResponse> {
    const topic = await prisma.topics.create({
      data: {
        subject_id: data.subjectId,
        topic_name: data.topicName,
        description: data.description,
      },
      include: {
        subjects: true,
        subtopics: true,
      },
    });

    return this.formatTopicResponse(topic);
  }

  async getTopic(id: number): Promise<TopicResponse> {
    const topic = await prisma.topics.findUnique({
      where: { topic_id: id },
      include: {
        subjects: true,
        subtopics: true,
      },
    });

    if (!topic) {
      throw new NotFoundError('Topic not found');
    }

    return this.formatTopicResponse(topic);
  }

  async updateTopic(id: number, data: UpdateTopicDTO): Promise<TopicResponse> {
    const topic = await prisma.topics.update({
      where: { topic_id: id },
      data: {
        topic_name: data.topicName,
        description: data.description,
      },
      include: {
        subjects: true,
        subtopics: true,
      },
    });

    return this.formatTopicResponse(topic);
  }

  async deleteTopic(id: number): Promise<void> {
    await prisma.topics.delete({
      where: { topic_id: id },
    });
  }

  private formatTopicResponse(topic: any): TopicResponse {
    return {
      id: topic.topic_id,
      name: topic.topic_name,
      description: topic.description,
      subject: {
        id: topic.subjects.subject_id,
        name: topic.subjects.subject_name,
      },
      subtopics: topic.subtopics.map((subtopic: any) => ({
        id: subtopic.subtopic_id,
        name: subtopic.subtopic_name,
        description: subtopic.description,
      })),
    };
  }
}