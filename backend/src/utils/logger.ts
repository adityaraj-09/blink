import * as winston from 'winston';
import * as path from 'path';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  })
);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Create the logger
const logger = winston.createLogger({
  levels,
  format: logFormat,
  transports: [
    // Console transport - for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // File transport - write all logs to backend.log
    new winston.transports.File({
      filename: path.join(__dirname, '../../backend.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    // Separate error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// If we're not in production, also log to the console with more verbosity
if (process.env.NODE_ENV !== 'production') {
  logger.level = 'debug';
} else {
  logger.level = 'info';
}

// Create convenience methods that match console.log interface
export const log = {
  error: (message: string, ...meta: any[]) => logger.error(message, ...meta),
  warn: (message: string, ...meta: any[]) => logger.warn(message, ...meta),
  info: (message: string, ...meta: any[]) => logger.info(message, ...meta),
  http: (message: string, ...meta: any[]) => logger.http(message, ...meta),
  debug: (message: string, ...meta: any[]) => logger.debug(message, ...meta),
};

export default logger;
