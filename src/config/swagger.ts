import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EduTech API',
      version: '1.0.0',
      description: 'API documentation for the EduTech platform',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Question: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'bigint' },
            questionText: { type: 'string' },
            questionTextPlain: { type: 'string' },
            options: { 
              type: 'array',
              items: { type: 'string' }
            },
            correctAnswer: { type: 'string' },
            correctAnswerPlain: { type: 'string' },
            solution: { type: 'string' },
            solutionPlain: { type: 'string' },
            difficultyLevel: { type: 'integer', minimum: 1, maximum: 3 },
            subtopic: {
              $ref: '#/components/schemas/Subtopic'
            },
            creator: {
              $ref: '#/components/schemas/User'
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Subtopic: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            topic: {
              $ref: '#/components/schemas/Topic'
            },
          },
        },
        Topic: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            subject: {
              $ref: '#/components/schemas/Subject'
            },
          },
        },
        Subject: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'bigint' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string', nullable: true },
            lastName: { type: 'string', nullable: true },
          },
        },
        DifficultyLevel: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            value: { type: 'integer' },
            purpose: { type: 'string' },
            characteristics: { type: 'string' },
            focusArea: { type: 'string' },
            stepsRequired: { type: 'string', nullable: true },
          },
        },
        Template: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'bigint' },
            templateName: { type: 'string' },
            source: { type: 'string', enum: ['SYSTEM', 'USER'] },
            creator: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string', nullable: true },
                lastName: { type: 'string', nullable: true },
              },
            },
            examBoard: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                inputType: { type: 'string', enum: ['NUMERIC', 'MCQ'] },
              },
            },
            testType: { type: 'string', enum: ['TOPIC', 'MIXED', 'MENTAL_ARITHMETIC'] },
            timingType: { type: 'string', enum: ['TIMED', 'UNTIMED'] },
            timeLimit: { type: 'integer', nullable: true },
            configuration: {
              type: 'object',
              properties: {
                topics: { type: 'array', items: { type: 'integer' } },
                subtopics: { type: 'array', items: { type: 'integer' } },
                questionCounts: {
                  type: 'object',
                  properties: {
                    easy: { type: 'integer' },
                    medium: { type: 'integer' },
                    hard: { type: 'integer' },
                  },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        TemplateInput: {
          type: 'object',
          required: ['templateName', 'boardId', 'testType', 'timingType', 'configuration'],
          properties: {
            templateName: { type: 'string' },
            boardId: { type: 'integer' },
            testType: { type: 'string', enum: ['TOPIC', 'MIXED', 'MENTAL_ARITHMETIC'] },
            timingType: { type: 'string', enum: ['TIMED', 'UNTIMED'] },
            timeLimit: { type: 'integer', nullable: true },
            configuration: {
              type: 'object',
              required: ['topics', 'subtopics', 'questionCounts'],
              properties: {
                topics: { type: 'array', items: { type: 'integer' } },
                subtopics: { type: 'array', items: { type: 'integer' } },
                questionCounts: {
                  type: 'object',
                  required: ['easy', 'medium', 'hard'],
                  properties: {
                    easy: { type: 'integer', minimum: 0 },
                    medium: { type: 'integer', minimum: 0 },
                    hard: { type: 'integer', minimum: 0 },
                  },
                },
              },
            },
          },
        },
        TestPlan: {
          type: 'object',
          properties: {
            testPlanId: { type: 'string', format: 'bigint' },
            testType: { type: 'string', enum: ['TOPIC', 'MIXED', 'MENTAL_ARITHMETIC'] },
            timingType: { type: 'string', enum: ['TIMED', 'UNTIMED'] },
            timeLimit: { type: 'integer', nullable: true },
            student: {
              type: 'object',
              properties: {
                userId: { type: 'string', format: 'bigint' },
                email: { type: 'string' },
                firstName: { type: 'string', nullable: true },
                lastName: { type: 'string', nullable: true },
              },
            },
            configuration: {
              type: 'object',
              properties: {
                topics: { type: 'array', items: { type: 'integer' } },
                subtopics: { type: 'array', items: { type: 'integer' } },
                questionCounts: {
                  type: 'object',
                  properties: {
                    easy: { type: 'integer' },
                    medium: { type: 'integer' },
                    hard: { type: 'integer' },
                  },
                },
              },
            },
            execution: {
              type: 'object',
              nullable: true,
              properties: {
                status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'] },
                startedAt: { type: 'string', format: 'date-time', nullable: true },
                completedAt: { type: 'string', format: 'date-time', nullable: true },
                score: { type: 'integer', nullable: true },
              },
            },
          },
        },
        TestExecution: {
          type: 'object',
          properties: {
            executionId: { type: 'string', format: 'bigint' },
            status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'] },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            score: { type: 'integer', nullable: true },
            testData: {
              type: 'object',
              properties: {
                questions: { type: 'array', items: { $ref: '#/components/schemas/Question' } },
                responses: { type: 'array', items: { type: 'object' } },
                timing: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Questions', description: 'Question management' },
      { name: 'Templates', description: 'Test template management' },
      { name: 'Test Plans', description: 'Test plan management' },
      { name: 'Test Executions', description: 'Test execution and responses' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);