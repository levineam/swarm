/**
 * Simple logger module for the Swarm Feed Generator
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

// Set the minimum log level (can be overridden by environment variables)
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG;

const MIN_LOG_LEVEL = 
  parseInt(process.env.LOG_LEVEL || '') || DEFAULT_LOG_LEVEL;

// Format the log timestamp
const formatTimestamp = () => {
  return new Date().toISOString();
}

// Format log message with metadata
const formatLog = (level: string, message: string, metadata?: Record<string, any>) => {
  const timestamp = formatTimestamp();
  const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
  return `[${timestamp}] [${level}] ${message}${metadataStr}`;
}

// The logger object with methods for each log level
export const logger = {
  debug: (message: string, metadata?: Record<string, any>) => {
    if (MIN_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(formatLog('DEBUG', message, metadata));
    }
  },
  
  info: (message: string, metadata?: Record<string, any>) => {
    if (MIN_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.info(formatLog('INFO', message, metadata));
    }
  },
  
  warn: (message: string, metadata?: Record<string, any>) => {
    if (MIN_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', message, metadata));
    }
  },
  
  error: (message: string, metadata?: Record<string, any>) => {
    if (MIN_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(formatLog('ERROR', message, metadata));
    }
  }
};

export default logger; 