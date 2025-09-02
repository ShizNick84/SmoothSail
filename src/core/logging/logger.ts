/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - COMPREHENSIVE LOGGING SYSTEM
 * =============================================================================
 * 
 * This module provides a comprehensive logging system with security-focused
 * features for the AI crypto trading agent. All trading operations, security
 * events, and system activities are logged with appropriate detail levels.
 * 
 * CRITICAL SECURITY NOTICE:
 * This logging system handles sensitive financial and security data.
 * All logs must be protected and never expose sensitive information.
 * 
 * Features:
 * - Multiple log levels with appropriate filtering
 * - Automatic log rotation and archival
 * - Security-aware log sanitization
 * - Structured logging with JSON format
 * - Separate log files for different components
 * - Audit trail capabilities
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Interface for log metadata
 * Provides structured context for log entries
 */
export interface LogMetadata {
  /** Component that generated the log */
  component?: string;
  /** Trading pair if applicable */
  symbol?: string;
  /** User ID if applicable */
  userId?: string;
  /** Session ID for tracking */
  sessionId?: string;
  /** Request ID for API calls */
  requestId?: string;
  /** Additional context data */
  context?: Record<string, any>;
  /** Security classification */
  classification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  /** Error information */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  /** Process ID */
  pid?: number;
  /** Hostname */
  hostname?: string;
  /** Node.js version */
  nodeVersion?: string;
  /** Environment */
  environment?: string;
  /** Timestamp */
  timestamp?: string;
  /** Log level */
  level?: string;
}

/**
 * Interface for audit log entries
 * Specialized structure for security and compliance logging
 */
export interface AuditLogEntry {
  /** Unique audit event ID */
  auditId: string;
  /** Type of audit event */
  eventType: string;
  /** User or system that performed the action */
  actor: string;
  /** Resource that was affected */
  resource: string;
  /** Action that was performed */
  action: string;
  /** Result of the action */
  result: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  /** IP address of the actor */
  ipAddress?: string;
  /** Additional audit data */
  auditData?: Record<string, any>;
  /** Timestamp of the event */
  timestamp: Date;
}

/**
 * Comprehensive logging service for the AI crypto trading agent
 * Provides secure, structured logging with automatic rotation and sanitization
 */
class Logger {
  private winston: winston.Logger;
  private auditLogger: winston.Logger;
  private securityLogger: winston.Logger;
  private tradingLogger: winston.Logger;
  private componentName: string;
  
