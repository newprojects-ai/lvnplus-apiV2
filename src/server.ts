import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import authRoutes from './routes/auth.routes';
import templateRoutes from './routes/template.routes';
import testRoutes from './routes/test.routes';
import topicRoutes from './routes/topic.routes';
import subjectRoutes from './routes/subject.routes';
import subtopicRoutes from './routes/subtopic.routes';
import testPlanRoutes from './routes/testPlan.routes';
import executionRoutes from './routes/execution.routes';
import questionRoutes from './routes/question.routes';

config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api', subtopicRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/test-plans', testPlanRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/questions', questionRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`API Documentation available at http://localhost:${port}/api-docs`);
});