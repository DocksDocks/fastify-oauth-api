import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const prettyPrint = process.env.LOG_PRETTY_PRINT === 'true';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    !isProduction && prettyPrint
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'accessToken', 'refreshToken'],
    remove: true,
  },
});

export default logger;
