/**
 * Unit Tests for Encryption Service
 * 
 * Comprehensive test suite covering military-grade encryption functionality,
 * key derivation, credential protection, and security validation.
 * 
 * Requirements: 17.1, 17.3, 17.6 - Unit tests for security and encryption functions
 */

import { EncryptionService, EncryptedData } from '../encryption-service';
import { randomBytes } from 'crypto';

// Mock logger to prevent console output during tests
jest.mock('@/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testMasterKey = randomBytes(32).toString('hex'); // 64 hex characters

  beforeEach(() => {
    // Set up test environment with master key
    process.env.MASTER_ENCRYPTION_KEY = testMasterKey;
    encryptionService = new EncryptionService();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.MASTER_ENCRYPTION_KEY;
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid master key', () => {
      expect(() => new EncryptionService()).not.toThrow();
      
      const status = encryptionService.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.algorithm).toBe('aes-256-gcm');
    });

    it('should throw error when master key is not set', () => {
      delete process.env.MASTER_ENCRYPTION_KEY;
      
      expect(() => new EncryptionService()).toThrow('MASTER_ENCRYPTION_KEY environment variable not set');
    });

    it('should throw error when master key is too short', () => {
      process.env.MASTER_ENCRYPTION_KEY = 'short_key'; // Less than 64 hex characters
      
      expect(() => new EncryptionService()).toThrow('Master encryption key must be at least 32 bytes');
    });

    it('should throw error when master key is invalid hex', () => {
      process.env.MASTER_ENCRYPTION_KEY = 'invalid_hex_key_that_is_long_enough_but_not_valid_hex_characters_xyz';
      
      expect(() => new EncryptionService()).toThrow();
    });
  });

  describe('encryptData', () => {
    const testData = 'This is sensitive trading data that needs protection';

    it('should encrypt data successfully with default parameters', async () => {
      const encrypted = await encryptionService.encryptData(testData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.timestamp).toBeGreaterThan(0);
      
      // Verify base64 encoding
      expect(() => Buffer.from(encrypted.encryptedData, 'base64')).not.toThrow();
      expect(() => Buffer.from(encrypted.iv, 'base64')).not.toThrow();
      expect(() => Buffer.from(encrypted.authTag, 'base64')).not.toThrow();
      expect(() => Buffer.from(encrypted.salt, 'base64')).not.toThrow();
    });

    it('should encrypt data with custom password', async () => {
      const customPassword = 'my_custom_password_123';
      const encrypted = await encryptionService.encryptData(testData, customPassword);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
    });

    it('should encrypt data with custom key derivation parameters', async () => {
      const customParams = {
        iterations: 200000,
        saltLength: 64,
        keyLength: 32,
        hashAlgorithm: 'sha256'
      };
      
      const encrypted = await encryptionService.encryptData(testData, undefined, customParams);
      
      expect(encrypted).toBeDefined();
      expect(Buffer.from(encrypted.salt, 'base64')).toHaveLength(64); // Custom salt length
    });

    it('should produce different encrypted data for same input', async () => {
      const encrypted1 = await encryptionService.encryptData(testData);
      const encrypted2 = await encryptionService.encryptData(testData);
      
      // Should be different due to random IV and salt
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should handle empty string', async () => {
      const encrypted = await encryptionService.encryptData('');
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
    });

    it('should handle very long data', async () => {
      const longData = 'A'.repeat(10000); // 10KB of data
      const encrypted = await encryptionService.encryptData(longData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
    });

    it('should handle special characters and unicode', async () => {
      const specialData = '🔐💰📈 Special chars: àáâãäå ñ ç €£¥ 中文 العربية';
      const encrypted = await encryptionService.encryptData(specialData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
    });
  });

  describe('decryptData', () => {
    const testData = 'This is sensitive trading data that needs protection';

    it('should decrypt data successfully', async () => {
      const encrypted = await encryptionService.encryptData(testData);
      const decrypted = await encryptionService.decryptData(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should decrypt data with custom password', async () => {
      const customPassword = 'my_custom_password_123';
      const encrypted = await encryptionService.encryptData(testData, customPassword);
      const decrypted = await encryptionService.decryptData(encrypted, customPassword);
      
      expect(decrypted).toBe(testData);
    });

    it('should fail to decrypt with wrong password', async () => {
      const correctPassword = 'correct_password';
      const wrongPassword = 'wrong_password';
      
      const encrypted = await encryptionService.encryptData(testData, correctPassword);
      
      await expect(encryptionService.decryptData(encrypted, wrongPassword))
        .rejects.toThrow('Failed to decrypt data');
    });

    it('should fail to decrypt tampered data', async () => {
      const encrypted = await encryptionService.encryptData(testData);
      
      // Tamper with encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.slice(0, -4) + 'XXXX' // Change last 4 characters
      };
      
      await expect(encryptionService.decryptData(tamperedEncrypted))
        .rejects.toThrow('Failed to decrypt data');
    });

    it('should fail to decrypt with tampered auth tag', async () => {
      const encrypted = await encryptionService.encryptData(testData);
      
      // Tamper with auth tag
      const tamperedEncrypted = {
        ...encrypted,
        authTag: encrypted.authTag.slice(0, -4) + 'XXXX'
      };
      
      await expect(encryptionService.decryptData(tamperedEncrypted))
        .rejects.toThrow('Failed to decrypt data');
    });

    it('should fail to decrypt with invalid encrypted data structure', async () => {
      const invalidEncrypted = {
        encryptedData: 'invalid',
        iv: 'invalid',
        authTag: 'invalid',
        salt: 'invalid',
        algorithm: 'aes-256-gcm',
        timestamp: Date.now()
      } as EncryptedData;
      
      await expect(encryptionService.decryptData(invalidEncrypted))
        .rejects.toThrow();
    });

    it('should handle empty string decryption', async () => {
      const encrypted = await encryptionService.encryptData('');
      const decrypted = await encryptionService.decryptData(encrypted);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters and unicode decryption', async () => {
      const specialData = '🔐💰📈 Special chars: àáâãäå ñ ç €£¥ 中文 العربية';
      const encrypted = await encryptionService.encryptData(specialData);
      const decrypted = await encryptionService.decryptData(encrypted);
      
      expect(decrypted).toBe(specialData);
    });
  });

  describe('encryptCredentials', () => {
    const testCredentials = {
      apiKey: 'test_api_key_12345',
      secretKey: 'test_secret_key_67890',
      passphrase: 'test_passphrase'
    };

    it('should encrypt credentials successfully', async () => {
      const encrypted = await encryptionService.encryptCredentials(testCredentials);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      
      // Should use enhanced security parameters
      expect(Buffer.from(encrypted.salt, 'base64')).toHaveLength(64); // Larger salt
    });

    it('should handle empty credentials object', async () => {
      const encrypted = await encryptionService.encryptCredentials({});
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
    });

    it('should handle credentials with special characters', async () => {
      const specialCredentials = {
        apiKey: 'key_with_special_chars_!@#$%^&*()',
        secretKey: 'secret_with_unicode_🔐💰',
        passphrase: 'passphrase with spaces and symbols'
      };
      
      const encrypted = await encryptionService.encryptCredentials(specialCredentials);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
    });
  });

  describe('decryptCredentials', () => {
    const testCredentials = {
      apiKey: 'test_api_key_12345',
      secretKey: 'test_secret_key_67890',
      passphrase: 'test_passphrase'
    };

    it('should decrypt credentials successfully', async () => {
      const encrypted = await encryptionService.encryptCredentials(testCredentials);
      const decrypted = await encryptionService.decryptCredentials(encrypted);
      
      expect(decrypted).toEqual(testCredentials);
    });

    it('should verify credential integrity', async () => {
      const encrypted = await encryptionService.encryptCredentials(testCredentials);
      
      // Decrypt and verify
      const decrypted = await encryptionService.decryptCredentials(encrypted);
      expect(decrypted).toEqual(testCredentials);
    });

    it('should fail with tampered credentials', async () => {
      const encrypted = await encryptionService.encryptCredentials(testCredentials);
      
      // Tamper with encrypted credentials
      const tamperedEncrypted = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.slice(0, -8) + 'XXXXXXXX'
      };
      
      await expect(encryptionService.decryptCredentials(tamperedEncrypted))
        .rejects.toThrow('Credential decryption failed');
    });

    it('should handle empty credentials decryption', async () => {
      const encrypted = await encryptionService.encryptCredentials({});
      const decrypted = await encryptionService.decryptCredentials(encrypted);
      
      expect(decrypted).toEqual({});
    });
  });

  describe('generateSecureKey', () => {
    it('should generate secure key with default length', () => {
      const key = encryptionService.generateSecureKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true); // Valid hex
    });

    it('should generate secure key with custom length', () => {
      const key = encryptionService.generateSecureKey(16);
      
      expect(key).toBeDefined();
      expect(key).toHaveLength(32); // 16 bytes = 32 hex characters
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = encryptionService.generateSecureKey();
      const key2 = encryptionService.generateSecureKey();
      
      expect(key1).not.toBe(key2);
    });

    it('should handle zero length gracefully', () => {
      const key = encryptionService.generateSecureKey(0);
      
      expect(key).toBe('');
    });

    it('should handle large key lengths', () => {
      const key = encryptionService.generateSecureKey(128); // 1024-bit key
      
      expect(key).toHaveLength(256); // 128 bytes = 256 hex characters
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
    });
  });

  describe('secureClear', () => {
    it('should clear buffer contents', () => {
      const buffer = Buffer.from('sensitive data');
      const originalData = buffer.toString();
      
      encryptionService.secureClear(buffer);
      
      expect(buffer.toString()).not.toBe(originalData);
      expect(buffer.every(byte => byte === 0)).toBe(true);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0);
      
      expect(() => encryptionService.secureClear(buffer)).not.toThrow();
    });

    it('should handle null buffer gracefully', () => {
      expect(() => encryptionService.secureClear(null as any)).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', () => {
      const status = encryptionService.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.algorithm).toBe('aes-256-gcm');
      expect(status.keyDerivationParams).toBeDefined();
      expect(status.keyDerivationParams.iterations).toBe(100000);
      expect(status.keyDerivationParams.saltLength).toBe(32);
      expect(status.keyDerivationParams.keyLength).toBe(32);
      expect(status.keyDerivationParams.hashAlgorithm).toBe('sha256');
      expect(status.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    it('should reject encrypted data with missing fields', async () => {
      const incompleteEncrypted = {
        encryptedData: 'test',
        iv: 'test',
        // Missing authTag, salt, algorithm, timestamp
      } as EncryptedData;
      
      await expect(encryptionService.decryptData(incompleteEncrypted))
        .rejects.toThrow('Invalid encrypted data');
    });

    it('should reject encrypted data with unsupported algorithm', async () => {
      const encrypted = await encryptionService.encryptData('test');
      const invalidEncrypted = {
        ...encrypted,
        algorithm: 'unsupported-algorithm'
      };
      
      await expect(encryptionService.decryptData(invalidEncrypted))
        .rejects.toThrow('Unsupported encryption algorithm');
    });

    it('should reject encrypted data with future timestamp', async () => {
      const encrypted = await encryptionService.encryptData('test');
      const futureEncrypted = {
        ...encrypted,
        timestamp: Date.now() + 120000 // 2 minutes in future
      };
      
      await expect(encryptionService.decryptData(futureEncrypted))
        .rejects.toThrow('Encrypted data timestamp is in the future');
    });

    it('should reject encrypted data that is too old', async () => {
      const encrypted = await encryptionService.encryptData('test');
      const oldEncrypted = {
        ...encrypted,
        timestamp: Date.now() - (366 * 24 * 60 * 60 * 1000) // Over 1 year old
      };
      
      await expect(encryptionService.decryptData(oldEncrypted))
        .rejects.toThrow('Encrypted data is too old');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large data efficiently', async () => {
      const largeData = 'A'.repeat(100000); // 100KB
      
      const startTime = Date.now();
      const encrypted = await encryptionService.encryptData(largeData);
      const decrypted = await encryptionService.decryptData(encrypted);
      const endTime = Date.now();
      
      expect(decrypted).toBe(largeData);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent encryption operations', async () => {
      const testData = 'concurrent test data';
      const promises = [];
      
      // Start 10 concurrent encryption operations
      for (let i = 0; i < 10; i++) {
        promises.push(encryptionService.encryptData(`${testData} ${i}`));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.encryptedData).toBeDefined();
      });
    });

    it('should maintain consistency across encrypt/decrypt cycles', async () => {
      const testData = 'consistency test data';
      
      // Perform multiple encrypt/decrypt cycles
      let currentData = testData;
      for (let i = 0; i < 5; i++) {
        const encrypted = await encryptionService.encryptData(currentData);
        currentData = await encryptionService.decryptData(encrypted);
      }
      
      expect(currentData).toBe(testData);
    });

    it('should handle binary data correctly', async () => {
      const binaryData = Buffer.from([0, 1, 2, 3, 255, 254, 253]).toString('base64');
      
      const encrypted = await encryptionService.encryptData(binaryData);
      const decrypted = await encryptionService.decryptData(encrypted);
      
      expect(decrypted).toBe(binaryData);
    });
  });
});
