import prisma from '../lib/prisma';
import { CreateSubjectDTO, UpdateSubjectDTO, SubjectResponse } from '../types';
import { NotFoundError } from '../utils/errors';

export class SubjectService {
  async getSubjects(): Promise<SubjectResponse[]> {
    const subjects = await prisma.subjects.findMany({
      include: {
        topics: true,
      },
    });

    return subjects.map(this.formatSubjectResponse);
  }

  async createSubject(data: CreateSubjectDTO): Promise<SubjectResponse> {
    const subject = await prisma.subjects.create({
      data: {
        subject_name: data.subjectName,
        description: data.description,
      },
      include: {
        topics: true,
      },
    });

    return this.formatSubjectResponse(subject);
  }

  async getSubject(id: number): Promise<SubjectResponse> {
    const subject = await prisma.subjects.findUnique({
      where: { subject_id: id },
      include: {
        topics: true,
      },
    });

    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    return this.formatSubjectResponse(subject);
  }

  async updateSubject(
    id: number,
    data: UpdateSubjectDTO
  ): Promise<SubjectResponse> {
    const subject = await prisma.subjects.update({
      where: { subject_id: id },
      data: {
        subject_name: data.subjectName,
        description: data.description,
      },
      include: {
        topics: true,
      },
    });

    return this.formatSubjectResponse(subject);
  }

  async deleteSubject(id: number): Promise<void> {
    await prisma.subjects.delete({
      where: { subject_id: id },
    });
  }

  private formatSubjectResponse(subject: any): SubjectResponse {
    return {
      id: subject.subject_id,
      name: subject.subject_name,
      description: subject.description,
      topics: subject.topics.map((topic: any) => ({
        id: topic.topic_id,
        name: topic.topic_name,
        description: topic.description,
      })),
    };
  }
}