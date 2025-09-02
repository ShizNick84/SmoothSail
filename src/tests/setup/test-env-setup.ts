/**
 * Test Environment Setup
 * 
 * Sets up required environment variables for testing
 */

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.MASTER_ENCRYPTION_KEY = 'test_master_encryption_key_for_testing_purposes_64_chars_minimum_length';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_purposes_128_chars_minimum_length_required_for_security';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock external dependencies that aren't needed for unit tests
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
