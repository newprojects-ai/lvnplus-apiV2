export interface RegisterUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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

export interface TestPlanResponse {
  testPlanId: bigint;
  testType: string;
  timingType: string;
  timeLimit?: number;
  student: {
    userId: bigint;
    email: string;
    firstName?: string;
    lastName?: string;
  };
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
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  testData: {
    questions: any[];
    responses: any[];
    timing: any[];
  };
}

export interface UpdateExecutionDTO {
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  response?: {
    questionId: bigint;
    answer: string;
    timeSpent: number;
  };
}