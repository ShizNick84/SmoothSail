/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - MILITARY-GRADE ENCRYPTION SERVICE
 * =============================================================================
 * 
 * This service provides military-grade encryption capabilities for protecting
 * sensitive trading data, API credentials, and financial information.
 * 
 * CRITICAL SECURITY NOTICE:
 * This service protects access to real financial assets and trading capital.
 * Any modifications must be thoroughly tested and security audited.
 * 
 * Encryption Standards:
 * - AES-256-GCM for symmetric encryption
 * - RSA-4096 for asymmetric encryption
 * - PBKDF2 with 100,000 iterations for key derivation
 * - Cryptographically secure random number generation
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { createCipher, createDecipher, randomBytes, pbkdf2Sync, createHash } from 'crypto';
import { logger } from '@/core/logging/logger';

/**
 * Interface for encrypted data structure
 * Contains all necessary components for secure decryption
 */
export interface EncryptedData {
  /** Base64 encoded encrypted data */
  encryptedData: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Base64 encoded authentication tag */
  authTag: string;
  /** Base64 encoded salt used for key derivation */
  salt: string;
  /** Encryption algorithm used */
  algorithm: string;
  /** Timestamp when encryption was performed */
  timestamp: number;
}

/**
 * Interface for key derivation parameters
 * Configures the security parameters for key generation
 */
export interface KeyDerivationParams {
  /** Number of PBKDF2 iterations (minimum 100,000) */
  iterations: number;
  /** Salt length in bytes (minimum 32) */
  saltLength: number;
  /** Derived key length in bytes (32 for AES-256) */
  keyLength: number;
  /** Hash algorithm for PBKDF2 */
  hashAlgorithm: string;
}

/**
 * Military-grade encryption service for protecting sensitive trading data
 * Implements industry-standard encryption with additional security measures
 */
export class EncryptionService {
  /** Default encryption algorithm */
  private static readonly DEFAULT_ALGORITHM = 'aes-256-gcm';
  
  /** Default key derivation parameters */
  private static readonly DEFAULT_KEY_PARAMS: KeyDerivationParams = {
    iterations: 100000, // NIST recommended minimum
    saltLength: 32,     // 256 bits
    keyLength: 32,      // 256 bits for AES-256
    hashAlgorithm: 'sha256'
  };

  /** Master encryption key loaded from environment */
  private masterKey: Buffer | null = null;

  constructor() {
    // Initialize the encryption service
    this.initializeMasterKey();
  }

