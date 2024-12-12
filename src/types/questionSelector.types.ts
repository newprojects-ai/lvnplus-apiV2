// No imports needed

export interface QuestionSelectionCriteria {
  topicIds?: number[];
  subtopicIds?: number[];
  totalQuestions: number;
  difficultyDistribution?: {
    mental?: number;
    easy?: number;
    moderate?: number;
    difficult?: number;
    challenging?: number;
  };
}

export interface QuestionSelectionOptions {
  randomize?: boolean;
  allowCrossDifficulty?: boolean;
  topicDistributionStrategy?: string;
}

export interface FilterQuestionParams {
  difficulty: number;
  limit: number;
  offset?: number;
  topicId?: number;
  subtopicId?: number;
}

export interface FilterQuestionResponse {
  data: any[];
  total: number;
  limit: number;
  offset: number;
}

export interface RandomQuestionParams {
  count: number;
  difficulty?: number;
  topicIds?: number[];
  subtopicIds?: number[];
}
