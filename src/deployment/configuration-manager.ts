/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - CONFIGURATION MANAGEMENT
 * =============================================================================
 * 
 * This module handles configuration validation, environment setup, and
 * secure configuration management for production deployment.
 */

import { existsSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { logger } from '../core/logger';
import { EncryptionService } from '../security/encryption-service';

interface ConfigValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'json' | 'url' | 'email' | 'path';
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  description: string;
}

interface ConfigurationTemplate {
  category: string;
  rules: ConfigValidationRule[];
}

export class ConfigurationManager {
  private encryptionService: EncryptionService;
  private configPath: string;
  private backupPath: string;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.configPath = join(process.cwd(), '.env');
    this.backupPath = join(process.cwd(), 'backups', 'config');
  }

  /**
   * Validate all configuration settings
   */
  async validateConfiguration(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    logger.info('🔍 Validating configuration...');

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if .env file exists
      if (!existsSync(this.configPath)) {
        errors.push('.env file not found');
        return { valid: false, errors, warnings };
      }

      // Load environment variables
      const envContent = readFileSync(this.configPath, 'utf-8');
      const envVars = this.parseEnvFile(envContent);

      // Get validation templates
      const templates = this.getValidationTemplates();

      // Validate each category
      for (const template of templates) {
        const categoryResult = this.validateCategory(template, envVars);
        errors.push(...categoryResult.errors);
        warnings.push(...categoryResult.warnings);
      }

      // Additional security validations
      const securityResult = await this.validateSecurity(envVars);
      errors.push(...securityResult.errors);
      warnings.push(...securityResult.warnings);

      const valid = errors.length === 0;

      if (valid) {
        logger.info('✅ Configuration validation passed');
      } else {
        logger.error(`❌ Configuration validation failed with ${errors.length} errors`);
      }

      return { valid, errors, warnings };

    } catch (error) {
      logger.error('❌ Configuration validation error:', error);
      errors.push(`Validation error: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Create configuration from template
   */
  async createConfiguration(environment: 'development' | 'staging' | 'production'): Promise<void> {
    logger.info(`📝 Creating ${environment} configuration...`);

    const template = this.getConfigurationTemplate(environment);
    
    // Check if .env already exists
    if (existsSync(this.configPath)) {
      // Create backup
      await this.backupConfiguration();
    }

    // Write new configuration
    writeFileSync(this.configPath, template);
    chmodSync(this.configPath, 0o600); // Secure permissions

    logger.info(`✅ Configuration created for ${environment} environment`);
  }

  /**
   * Update configuration value
   */
  async updateConfiguration(key: string, value: string, encrypt: boolean = false): Promise<void> {
    logger.info(`🔧 Updating configuration: ${key}`);

    if (!existsSync(this.configPath)) {
      throw new Error('.env file not found');
    }

    let envContent = readFileSync(this.configPath, 'utf-8');
    const envVars = this.parseEnvFile(envContent);

    // Encrypt value if requested
    if (encrypt) {
      value = await this.encryptionService.encrypt(value);
    }

    // Update or add the key
    const keyPattern = new RegExp(`^${key}=.*$`, 'm');
    if (keyPattern.test(envContent)) {
      envContent = envContent.replace(keyPattern, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }

    // Write updated configuration
    writeFileSync(this.configPath, envContent);
    chmodSync(this.configPath, 0o600);

    logger.info(`✅ Configuration updated: ${key}`);
  }

  /**
   * Backup current configuration
   */
  async backupConfiguration(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(this.backupPath, `env-backup-${timestamp}.env`);

    if (!existsSync(this.backupPath)) {
      require('fs').mkdirSync(this.backupPath, { recursive: true });
    }

    if (existsSync(this.configPath)) {
      const content = readFileSync(this.configPath, 'utf-8');
      writeFileSync(backupFile, content);
      chmodSync(backupFile, 0o600);
      
      logger.info(`💾 Configuration backed up to: ${backupFile}`);
      return backupFile;
    }

    throw new Error('No configuration file to backup');
  }

  /**
   * Restore configuration from backup
   */
  async restoreConfiguration(backupFile: string): Promise<void> {
    if (!existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const content = readFileSync(backupFile, 'utf-8');
    writeFileSync(this.configPath, content);
    chmodSync(this.configPath, 0o600);

    logger.info(`📥 Configuration restored from: ${backupFile}`);
  }

  /**
   * Get validation templates for different configuration categories
   */
  private getValidationTemplates(): ConfigurationTemplate[] {
    return [
      {
        category: 'Environment',
        rules: [
          {
            key: 'NODE_ENV',
            required: true,
            type: 'string',
            pattern: /^(development|staging|production)$/,
            description: 'Application environment'
          },
          {
            key: 'PORT',
            required: true,
            type: 'number',
            description: 'Application port'
          },
          {
            key: 'LOG_LEVEL',
            required: true,
            type: 'string',
            pattern: /^(error|warn|info|debug)$/,
            description: 'Logging level'
          }
        ]
      },
      {
        category: 'Gate.io API',
        rules: [
          {
            key: 'GATEIO_API_KEY',
            required: true,
            type: 'string',
            minLength: 20,
            description: 'Gate.io API key'
          },
          {
            key: 'GATEIO_API_SECRET',
            required: true,
            type: 'string',
            minLength: 20,
            description: 'Gate.io API secret'
          },
          {
            key: 'GATEIO_API_URL',
            required: true,
            type: 'url',
            description: 'Gate.io API base URL'
          }
        ]
      },
      {
        category: 'Oracle SSH Tunnel',
        rules: [
          {
            key: 'ORACLE_HOST',
            required: true,
            type: 'string',
            pattern: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
            description: 'Oracle Free Tier IP address'
          },
          {
            key: 'ORACLE_USER',
            required: true,
            type: 'string',
            description: 'Oracle instance username'
          },
          {
            key: 'ORACLE_SSH_KEY_PATH',
            required: true,
            type: 'path',
            description: 'Path to Oracle SSH private key'
          },
          {
            key: 'ORACLE_SSH_PORT',
            required: false,
            type: 'number',
            description: 'Oracle SSH port (default: 22)'
          }
        ]
      },
      {
        category: 'Security',
        rules: [
          {
            key: 'JWT_SECRET',
            required: true,
            type: 'string',
            minLength: 32,
            description: 'JWT signing secret'
          },
          {
            key: 'ENCRYPTION_KEY',
            required: true,
            type: 'string',
            minLength: 32,
            description: 'Data encryption key'
          },
          {
            key: 'SESSION_SECRET',
            required: true,
            type: 'string',
            minLength: 32,
            description: 'Session encryption secret'
          }
        ]
      },
      {
        category: 'Notifications',
        rules: [
          {
            key: 'EMAIL_HOST',
            required: false,
            type: 'string',
            description: 'SMTP server host'
          },
          {
            key: 'EMAIL_PORT',
            required: false,
            type: 'number',
            description: 'SMTP server port'
          },
          {
            key: 'EMAIL_USER',
            required: false,
            type: 'email',
            description: 'SMTP username'
          },
          {
            key: 'EMAIL_PASS',
            required: false,
            type: 'string',
            description: 'SMTP password'
          },
          {
            key: 'TELEGRAM_BOT_TOKEN',
            required: false,
            type: 'string',
            description: 'Telegram bot token'
          },
          {
            key: 'TELEGRAM_CHAT_ID',
            required: false,
            type: 'string',
            description: 'Telegram chat ID'
          }
        ]
      },
      {
        category: 'Database',
        rules: [
          {
            key: 'DATABASE_PATH',
            required: false,
            type: 'path',
            description: 'SQLite database file path'
          },
          {
            key: 'DATABASE_BACKUP_INTERVAL',
            required: false,
            type: 'number',
            description: 'Database backup interval in hours'
          }
        ]
      }
    ];
  }

  /**
   * Validate a specific configuration category
   */
  private validateCategory(
    template: ConfigurationTemplate, 
    envVars: Record<string, string>
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of template.rules) {
      const value = envVars[rule.key];

      // Check if required value is present
      if (rule.required && (!value || value.trim() === '')) {
        errors.push(`${template.category}: ${rule.key} is required - ${rule.description}`);
        continue;
      }

      // Skip validation if value is not present and not required
      if (!value) {
        continue;
      }

      // Type validation
      const typeValidation = this.validateType(rule.key, value, rule.type);
      if (!typeValidation.valid) {
        errors.push(`${template.category}: ${rule.key} - ${typeValidation.error}`);
        continue;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${template.category}: ${rule.key} does not match required pattern`);
      }

      // Length validation
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${template.category}: ${rule.key} must be at least ${rule.minLength} characters`);
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${template.category}: ${rule.key} must be no more than ${rule.maxLength} characters`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate value type
   */
  private validateType(key: string, value: string, type: string): { valid: boolean; error?: string } {
    switch (type) {
      case 'number':
        if (isNaN(Number(value))) {
          return { valid: false, error: 'must be a valid number' };
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          return { valid: false, error: 'must be a boolean value (true/false)' };
        }
        break;

      case 'json':
        try {
          JSON.parse(value);
        } catch {
          return { valid: false, error: 'must be valid JSON' };
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return { valid: false, error: 'must be a valid URL' };
        }
        break;

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          return { valid: false, error: 'must be a valid email address' };
        }
        break;

      case 'path':
        if (!existsSync(value)) {
          return { valid: false, error: 'path does not exist' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Validate security-specific configurations
   */
  private async validateSecurity(envVars: Record<string, string>): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for weak secrets
    const secrets = ['JWT_SECRET', 'ENCRYPTION_KEY', 'SESSION_SECRET'];
    for (const secret of secrets) {
      const value = envVars[secret];
      if (value) {
        if (value.length < 32) {
          errors.push(`Security: ${secret} should be at least 32 characters for security`);
        }
        
        // Check for common weak patterns
        if (/^(password|secret|key|123|abc)/i.test(value)) {
          warnings.push(`Security: ${secret} appears to use a weak pattern`);
        }
      }
    }

    // Check SSH key permissions
    const sshKeyPath = envVars['ORACLE_SSH_KEY_PATH'];
    if (sshKeyPath && existsSync(sshKeyPath)) {
      try {
        const stats = require('fs').statSync(sshKeyPath);
        const permissions = (stats.mode & parseInt('777', 8)).toString(8);
        if (permissions !== '600') {
          warnings.push(`Security: SSH key ${sshKeyPath} should have 600 permissions (currently ${permissions})`);
        }
      } catch (error) {
        warnings.push(`Security: Could not check SSH key permissions: ${error.message}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Parse .env file content
   */
  private parseEnvFile(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          envVars[key.trim()] = value;
        }
      }
    }
    
    return envVars;
  }

  /**
   * Get configuration template for environment
   */
  private getConfigurationTemplate(environment: string): string {
    const templates = {
      development: `# AI Crypto Trading Agent - Development Configuration
# Generated on ${new Date().toISOString()}

# Environment
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Gate.io API (Development/Testnet)
GATEIO_API_KEY=your_development_api_key_here
GATEIO_API_SECRET=your_development_api_secret_here
GATEIO_API_URL=https://api.gateio.ws/api/v4

# Oracle Free Tier SSH Tunnel
ORACLE_HOST=168.138.104.117
ORACLE_USER=ubuntu
ORACLE_SSH_KEY_PATH=/home/user/.ssh/oracle_key
ORACLE_SSH_PORT=22

# Security (Generate strong secrets!)
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_here_minimum_32_characters
SESSION_SECRET=your_session_secret_here_minimum_32_characters

# Database
DATABASE_PATH=data/trading-dev.db
DATABASE_BACKUP_INTERVAL=24

# Notifications (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Trading Settings
TRADING_ENABLED=false
RISK_PER_TRADE=0.01
STOP_LOSS_PERCENTAGE=0.01
MIN_RISK_REWARD_RATIO=1.3

# AI Settings
SENTIMENT_WEIGHT=0.3
TECHNICAL_WEIGHT=0.7
`,

      staging: `# AI Crypto Trading Agent - Staging Configuration
# Generated on ${new Date().toISOString()}

# Environment
NODE_ENV=staging
PORT=3001
LOG_LEVEL=info

# Gate.io API (Staging)
GATEIO_API_KEY=your_staging_api_key_here
GATEIO_API_SECRET=your_staging_api_secret_here
GATEIO_API_URL=https://api.gateio.ws/api/v4

# Oracle Free Tier SSH Tunnel
ORACLE_HOST=168.138.104.117
ORACLE_USER=ubuntu
ORACLE_SSH_KEY_PATH=/opt/ai-crypto-trading/.ssh/oracle_key
ORACLE_SSH_PORT=22

# Security (Generate strong secrets!)
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_here_minimum_32_characters
SESSION_SECRET=your_session_secret_here_minimum_32_characters

# Database
DATABASE_PATH=data/trading-staging.db
DATABASE_BACKUP_INTERVAL=12

# Notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Trading Settings
TRADING_ENABLED=false
RISK_PER_TRADE=0.01
STOP_LOSS_PERCENTAGE=0.01
MIN_RISK_REWARD_RATIO=1.3

# AI Settings
SENTIMENT_WEIGHT=0.3
TECHNICAL_WEIGHT=0.7
`,

      production: `# AI Crypto Trading Agent - Production Configuration
# Generated on ${new Date().toISOString()}
# WARNING: This file contains sensitive information. Keep secure!

# Environment
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Gate.io API (Production)
GATEIO_API_KEY=your_production_api_key_here
GATEIO_API_SECRET=your_production_api_secret_here
GATEIO_API_URL=https://api.gateio.ws/api/v4

# Oracle Free Tier SSH Tunnel
ORACLE_HOST=168.138.104.117
ORACLE_USER=ubuntu
ORACLE_SSH_KEY_PATH=/opt/ai-crypto-trading/.ssh/oracle_key
ORACLE_SSH_PORT=22

# Security (MUST be strong secrets in production!)
JWT_SECRET=CHANGE_THIS_TO_STRONG_SECRET_MINIMUM_32_CHARS
ENCRYPTION_KEY=CHANGE_THIS_TO_STRONG_SECRET_MINIMUM_32_CHARS
SESSION_SECRET=CHANGE_THIS_TO_STRONG_SECRET_MINIMUM_32_CHARS

# Database
DATABASE_PATH=data/trading.db
DATABASE_BACKUP_INTERVAL=6

# Notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Trading Settings (Start with conservative settings)
TRADING_ENABLED=false
RISK_PER_TRADE=0.02
STOP_LOSS_PERCENTAGE=0.01
MIN_RISK_REWARD_RATIO=1.3

# AI Settings
SENTIMENT_WEIGHT=0.3
TECHNICAL_WEIGHT=0.7

# Security Headers
SECURITY_HEADERS_ENABLED=true
RATE_LIMIT_ENABLED=true
CORS_ENABLED=true
`
    };

    return templates[environment] || templates.production;
  }
}

// Export singleton instance
export const configurationManager = new ConfigurationManager();