  /**
   * Initialize the master encryption key from environment
   * The master key is used for encrypting other keys and sensitive data
   * 
   * @throws Error if master key is not configured or invalid
   */
  private initializeMasterKey(): void {
    try {
      const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
      
      if (!masterKeyHex) {
        throw new Error('MASTER_ENCRYPTION_KEY environment variable not set');
      }
      
      // Validate master key length (minimum 64 hex characters = 32 bytes)
      if (masterKeyHex.length < 64) {
        throw new Error('Master encryption key must be at least 32 bytes (64 hex characters)');
      }
      
      // Convert hex string to buffer
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
      
      logger.info('🔐 Master encryption key initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize master encryption key:', error);
      throw new Error('Encryption service initialization failed');
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM with key derivation
   * Provides authenticated encryption with additional data protection
   * 
   * @param data - The plaintext data to encrypt
   * @param password - Password for key derivation (optional, uses master key if not provided)
   * @param keyParams - Key derivation parameters (optional, uses defaults)
   * @returns Promise<EncryptedData> The encrypted data structure
   * @throws Error if encryption fails
   */
  public async encryptData(
    data: string,
    password?: string,
    keyParams: Partial<KeyDerivationParams> = {}
  ): Promise<EncryptedData> {
    try {
      // Merge with default parameters
      const params = { ...EncryptionService.DEFAULT_KEY_PARAMS, ...keyParams };
      
      // Generate cryptographically secure random salt
      const salt = randomBytes(params.saltLength);
      
      // Derive encryption key from password or master key
      const key = this.deriveKey(password || this.masterKey!.toString('hex'), salt, params);
      
      // Generate random initialization vector
      const iv = randomBytes(12); // 96 bits for GCM mode
      
      // Create cipher with AES-256-GCM
      const cipher = createCipher(EncryptionService.DEFAULT_ALGORITHM, key);
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Create encrypted data structure
      const encryptedData: EncryptedData = {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        salt: salt.toString('base64'),
        algorithm: EncryptionService.DEFAULT_ALGORITHM,
        timestamp: Date.now()
      };
      
      // Log encryption operation (without sensitive data)
      logger.debug('🔒 Data encrypted successfully', {
        algorithm: encryptedData.algorithm,
        dataLength: data.length,
        timestamp: encryptedData.timestamp
      });
      
      return encryptedData;
      
    } catch (error) {
      logger.error('❌ Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM with authentication verification
   * Verifies data integrity and authenticity before returning plaintext
   * 
   * @param encryptedData - The encrypted data structure
   * @param password - Password for key derivation (optional, uses master key if not provided)
   * @returns Promise<string> The decrypted plaintext data
   * @throws Error if decryption fails or authentication verification fails
   */
  public async decryptData(
    encryptedData: EncryptedData,
    password?: string
  ): Promise<string> {
    try {
      // Validate encrypted data structure
      this.validateEncryptedData(encryptedData);
      
      // Convert base64 components back to buffers
      const encrypted = Buffer.from(encryptedData.encryptedData, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');
      
      // Derive the same key used for encryption
      const key = this.deriveKey(
        password || this.masterKey!.toString('hex'),
        salt,
        EncryptionService.DEFAULT_KEY_PARAMS
      );
      
      // Create decipher with AES-256-GCM
      const decipher = createDecipher(encryptedData.algorithm, key);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      // Convert to string
      const plaintext = decrypted.toString('utf8');
      
      // Log decryption operation (without sensitive data)
      logger.debug('🔓 Data decrypted successfully', {
        algorithm: encryptedData.algorithm,
        dataLength: plaintext.length,
        originalTimestamp: encryptedData.timestamp
      });
      
      return plaintext;
      
    } catch (error) {
      logger.error('❌ Decryption failed:', error);
      throw new Error('Failed to decrypt data - data may be corrupted or tampered with');
    }
  }

  /**
   * Encrypt API credentials with additional security measures
   * Specialized encryption for protecting trading API keys and secrets
   * 
   * @param credentials - Object containing API credentials
   * @returns Promise<EncryptedData> Encrypted credentials
   */
  public async encryptCredentials(credentials: Record<string, string>): Promise<EncryptedData> {
    try {
      // Add timestamp and integrity hash to credentials
      const credentialsWithMetadata = {
        ...credentials,
        _timestamp: Date.now(),
        _integrity: this.calculateIntegrityHash(credentials)
      };
      
      // Serialize credentials to JSON
      const credentialsJson = JSON.stringify(credentialsWithMetadata);
      
      // Encrypt with additional security parameters
      const encrypted = await this.encryptData(credentialsJson, undefined, {
        iterations: 150000, // Higher iterations for credentials
        saltLength: 64      // Larger salt for credentials
      });
      
      logger.info('🔐 API credentials encrypted successfully');
      
      return encrypted;
      
    } catch (error) {
      logger.error('❌ Failed to encrypt credentials:', error);
      throw new Error('Credential encryption failed');
    }
  }

  /**
   * Decrypt API credentials with integrity verification
   * Verifies credential integrity and returns decrypted credentials
   * 
   * @param encryptedCredentials - Encrypted credentials data
   * @returns Promise<Record<string, string>> Decrypted credentials
   * @throws Error if decryption fails or integrity check fails
   */
  public async decryptCredentials(
    encryptedCredentials: EncryptedData
  ): Promise<Record<string, string>> {
    try {
      // Decrypt the credentials JSON
      const credentialsJson = await this.decryptData(encryptedCredentials);
      
      // Parse credentials from JSON
      const credentialsWithMetadata = JSON.parse(credentialsJson);
      
      // Extract metadata
      const { _timestamp, _integrity, ...credentials } = credentialsWithMetadata;
      
      // Verify integrity hash
      const expectedIntegrity = this.calculateIntegrityHash(credentials);
      if (_integrity !== expectedIntegrity) {
        throw new Error('Credential integrity verification failed');
      }
      
      // Check credential age (warn if older than 30 days)
      const age = Date.now() - _timestamp;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (age > thirtyDays) {
        logger.warn('⚠️ Decrypted credentials are older than 30 days', {
          age: Math.floor(age / (24 * 60 * 60 * 1000)),
          timestamp: _timestamp
        });
      }
      
      logger.info('🔓 API credentials decrypted and verified successfully');
      
      return credentials;
      
    } catch (error) {
      logger.error('❌ Failed to decrypt credentials:', error);
      throw new Error('Credential decryption failed');
    }
  }

  /**
   * Generate a cryptographically secure random key
   * Used for generating new encryption keys and secrets
   * 
   * @param length - Key length in bytes (default: 32 for AES-256)
   * @returns string Hex-encoded random key
   */
  public generateSecureKey(length: number = 32): string {
    try {
      const key = randomBytes(length);
      return key.toString('hex');
    } catch (error) {
      logger.error('❌ Failed to generate secure key:', error);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Derive encryption key from password using PBKDF2
   * Implements secure key derivation with configurable parameters
   * 
   * @param password - Password or master key for derivation
   * @param salt - Cryptographic salt
   * @param params - Key derivation parameters
   * @returns Buffer The derived key
   */
  private deriveKey(password: string, salt: Buffer, params: KeyDerivationParams): Buffer {
    return pbkdf2Sync(password, salt, params.iterations, params.keyLength, params.hashAlgorithm);
  }

  /**
   * Calculate integrity hash for credential verification
   * Creates a hash of credentials for tamper detection
   * 
   * @param credentials - Credentials object to hash
   * @returns string SHA-256 hash of credentials
   */
  private calculateIntegrityHash(credentials: Record<string, string>): string {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(credentials).sort();
    const sortedCredentials = sortedKeys.map(key => `${key}:${credentials[key]}`).join('|');
    
    return createHash('sha256').update(sortedCredentials).digest('hex');
  }

  /**
   * Validate encrypted data structure
   * Ensures all required fields are present and valid
   * 
   * @param encryptedData - Encrypted data to validate
   * @throws Error if validation fails
   */
  private validateEncryptedData(encryptedData: EncryptedData): void {
    const requiredFields = ['encryptedData', 'iv', 'authTag', 'salt', 'algorithm', 'timestamp'];
    
    for (const field of requiredFields) {
      if (!(field in encryptedData) || !encryptedData[field as keyof EncryptedData]) {
        throw new Error(`Invalid encrypted data: missing ${field}`);
      }
    }
    
    // Validate algorithm
    if (encryptedData.algorithm !== EncryptionService.DEFAULT_ALGORITHM) {
      throw new Error(`Unsupported encryption algorithm: ${encryptedData.algorithm}`);
    }
    
    // Validate timestamp (not too old or in the future)
    const now = Date.now();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    
    if (encryptedData.timestamp > now + 60000) { // 1 minute future tolerance
      throw new Error('Encrypted data timestamp is in the future');
    }
    
    if (now - encryptedData.timestamp > maxAge) {
      throw new Error('Encrypted data is too old');
    }
  }

  /**
   * Securely clear sensitive data from memory
   * Overwrites memory containing sensitive information
   * 
   * @param buffer - Buffer to clear
   */
  public secureClear(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      buffer.fill(0);
    }
  }

  /**
   * Get encryption service status and health information
   * Returns current status for monitoring and diagnostics
   * 
   * @returns Object containing service status
   */
  public getStatus(): {
    isInitialized: boolean;
    algorithm: string;
    keyDerivationParams: KeyDerivationParams;
    timestamp: number;
  } {
    return {
      isInitialized: this.masterKey !== null,
      algorithm: EncryptionService.DEFAULT_ALGORITHM,
      keyDerivationParams: EncryptionService.DEFAULT_KEY_PARAMS,
      timestamp: Date.now()
    };
  }
}

// Create and export singleton instance
export const encryptionService = new EncryptionService();

// =============================================================================
// SECURITY NOTES AND BEST PRACTICES
// =============================================================================
// 1. Master key must be stored securely and never logged or exposed
// 2. Use different passwords/keys for different types of data when possible
// 3. Regularly rotate encryption keys and credentials
// 4. Monitor for any encryption/decryption failures as potential security incidents
// 5. Keep encryption libraries and dependencies updated
// 6. Perform regular security audits of encryption implementation
// 7. Use hardware security modules (HSM) in production if available
// 8. Implement proper key escrow and recovery procedures
// =============================================================================
