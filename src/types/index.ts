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
  id: bigint;
  testType: string;
  timingType: string;
  timeLimit?: number;
  student: {
    id: bigint;
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
  id: bigint;
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