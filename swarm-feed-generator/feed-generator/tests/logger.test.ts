import logger, { createChildLogger, getMemoryLogs, logError, logPerformance } from '../src/util/logger'

// Mock winston
jest.mock('winston', () => {
  const mockFormat = {
    combine: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    errors: jest.fn().mockReturnThis(),
    splat: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    colorize: jest.fn().mockReturnThis(),
    printf: jest.fn().mockReturnThis(),
  }
  
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
    add: jest.fn(),
  }
  
  return {
    format: mockFormat,
    createLogger: jest.fn().mockReturnValue(mockLogger),
    transports: {
      File: jest.fn(),
      Console: jest.fn(),
    },
    Transport: class MockTransport {
      constructor() {}
      on() {}
      emit() {}
    },
    __mockLogger: mockLogger,
  }
})

// Get the mocked winston logger
const mockWinston = jest.requireMock('winston')
const mockLogger = mockWinston.__mockLogger

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('logger', () => {
    it('should export a winston logger instance', () => {
      expect(logger).toBeDefined()
      expect(mockWinston.createLogger).toHaveBeenCalled()
    })
  })
  
  describe('createChildLogger', () => {
    it('should create a child logger with component context', () => {
      const childLogger = createChildLogger('test-component')
      
      expect(mockLogger.child).toHaveBeenCalledWith({ component: 'test-component' })
      expect(childLogger).toBeDefined()
    })
  })
  
  describe('logError', () => {
    it('should log errors with stack traces', () => {
      const error = new Error('Test error')
      logError('Error occurred', error)
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error occurred', {
        error: 'Test error',
        stack: error.stack,
      })
    })
  })
  
  describe('logPerformance', () => {
    it('should log performance metrics', () => {
      logPerformance('database-query', 150, { query: 'SELECT * FROM posts' })
      
      expect(mockLogger.info).toHaveBeenCalledWith('Performance: database-query', {
        operation: 'database-query',
        durationMs: 150,
        query: 'SELECT * FROM posts',
      })
    })
  })
  
  describe('getMemoryLogs', () => {
    it('should return an array of logs', () => {
      const logs = getMemoryLogs()
      
      expect(Array.isArray(logs)).toBe(true)
    })
  })
}) 