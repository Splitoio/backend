import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { userRouter } from './routes/user.routes';
import { groupRouter } from './routes/group.routes';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));


// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/groups', groupRouter);

app.use(errorHandler);


const PORT = parseInt(env.PORT);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});