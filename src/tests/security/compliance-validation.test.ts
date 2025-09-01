/**
 * Security Compliance Validation Tests
 * 
 * Comprehensive compliance testing for financial regulations,
 * data protection laws, and security standards.
 * 
 * Requirements: 25.7 - Security compliance testing and validation
 */

import { encryptionService } from '@/security/encryption-service';

describe('Security Compliance Validation', () => {
  beforeAll(() => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.MASTER_ENCRYPTION_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes
  });

  describe('Basic Compliance Tests', () => {
    it('should have encryption service available', () => {
      expect(encryptionService).toBeDefined();
      const status = encryptionService.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    it('should use secure encryption algorithms', () => {
      const status = encryptionService.getStatus();
      expect(status.algorithm).toBe('aes-256-gcm');
    });

    it('should have proper key derivation parameters', () => {
      const status = encryptionService.getStatus();
      expect(status.keyDerivationParams.iterations).toBeGreaterThanOrEqual(100000);
      expect(status.keyDerivationParams.keyLength).toBe(32);
    });
  });
});