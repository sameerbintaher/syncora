import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeSocket } from './config/socket';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const httpServer = http.createServer(app);
  initializeSocket(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`Syncora backend running on port ${PORT} [${process.env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    httpServer.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
