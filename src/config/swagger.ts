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
        TestPlan: {
          type: 'object',
          properties: {
            templateId: { type: 'string', format: 'bigint', nullable: true },
            boardId: { type: 'integer' },
            testType: { type: 'string', enum: ['TOPIC', 'MIXED', 'MENTAL_ARITHMETIC'] },
            timingType: { type: 'string', enum: ['TIMED', 'UNTIMED'] },
            timeLimit: { type: 'integer', nullable: true },
            studentId: { type: 'string', format: 'bigint' },
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
          },
        },
        TestExecution: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'bigint' },
            status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'] },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            score: { type: 'integer', nullable: true },
            testData: {
              type: 'object',
              properties: {
                questions: { type: 'array', items: { type: 'object' } },
                responses: { type: 'array', items: { type: 'object' } },
                timing: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);