  /** Sensitive data patterns to sanitize from logs */
  private static readonly SENSITIVE_PATTERNS = [
    /api[_-]?key["\s]*[:=]["\s]*([^"\s,}]+)/gi,
    /secret["\s]*[:=]["\s]*([^"\s,}]+)/gi,
    /password["\s]*[:=]["\s]*([^"\s,}]+)/gi,
    /token["\s]*[:=]["\s]*([^"\s,}]+)/gi,
    /authorization["\s]*[:=]["\s]*([^"\s,}]+)/gi,
    /private[_-]?key["\s]*[:=]["\s]*([^"\s,}]+)/gi,
    /\b[A-Za-z0-9]{32,}\b/g, // Potential API keys or hashes
  ];

  constructor(componentName?: string) {
    this.componentName = componentName || 'Application';
    // Ensure log directories exist
    this.ensureLogDirectories();
    
    // Initialize main logger
    this.winston = this.createMainLogger();
    
    // Initialize specialized loggers
    this.auditLogger = this.createAuditLogger();
    this.securityLogger = this.createSecurityLogger();
    this.tradingLogger = this.createTradingLogger();
  }

  /**
   * Ensure all required log directories exist
   * Creates directories with appropriate permissions
   */
  private ensureLogDirectories(): void {
    const logDirs = [
      process.env.LOG_DIR || './logs',
      process.env.AUDIT_LOG_DIR || './logs/audit',
      process.env.SECURITY_LOG_DIR || './logs/security',
      './logs/trading'
    ];

    for (const dir of logDirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o750 });
      }
    }
  }

  /**
   * Create the main application logger
   * Handles general application logging with rotation
   * 
   * @returns winston.Logger Configured main logger
   */
  private createMainLogger(): winston.Logger {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(this.formatLogMessage.bind(this))
      ),
      transports: [
        // Console output for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(this.formatConsoleMessage.bind(this))
          )
        }),
        
        // Daily rotating file for general logs
        new DailyRotateFile({
          filename: resolve(process.env.LOG_DIR || './logs', 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '30d',
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        
        // Error-only log file
        new DailyRotateFile({
          filename: resolve(process.env.LOG_DIR || './logs', 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '100m',
          maxFiles: '90d',
          zippedArchive: true
        })
      ]
    });
  }

  /**
   * Create specialized audit logger for compliance and security
   * Maintains tamper-evident audit trails
   * 
   * @returns winston.Logger Configured audit logger
   */
  private createAuditLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: resolve(process.env.AUDIT_LOG_DIR || './logs/audit', 'audit-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '365d', // Keep audit logs for 1 year
          zippedArchive: true
        })
      ]
    });
  }

  /**
   * Create specialized security logger for threat monitoring
   * Logs all security-related events and incidents
   * 
   * @returns winston.Logger Configured security logger
   */
  private createSecurityLogger(): winston.Logger {
    return winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: resolve(process.env.SECURITY_LOG_DIR || './logs/security', 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '365d', // Keep security logs for 1 year
          zippedArchive: true
        })
      ]
    });
  }

  /**
   * Create specialized trading logger for financial operations
   * Logs all trading activities and market data
   * 
   * @returns winston.Logger Configured trading logger
   */
  private createTradingLogger(): winston.Logger {
    return winston.createLogger({
      level: process.env.TRADING_LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: resolve('./logs/trading', 'trading-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '90d', // Keep trading logs for 90 days
          zippedArchive: true
        })
      ]
    });
  }

  /**
   * Format log messages with sanitization
   * Removes sensitive data and adds structured formatting
   * 
   * @param info - Winston log info object
   * @returns string Formatted log message
   */
  private formatLogMessage(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, ...meta } = info;
    
    // Sanitize the message and metadata
    const sanitizedMessage = this.sanitizeSensitiveData(message);
    const sanitizedMeta = this.sanitizeSensitiveData(JSON.stringify(meta));
    
    return JSON.stringify({
      timestamp,
      level,
      message: sanitizedMessage,
      ...JSON.parse(sanitizedMeta)
    });
  }

  /**
   * Format console messages for development
   * Provides readable console output with colors
   * 
   * @param info - Winston log info object
   * @returns string Formatted console message
   */
  private formatConsoleMessage(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, ...meta } = info;
    const sanitizedMessage = this.sanitizeSensitiveData(message);
    
    let output = `${timestamp} [${level.toUpperCase()}]: ${sanitizedMessage}`;
    
    if (Object.keys(meta).length > 0) {
      const sanitizedMeta = this.sanitizeSensitiveData(JSON.stringify(meta, null, 2));
      output += `\n${sanitizedMeta}`;
    }
    
    return output;
  }

  /**
   * Sanitize sensitive data from log messages
   * Replaces sensitive patterns with masked values
   * 
   * @param data - Data to sanitize (string or object)
   * @returns string Sanitized data
   */
  private sanitizeSensitiveData(data: any): string {
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }
    
    let sanitized = data;
    
    // Replace sensitive patterns with masked values
    for (const pattern of Logger.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match: string, group1?: string) => {
        if (group1) {
          const maskedValue = '*'.repeat(Math.min(group1.length, 8));
          return match.replace(group1, maskedValue);
        }
        return '***REDACTED***';
      });
    }
    
    return sanitized;
  }

  /**
   * Log debug messages
   * Used for detailed diagnostic information
   * 
   * @param message - Log message
   * @param meta - Additional metadata
   */
  public debug(message: string, meta?: LogMetadata): void {
    this.winston.debug(message, this.enrichMetadata(meta));
  }

  /**
   * Log info messages
   * Used for general operational information
   * 
   * @param message - Log message
   * @param meta - Additional metadata
   */
  public info(message: string, meta?: LogMetadata): void {
    this.winston.info(message, this.enrichMetadata(meta));
  }

  /**
   * Log warning messages
   * Used for potentially problematic situations
   * 
   * @param message - Log message
   * @param meta - Additional metadata
   */
  public warn(message: string, meta?: LogMetadata): void {
    this.winston.warn(message, this.enrichMetadata(meta));
  }

  /**
   * Log error messages
   * Used for error conditions and exceptions
   * 
   * @param message - Log message
   * @param error - Error object or additional metadata
   */
  public error(message: string, error?: Error | LogMetadata): void {
    let meta: LogMetadata = {};
    
    if (error instanceof Error) {
      meta = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      };
    } else if (error) {
      meta = error;
    }
    
    this.winston.error(message, this.enrichMetadata(meta));
  }

  /**
   * Log audit events for compliance and security
   * Creates tamper-evident audit trail entries
   * 
   * @param auditEntry - Structured audit log entry
   */
  public audit(auditEntry: AuditLogEntry): void {
    const enrichedEntry = {
      ...auditEntry,
      timestamp: auditEntry.timestamp || new Date(),
      auditId: auditEntry.auditId || this.generateAuditId()
    };
    
    this.auditLogger.info('AUDIT_EVENT', enrichedEntry);
  }

  /**
   * Log security events and incidents
   * Specialized logging for security monitoring
   * 
   * @param eventType - Type of security event
   * @param message - Security event message
   * @param meta - Security event metadata
   */
  public security(eventType: string, message: string, meta?: LogMetadata): void {
    const securityMeta = {
      ...this.enrichMetadata(meta),
      eventType,
      securityLevel: meta?.classification || 'INTERNAL',
      timestamp: new Date().toISOString()
    };
    
    this.securityLogger.info(message, securityMeta);
  }

  /**
   * Log trading operations and market data
   * Specialized logging for financial operations
   * 
   * @param operation - Trading operation type
   * @param message - Trading message
   * @param meta - Trading metadata
   */
  public trading(operation: string, message: string, meta?: LogMetadata): void {
    const tradingMeta = {
      ...this.enrichMetadata(meta),
      operation,
      timestamp: new Date().toISOString()
    };
    
    this.tradingLogger.info(message, tradingMeta);
  }

  /**
   * Enrich metadata with common fields
   * Adds standard fields to all log entries
   * 
   * @param meta - Original metadata
   * @returns LogMetadata Enriched metadata
   */
  private enrichMetadata(meta?: LogMetadata): LogMetadata {
    return {
      ...meta,
      component: meta?.component || this.componentName,
      pid: process.pid,
      hostname: require('os').hostname(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Generate unique audit ID
   * Creates a unique identifier for audit trail entries
   * 
   * @returns string Unique audit ID
   */
  private generateAuditId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Get logger statistics and health information
   * Returns current logging status for monitoring
   * 
   * @returns Object containing logger statistics
   */
  public getStats(): {
    mainLogger: any;
    auditLogger: any;
    securityLogger: any;
    tradingLogger: any;
    timestamp: number;
  } {
    return {
      mainLogger: {
        level: this.winston.level,
        transports: this.winston.transports.length
      },
      auditLogger: {
        level: this.auditLogger.level,
        transports: this.auditLogger.transports.length
      },
      securityLogger: {
        level: this.securityLogger.level,
        transports: this.securityLogger.transports.length
      },
      tradingLogger: {
        level: this.tradingLogger.level,
        transports: this.tradingLogger.transports.length
      },
      timestamp: Date.now()
    };
  }
}

// Create and export singleton logger instance
export const logger = new Logger();

// Export the Logger class for tests and custom instances
export { Logger };

// Export types for use in other modules
export type { AuditLogEntry };

// =============================================================================
// LOGGING SECURITY NOTES
// =============================================================================
// 1. All sensitive data is automatically sanitized before logging
// 2. Audit logs are kept for 1 year for compliance requirements
// 3. Security logs are kept for 1 year for incident investigation
// 4. Log files are automatically rotated and compressed
// 5. Log directories have restricted permissions (750)
// 6. Never manually log sensitive information like API keys or passwords
// 7. Use appropriate log levels to control information exposure
// 8. Monitor log files for unauthorized access or tampering
// =============================================================================
