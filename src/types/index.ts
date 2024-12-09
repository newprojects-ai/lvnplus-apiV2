export interface RegisterUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles?: string[];
}

export interface LoginUserDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    roles: string[];
  };
  token: string;
}

export interface CreateTemplateDTO {
  templateName: string;
  boardId: number;
  testType: 'TOPIC' | 'MIXED' | 'MENTAL_ARITHMETIC';
  timingType: 'TIMED' | 'UNTIMED';
  timeLimit?: number;
  configuration: {
    topics: number[];
    subtopics: number[];
    questionCounts: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

export interface UpdateTemplateDTO extends CreateTemplateDTO {}

export interface TemplateResponse {
  id: string;
  templateName: string;
  source: 'SYSTEM' | 'USER';
  creator: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  examBoard: {
    id: number;
    name: string;
    inputType: 'NUMERIC' | 'MCQ';
  };
  testType: string;
  timingType: string;
  timeLimit?: number;
  configuration: any;
  createdAt: Date;
}

export interface TemplateFilters {
  source?: 'SYSTEM' | 'USER';
  boardId?: number;
}

export interface CreateTestPlanDTO {
  templateId?: bigint;
  boardId: number;
  testType: 'TOPIC' | 'MIXED' | 'MENTAL_ARITHMETIC';
  timingType: 'TIMED' | 'UNTIMED';
  timeLimit?: number;
  studentId: bigint;
  plannedBy: bigint;
  configuration: {
    topics: number[];
    subtopics: number[];
    questionCounts: Record<string, number>;
  };
}

export interface UpdateTestPlanDTO extends Partial<CreateTestPlanDTO> {}

export interface TestPlanResponse {
  testPlanId: bigint;
  templateId?: bigint;
  boardId: number;
  testType: string;
  timingType: string;
  timeLimit?: number;
  student: {
    userId: bigint;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  plannedBy: bigint;
  plannedAt: Date;
  configuration: any;
  execution?: {
    status: string;
    startedAt?: Date;
    completedAt?: Date;
    score?: number;
  };
}

export interface TestExecutionResponse {
  executionId: bigint;
  testPlanId: bigint;
  status: string;
  startedAt?: Date;
  testData: {
    questions: Array<{
      id: number;
      content: string;
      options?: string[];
      topicId: number;
      subtopicId: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    responses: Record<string, string>;
    timingData: {
      startTime: number;
      endTime?: number;
      pausedDuration?: number;
    };
  };
  score?: number;
}

export interface SubmitAnswerDTO {
  questionId: string;
  answer: string;
}

export interface TestResultResponse {
  id: string;
  testSessionId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: string;
  accuracy: number;
  topicPerformance: Array<{
    topicId: string;
    correct: number;
    total: number;
    accuracy: number;
  }>;
}

export interface CreateSubjectDTO {
  subjectName: string;
  description?: string;
}

export interface UpdateSubjectDTO {
  subjectName?: string;
  description?: string;
}

export interface SubjectResponse {
  id: number;
  name: string;
  description: string | null;
  topics: {
    id: number;
    name: string;
    description: string | null;
  }[];
}

export interface CreateTopicDTO {
  subjectId: number;
  topicName: string;
  description?: string;
}

export interface UpdateTopicDTO {
  topicName?: string;
  description?: string;
}

export interface TopicResponse {
  id: number;
  name: string;
  description: string | null;
  subject: {
    id: number;
    name: string;
  };
  subtopics: {
    id: number;
    name: string;
    description: string | null;
  }[];
}

export interface CreateSubtopicDTO {
  topicId: number;
  subtopicName: string;
  description?: string;
}

export interface UpdateSubtopicDTO {
  subtopicName?: string;
  description?: string;
}

export interface SubtopicResponse {
  id: number;
  name: string;
  description: string | null;
  topic: {
    id: number;
    name: string;
    subject: {
      id: number;
      name: string;
    };
  };
}

export interface CreateQuestionDTO {
  subtopicId: number;
  questionText: string;
  questionTextPlain: string;
  options: string;
  correctAnswer: string;
  correctAnswerPlain: string;
  solution: string;
  solutionPlain: string;
  difficultyLevel: number;
}

export interface UpdateQuestionDTO extends Partial<CreateQuestionDTO> {}

export interface QuestionResponse {
  id: string;
  questionText: string;
  options: any;
  correctAnswer: string;
  difficultyLevel: number;
  subtopic: {
    id: number;
    name: string;
    topic: {
      id: number;
      name: string;
      subject: {
        id: number;
        name: string;
      };
    };
  };
  creator: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  createdAt: Date;
}

export interface QuestionFilters {
  topicId?: number;
  subtopicId?: number;
  difficulty?: number;
  examBoard?: number;
  limit: number;
  offset: number;
}

export interface RandomQuestionParams {
  count: number;
  difficulty?: number;
  topicIds?: number[];
  subtopicIds?: number[];
}

export interface RegisterUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}