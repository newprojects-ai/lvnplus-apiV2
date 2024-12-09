export interface TestExecutionResponse {
  executionId: bigint;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  pausedAt: Date | null;
  score: number | null;
  testData: {
    responses: { questionId: string; answer: string }[];
    questions: { question_id: string; correct_answer: string }[];
  };
}

export interface UpdateExecutionDTO {
  response: {
    questionId: string;
    answer: string;
  };
}

export interface CreateTemplateDTO {
  name: string;
  source: string;
  active?: boolean;
  // Add other properties as needed based on your template structure
}

export interface UpdateTemplateDTO {
  name?: string;
  source?: string;
  active?: boolean;
  // Add other properties as needed
}

export interface TemplateResponse {
  id: string;
  name: string;
  source: string;
  active: boolean;
  // Add other properties as needed
}

export interface TemplateFilters {
  source?: string;
  boardId?: string;
  // Add other filter properties as needed
}
