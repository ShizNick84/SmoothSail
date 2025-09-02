#!/usr/bin/env tsx

/**
 * Environment Validation Script
 * 
 * Validates that all required environment variables are present and properly formatted.
 */

import { existsSync, readFileSync } from 'fs';
import { logger } from '../core/logger';

interface ValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'path';
  minLength?: number;
  pattern?: RegExp;
  description: string;
}

class EnvironmentValidator {
  private rules: ValidationRule[] = [
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
      key: 'GATEIO_API_KEY',
      required: true,
      type: 'string',
      minLength: 10,
      description: 'Gate.io API key'
    },
    {
      key: 'GATEIO_API_SECRET',
      required: true,
      type: 'string',
      minLength: 10,
      description: 'Gate.io API secret'
    },
    {
      key: 'ORACLE_HOST',
      required: true,
      type: 'string',
      pattern: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
      description: 'Oracle Free Tier IP address'
    },
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
    }
  ];

  async validate(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if .env file exists
    if (!existsSync('.env')) {
      errors.push('.env file not found');
      return { valid: false, errors, warnings };
    }

    // Load environment variables
    const envContent = readFileSync('.env', 'utf-8');
    const envVars = this.parseEnvFile(envContent);

    // Validate each rule
    for (const rule of this.rules) {
      const value = envVars[rule.key];

      if (rule.required && (!value || value.trim() === '')) {
        errors.push(`${rule.key} is required - ${rule.description}`);
        continue;
      }

      if (!value) continue;

      // Type validation
      const typeResult = this.validateType(rule.key, value, rule.type);
      if (!typeResult.valid) {
        errors.push(`${rule.key}: ${typeResult.error}`);
        continue;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${rule.key} does not match required pattern`);
      }

      // Length validation
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${rule.key} must be at least ${rule.minLength} characters`);
      }

      // Security warnings
      if (rule.key.includes('SECRET') || rule.key.includes('KEY')) {
        if (value.length < 32) {
          warnings.push(`${rule.key} should be at least 32 characters for security`);
        }
        if (/^(password|secret|key|123|abc)/i.test(value)) {
          warnings.push(`${rule.key} appears to use a weak pattern`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

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
}

// Run validation if this file is executed directly
async function main() {
  const validator = new EnvironmentValidator();
  const result = await validator.validate();

  if (result.valid) {
    logger.info('✅ Environment validation passed');
    if (result.warnings.length > 0) {
      logger.warn('⚠️ Warnings:');
      result.warnings.forEach(warning => logger.warn(`  • ${warning}`));
    }
    process.exit(0);
  } else {
    logger.error('❌ Environment validation failed');
    result.errors.forEach(error => logger.error(`  • ${error}`));
    if (result.warnings.length > 0) {
      logger.warn('⚠️ Warnings:');
      result.warnings.forEach(warning => logger.warn(`  • ${warning}`));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { EnvironmentValidator };
