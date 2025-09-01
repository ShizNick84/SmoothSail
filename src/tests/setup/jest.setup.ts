/**
 * Jest setup file for AI Crypto Trading Agent tests
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test timeout
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.GATE_IO_API_KEY = 'test-api-key';
process.env.GATE_IO_SECRET_KEY = 'test-secret-key';
process.env.MASTER_ENCRYPTION_KEY = 'test_master_encryption_key_for_testing_purposes_64_chars_minimum_length';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_purposes_128_chars_minimum_length_required_for_security';
process.env.LOG_LEVEL = 'error';

// Mock external dependencies that cause issues in tests
jest.mock('../../security/encryption-service', () => ({
  EncryptionService: jest.fn().mockImplementation(() => ({
    initializeMasterKey: jest.fn(),
    encryptData: jest.fn().mockResolvedValue('encrypted_data'),
    decryptData: jest.fn().mockResolvedValue('decrypted_data'),
    generateKey: jest.fn().mockReturnValue('generated_key'),
    rotateKeys: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../security/audit-service', () => ({
  AuditService: jest.fn().mockImplementation(() => ({
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
    logTradeEvent: jest.fn().mockResolvedValue(undefined),
    logSystemEvent: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));