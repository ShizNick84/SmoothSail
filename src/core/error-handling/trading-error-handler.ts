/**
 * =============================================================================
 * TRADING SYSTEM ERROR HANDLING
 * =============================================================================
 * 
 * Comprehensive error handling for all trading operations including:
 * - Order execution errors with retry logic
 * - API connection failures with exponential backoff
 * - Position safety checks and error prevention
 * - Trading error notification and escalation
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/logger';
import { NotificationService } from '../notifications/notification-service';

export enum TradingErrorType {
  ORDER_EXECUTION_FAILED = 'ORDER_EXECUTION_FAILED',
  API_CONNECTION_LOST = 'API_CONNECTION_LOST',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  POSITION_LIMIT_EXCEEDED = 'POSITION_LIMIT_EXCEEDED',
  MARKET_DATA_UNAVAILABLE = 'MARKET_DATA_UNAVAILABLE',
  RISK_LIMIT_EXCEEDED = 'RISK_LIMIT_EXCEEDED',
  EXCHANGE_ERROR = 'EXCHANGE_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface TradingError {
  id: string;
  type: TradingErrorType;
  severity: ErrorSeverity;
  message: string;
  details: any;
  timestamp: Date;
  component: string;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  context?: {
    orderId?: string;
    symbol?: string;
    operation?: string;
    userId?: string;
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
}

export class TradingErrorHandler extends EventEmitter {
  private logger: Logger;
  private notificationService: NotificationService;
  private errorHistory: Map<string, TradingError[]> = new Map();
  private retryQueues: Map<TradingErrorType, TradingError[]> = new Map();
  private retryConfigs: Map<TradingErrorType, RetryConfig> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: Date; isOpen: boolean }> = new Map();

  constructor() {
    super();
    this.logger = new Logger('TradingErrorHandler');
    this.notificationService = new NotificationService(this.logger);
    this.initializeRetryConfigs();
    this.startRetryProcessor();
  }

  /**
   * Initialize retry configurations for different error types
   */
  private initializeRetryConfigs(): void {
    this.retryConfigs.set(TradingErrorType.ORDER_EXECUTION_FAILED, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2,
      jitter: true
    });

    this.retryConfigs.set(TradingErrorType.API_CONNECTION_LOST, {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 60000,
      exponentialBase: 2,
      jitter: true
    });

    this.retryConfigs.set(TradingErrorType.NETWORK_TIMEOUT, {
      maxRetries: 3,
      baseDelay: 1500,
      maxDelay: 15000,
      exponentialBase: 1.5,
      jitter: true
    });

    this.retryConfigs.set(TradingErrorType.RATE_LIMIT_EXCEEDED, {
      maxRetries: 10,
      baseDelay: 5000,
      maxDelay: 300000,
      exponentialBase: 1.2,
      jitter: false
    });
  }

  /**
   * Handle trading error with automatic retry and escalation
   */
  async handleError(error: Partial<TradingError>, operation: () => Promise<any>): Promise<any> {
    const tradingError: TradingError = {
      id: this.generateErrorId(),
      type: error.type || TradingErrorType.EXCHANGE_ERROR,
      severity: error.severity || ErrorSeverity.MEDIUM,
      message: error.message || 'Unknown trading error',
      details: error.details || {},
      timestamp: new Date(),
      component: error.component || 'TradingSystem',
      retryable: this.isRetryable(error.type || TradingErrorType.EXCHANGE_ERROR),
      retryCount: 0,
      maxRetries: this.getMaxRetries(error.type || TradingErrorType.EXCHANGE_ERROR),
      context: error.context
    };

    // Log the error
    this.logError(tradingError);

    // Store error in history
    this.storeError(tradingError);

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(tradingError.component)) {
      throw new Error(`Circuit breaker is open for ${tradingError.component}`);
    }

    // Attempt retry if applicable
    if (tradingError.retryable && tradingError.retryCount < tradingError.maxRetries) {
      return this.retryOperation(tradingError, operation);
    }

    // Escalate if not retryable or max retries exceeded
    await this.escalateError(tradingError);
    throw new Error(tradingError.message);
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation(error: TradingError, operation: () => Promise<any>): Promise<any> {
    const config = this.retryConfigs.get(error.type);
    if (!config) {
      throw new Error(`No retry config for error type: ${error.type}`);
    }

    error.retryCount++;
    
    // Calculate delay with exponential backoff
    const delay = this.calculateRetryDelay(error.retryCount, config);
    
    this.logger.info(`Retrying operation after ${delay}ms (attempt ${error.retryCount}/${error.maxRetries})`, {
      errorId: error.id,
      errorType: error.type,
      component: error.component
    });

    // Wait before retry
    await this.sleep(delay);

    try {
      const result = await operation();
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker(error.component);
      
      this.logger.info('Operation retry successful', {
        errorId: error.id,
        retryCount: error.retryCount
      });

      return result;
    } catch (retryError) {
      // Update circuit breaker
      this.updateCircuitBreaker(error.component);

      // If we haven't exceeded max retries, try again
      if (error.retryCount < error.maxRetries) {
        return this.retryOperation(error, operation);
      }

      // Max retries exceeded, escalate
      await this.escalateError(error);
      throw retryError;
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryCount: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.exponentialBase, retryCount - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Check if error type is retryable
   */
  private isRetryable(errorType: TradingErrorType): boolean {
    const retryableErrors = [
      TradingErrorType.ORDER_EXECUTION_FAILED,
      TradingErrorType.API_CONNECTION_LOST,
      TradingErrorType.NETWORK_TIMEOUT,
      TradingErrorType.RATE_LIMIT_EXCEEDED,
      TradingErrorType.MARKET_DATA_UNAVAILABLE
    ];
    
    return retryableErrors.includes(errorType);
  }

  /**
   * Get maximum retries for error type
   */
  private getMaxRetries(errorType: TradingErrorType): number {
    const config = this.retryConfigs.get(errorType);
    return config?.maxRetries || 0;
  }

  /**
   * Escalate error to appropriate channels
   */
  private async escalateError(error: TradingError): Promise<void> {
    this.logger.error('Escalating trading error', {
      errorId: error.id,
      errorType: error.type,
      severity: error.severity,
      retryCount: error.retryCount
    });

    // Determine escalation level based on severity
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        await this.notificationService.sendCriticalAlert({
          title: 'Critical Trading Error',
          message: error.message,
          details: error.details,
          errorId: error.id
        });
        break;

      case ErrorSeverity.HIGH:
        await this.notificationService.sendHighPriorityAlert({
          title: 'High Priority Trading Error',
          message: error.message,
          errorId: error.id
        });
        break;

      case ErrorSeverity.MEDIUM:
        await this.notificationService.sendAlert({
          title: 'Trading Error',
          message: error.message,
          priority: 'MEDIUM',
          errorId: error.id
        });
        break;

      case ErrorSeverity.LOW:
        // Log only, no immediate notification
        break;
    }

    // Emit error event for other components
    this.emit('errorEscalated', error);
  }

  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen(component: string): boolean {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return false;

    // Check if circuit should be reset (after 5 minutes)
    const resetTime = 5 * 60 * 1000; // 5 minutes
    if (breaker.isOpen && Date.now() - breaker.lastFailure.getTime() > resetTime) {
      breaker.isOpen = false;
      breaker.failures = 0;
      this.logger.info(`Circuit breaker reset for ${component}`);
    }

    return breaker.isOpen;
  }

  private updateCircuitBreaker(component: string): void {
    let breaker = this.circuitBreakers.get(component);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: new Date(), isOpen: false };
      this.circuitBreakers.set(component, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = new Date();

    // Open circuit after 5 consecutive failures
    if (breaker.failures >= 5) {
      breaker.isOpen = true;
      this.logger.warn(`Circuit breaker opened for ${component} after ${breaker.failures} failures`);
    }
  }

  private resetCircuitBreaker(component: string): void {
    const breaker = this.circuitBreakers.get(component);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }
  }

  /**
   * Position safety checks
   */
  async validatePositionSafety(operation: any): Promise<void> {
    // Implement position safety validation
    if (operation.type === 'order' && operation.side === 'buy') {
      // Check if position would exceed limits
      const currentPosition = await this.getCurrentPosition(operation.symbol);
      const newPosition = currentPosition + operation.amount;
      
      if (newPosition > operation.maxPositionSize) {
        throw this.createError(TradingErrorType.POSITION_LIMIT_EXCEEDED, {
          message: `Position would exceed limit: ${newPosition} > ${operation.maxPositionSize}`,
          details: { currentPosition, requestedAmount: operation.amount, limit: operation.maxPositionSize }
        });
      }
    }
  }

  /**
   * Create standardized trading error
   */
  createError(type: TradingErrorType, options: Partial<TradingError>): TradingError {
    return {
      id: this.generateErrorId(),
      type,
      severity: options.severity || this.getDefaultSeverity(type),
      message: options.message || `Trading error: ${type}`,
      details: options.details || {},
      timestamp: new Date(),
      component: options.component || 'TradingSystem',
      retryable: this.isRetryable(type),
      retryCount: 0,
      maxRetries: this.getMaxRetries(type),
      context: options.context
    };
  }

  /**
   * Get default severity for error type
   */
  private getDefaultSeverity(type: TradingErrorType): ErrorSeverity {
    const severityMap = {
      [TradingErrorType.ORDER_EXECUTION_FAILED]: ErrorSeverity.HIGH,
      [TradingErrorType.API_CONNECTION_LOST]: ErrorSeverity.CRITICAL,
      [TradingErrorType.INSUFFICIENT_BALANCE]: ErrorSeverity.MEDIUM,
      [TradingErrorType.POSITION_LIMIT_EXCEEDED]: ErrorSeverity.HIGH,
      [TradingErrorType.MARKET_DATA_UNAVAILABLE]: ErrorSeverity.MEDIUM,
      [TradingErrorType.RISK_LIMIT_EXCEEDED]: ErrorSeverity.HIGH,
      [TradingErrorType.EXCHANGE_ERROR]: ErrorSeverity.MEDIUM,
      [TradingErrorType.NETWORK_TIMEOUT]: ErrorSeverity.MEDIUM,
      [TradingErrorType.AUTHENTICATION_FAILED]: ErrorSeverity.CRITICAL,
      [TradingErrorType.RATE_LIMIT_EXCEEDED]: ErrorSeverity.LOW
    };

    return severityMap[type] || ErrorSeverity.MEDIUM;
  }

  /**
   * Utility methods
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getCurrentPosition(symbol: string): Promise<number> {
    // Placeholder - would integrate with position manager
    return 0;
  }

  private logError(error: TradingError): void {
    this.logger.error(`Trading error: ${error.type}`, {
      errorId: error.id,
      severity: error.severity,
      component: error.component,
      retryable: error.retryable,
      context: error.context
    });
  }

  private storeError(error: TradingError): void {
    const componentErrors = this.errorHistory.get(error.component) || [];
    componentErrors.push(error);
    
    // Keep only last 100 errors per component
    if (componentErrors.length > 100) {
      componentErrors.shift();
    }
    
    this.errorHistory.set(error.component, componentErrors);
  }

  private startRetryProcessor(): void {
    // Process retry queues every 5 seconds
    setInterval(() => {
      this.processRetryQueues();
    }, 5000);
  }

  private processRetryQueues(): void {
    // Implementation for processing queued retries
    // This would handle delayed retries for rate-limited operations
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getErrorStats(): any {
    const stats = {
      totalErrors: 0,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([component, breaker]) => ({
        component,
        failures: breaker.failures,
        isOpen: breaker.isOpen,
        lastFailure: breaker.lastFailure
      }))
    };

    for (const errors of this.errorHistory.values()) {
      stats.totalErrors += errors.length;
      
      for (const error of errors) {
        stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
        stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
      }
    }

    return stats;
  }
}