import { promises as fs } from 'fs';
import { resolve } from 'path';
import { Logger } from '../core/logging/logger';

/**
 * Tunnel Configuration Validation Result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Validated configuration */
  validatedConfig?: TunnelConfigInput;
}

/**
 * Input configuration for tunnel validation
 */
export interface TunnelConfigInput {
  oracleIP?: string;
  sshPort?: number;
  username?: string;
  privateKeyPath?: string;
  localPort?: number;
  remotePort?: number;
  keepAlive?: boolean;
  compression?: boolean;
  connectionTimeout?: number;
  serverAliveInterval?: number;
  serverAliveCountMax?: number;
}

/**
 * Tunnel Configuration Validator
 * Validates SSH tunnel configuration parameters and ensures system readiness
 */
export class TunnelConfigValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate complete tunnel configuration
   * Performs comprehensive validation of all tunnel parameters
   * 
   * @param config - Configuration to validate
   * @returns Validation result with errors and warnings
   */
  async validateConfiguration(config: TunnelConfigInput): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Validate required fields
      this.validateRequiredFields(config, result);
      
      // Validate Oracle IP address
      this.validateOracleIP(config.oracleIP, result);
      
      // Validate ports
      this.validatePorts(config, result);
      
      // Validate SSH configuration
      await this.validateSSHConfiguration(config, result);
      
      // Validate private key
      if (config.privateKeyPath) {
        await this.validatePrivateKey(config.privateKeyPath, result);
      }
      
      // Validate timeout settings
      this.validateTimeoutSettings(config, result);
      
      // Set final validation status
      result.isValid = result.errors.length === 0;
      
      if (result.isValid) {
        result.validatedConfig = this.normalizeConfiguration(config);
      }

      this.logger.info('Tunnel configuration validation completed', {
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.error('Tunnel configuration validation failed', error);
    }

    return result;
  }

  /**
   * Validate required configuration fields
   * 
   * @param config - Configuration to validate
   * @param result - Validation result to update
   */
  private validateRequiredFields(config: TunnelConfigInput, result: ValidationResult): void {
    const requiredFields: (keyof TunnelConfigInput)[] = [
      'oracleIP',
      'username',
      'privateKeyPath',
      'localPort',
      'remotePort'
    ];

    for (const field of requiredFields) {
      if (!config[field]) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate Oracle Free Tier IP address
   * 
   * @param oracleIP - IP address to validate
   * @param result - Validation result to update
   */
  private validateOracleIP(oracleIP: string | undefined, result: ValidationResult): void {
    if (!oracleIP) return;

    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ipRegex.test(oracleIP)) {
      result.errors.push(`Invalid IP address format: ${oracleIP}`);
      return;
    }

    // Check if it's the expected Oracle Free Tier IP
    const expectedOracleIP = '168.138.104.117';
    if (oracleIP !== expectedOracleIP) {
      result.warnings.push(`IP address ${oracleIP} differs from expected Oracle Free Tier IP: ${expectedOracleIP}`);
    }

    // Validate it's not a private/local IP
    if (this.isPrivateIP(oracleIP)) {
      result.warnings.push(`IP address ${oracleIP} appears to be a private IP address`);
    }
  }

  /**
   * Validate port configurations
   * 
   * @param config - Configuration to validate
   * @param result - Validation result to update
   */
  private validatePorts(config: TunnelConfigInput, result: ValidationResult): void {
    // Validate SSH port
    if (config.sshPort !== undefined) {
      if (!this.isValidPort(config.sshPort)) {
        result.errors.push(`Invalid SSH port: ${config.sshPort}`);
      } else if (config.sshPort !== 22) {
        result.warnings.push(`Non-standard SSH port: ${config.sshPort}`);
      }
    }

    // Validate local port
    if (config.localPort !== undefined) {
      if (!this.isValidPort(config.localPort)) {
        result.errors.push(`Invalid local port: ${config.localPort}`);
      } else if (config.localPort < 1024) {
        result.warnings.push(`Local port ${config.localPort} requires elevated privileges`);
      }
    }

    // Validate remote port
    if (config.remotePort !== undefined) {
      if (!this.isValidPort(config.remotePort)) {
        result.errors.push(`Invalid remote port: ${config.remotePort}`);
      }
    }

    // Check for port conflicts
    if (config.localPort && config.remotePort && config.localPort === config.remotePort) {
      result.warnings.push('Local and remote ports are the same, ensure this is intentional');
    }
  }

  /**
   * Validate SSH configuration parameters
   * 
   * @param config - Configuration to validate
   * @param result - Validation result to update
   */
  private async validateSSHConfiguration(config: TunnelConfigInput, result: ValidationResult): Promise<void> {
    // Validate username
    if (config.username) {
      if (!/^[a-zA-Z0-9_-]+$/.test(config.username)) {
        result.errors.push(`Invalid username format: ${config.username}`);
      }
    }

    // Check SSH client availability
    try {
      const { spawn } = await import('child_process');
      const sshCheck = spawn('ssh', ['-V'], { stdio: 'pipe' });
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sshCheck.kill();
          reject(new Error('SSH client check timeout'));
        }, 5000);

        sshCheck.on('exit', (code) => {
          clearTimeout(timeout);
          if (code === 0 || code === null) {
            resolve();
          } else {
            reject(new Error(`SSH client check failed with code: ${code}`));
          }
        });

        sshCheck.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      result.warnings.push(`SSH client availability check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate private key file
   * 
   * @param privateKeyPath - Path to private key file
   * @param result - Validation result to update
   */
  private async validatePrivateKey(privateKeyPath: string, result: ValidationResult): Promise<void> {
    try {
      // Resolve absolute path
      const absolutePath = resolve(privateKeyPath);
      
      // Check if file exists
      const stats = await fs.stat(absolutePath);
      
      if (!stats.isFile()) {
        result.errors.push(`Private key path is not a file: ${privateKeyPath}`);
        return;
      }

      // Check file permissions
      try {
        await fs.access(absolutePath, fs.constants.R_OK);
      } catch {
        result.errors.push(`Private key file is not readable: ${privateKeyPath}`);
        return;
      }

      // Check file size (should not be empty)
      if (stats.size === 0) {
        result.errors.push(`Private key file is empty: ${privateKeyPath}`);
        return;
      }

      // Validate key format
      const keyContent = await fs.readFile(absolutePath, 'utf8');
      if (!this.isValidPrivateKeyFormat(keyContent)) {
        result.errors.push(`Invalid private key format: ${privateKeyPath}`);
        return;
      }

      // Check file permissions (Unix-like systems)
      if (process.platform !== 'win32') {
        const mode = stats.mode & parseInt('777', 8);
        if (mode & parseInt('077', 8)) {
          result.warnings.push(`Private key file has overly permissive permissions: ${privateKeyPath}`);
        }
      }

    } catch (error) {
      result.errors.push(`Private key validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate timeout and connection settings
   * 
   * @param config - Configuration to validate
   * @param result - Validation result to update
   */
  private validateTimeoutSettings(config: TunnelConfigInput, result: ValidationResult): void {
    // Validate connection timeout
    if (config.connectionTimeout !== undefined) {
      if (config.connectionTimeout < 1 || config.connectionTimeout > 300) {
        result.errors.push(`Connection timeout must be between 1 and 300 seconds: ${config.connectionTimeout}`);
      } else if (config.connectionTimeout < 10) {
        result.warnings.push(`Connection timeout is very short: ${config.connectionTimeout}s`);
      }
    }

    // Validate server alive interval
    if (config.serverAliveInterval !== undefined) {
      if (config.serverAliveInterval < 1 || config.serverAliveInterval > 3600) {
        result.errors.push(`Server alive interval must be between 1 and 3600 seconds: ${config.serverAliveInterval}`);
      }
    }

    // Validate server alive count max
    if (config.serverAliveCountMax !== undefined) {
      if (config.serverAliveCountMax < 1 || config.serverAliveCountMax > 10) {
        result.errors.push(`Server alive count max must be between 1 and 10: ${config.serverAliveCountMax}`);
      }
    }
  }

  /**
   * Normalize configuration with defaults
   * 
   * @param config - Input configuration
   * @returns Normalized configuration
   */
  private normalizeConfiguration(config: TunnelConfigInput): TunnelConfigInput {
    return {
      oracleIP: config.oracleIP || '168.138.104.117',
      sshPort: config.sshPort || 22,
      username: config.username,
      privateKeyPath: config.privateKeyPath,
      localPort: config.localPort,
      remotePort: config.remotePort,
      keepAlive: config.keepAlive !== false, // Default to true
      compression: config.compression !== false, // Default to true
      connectionTimeout: config.connectionTimeout || 30,
      serverAliveInterval: config.serverAliveInterval || 60,
      serverAliveCountMax: config.serverAliveCountMax || 3
    };
  }

  /**
   * Check if IP address is private
   * 
   * @param ip - IP address to check
   * @returns True if private IP
   */
  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) return true;
    
    return false;
  }

  /**
   * Validate port number
   * 
   * @param port - Port number to validate
   * @returns True if valid port
   */
  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  /**
   * Validate private key format
   * 
   * @param keyContent - Private key content
   * @returns True if valid format
   */
  private isValidPrivateKeyFormat(keyContent: string): boolean {
    // Check for common private key headers
    const validHeaders = [
      '-----BEGIN RSA PRIVATE KEY-----',
      '-----BEGIN DSA PRIVATE KEY-----',
      '-----BEGIN EC PRIVATE KEY-----',
      '-----BEGIN OPENSSH PRIVATE KEY-----',
      '-----BEGIN PRIVATE KEY-----'
    ];

    return validHeaders.some(header => keyContent.includes(header));
  }
}
