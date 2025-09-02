/**
 * =============================================================================
 * LOGGING INTEGRATION FOR INTEL NUC DEPLOYMENT
 * =============================================================================
 * 
 * This module provides integration utilities to enhance existing logging
 * throughout the application with rich formatting and contextual information.
 * 
 * Features:
 * - Automatic log enrichment with system context
 * - Performance monitoring integration
 * - Trading operation logging
 * - System health monitoring
 * - Error tracking and alerting
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { EnhancedLogger, LogEmojis } from './enhanced-logger';
import { LogMetadata } from './logger';
import os from 'os';
import { performance } from 'perf_hooks';

/**
 * System performance metrics interface
 */
interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  diskUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  networkLatency?: number;
  uptime: number;
}

/**
 * Trading operation context interface
 */
interface TradingContext {
  symbol: string;
  operation: 'buy' | 'sell' | 'analyze' | 'monitor';
  amount?: number;
  price?: number;
  strategy?: string;
  confidence?: number;
  marketConditions?: Record<string, any>;
}

/**
 * Logging integration service for Intel NUC deployment
 */
export class LogIntegration {
  private logger: EnhancedLogger;
  private performanceTimers: Map<string, number> = new Map();
  private systemMetricsInterval?: NodeJS.Timeout;
  private errorCounts: Map<string, number> = new Map();

  constructor(componentName?: string) {
    this.logger = new EnhancedLogger(componentName);
    this.startSystemMonitoring();
  }

  /**
   * Start system performance monitoring
   */
  private startSystemMonitoring(): void {
    // Monitor system metrics every 30 seconds
    this.systemMetricsInterval = setInterval(() => {
      this.logSystemMetrics();
    }, 30000);
  }

  /**
   * Stop system monitoring
   */
  public stopSystemMonitoring(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
      this.systemMetricsInterval = undefined;
    }
  }

  /**
   * Get current system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpuUsage: await this.getCPUUsage(),
      memoryUsage: {
        used: usedMem,
        total: totalMem,
        percentage: (usedMem / totalMem) * 100
      },
      diskUsage: await this.getDiskUsage(),
      uptime: os.uptime()
    };
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = performance.now();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = performance.now();
        const timeDiff = endTime - startTime;

        const userPercent = (endUsage.user / 1000) / timeDiff * 100;
        const systemPercent = (endUsage.system / 1000) / timeDiff * 100;
        
        resolve(userPercent + systemPercent);
      }, 100);
    });
  }

  /**
   * Get disk usage information
   */
  private async getDiskUsage(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('df -h / | tail -1', { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);
      
      const total = this.parseSize(parts[1]);
      const used = this.parseSize(parts[2]);
      const percentage = parseFloat(parts[4].replace('%', ''));

      return { used, total, percentage };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(sizeStr: string): number {
    const units = { K: 1024, M: 1024**2, G: 1024**3, T: 1024**4 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGT]?)$/);
    
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2] as keyof typeof units;
    
    return value * (units[unit] || 1);
  }

  /**
   * Log system metrics with visual indicators
   */
  private async logSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      
      // Log CPU usage
      this.logger.logPerformance(
        'CPU Usage',
        metrics.cpuUsage,
        '%',
        { warning: 70, critical: 90 },
        { component: 'system_monitor' }
      );

      // Log memory usage
      this.logger.logPerformance(
        'Memory Usage',
        metrics.memoryUsage.percentage,
        '%',
        { warning: 80, critical: 95 },
        { 
          component: 'system_monitor',
          details: {
            used: `${(metrics.memoryUsage.used / 1024**3).toFixed(2)}GB`,
            total: `${(metrics.memoryUsage.total / 1024**3).toFixed(2)}GB`
          }
        }
      );

      // Log disk usage
      this.logger.logPerformance(
        'Disk Usage',
        metrics.diskUsage.percentage,
        '%',
        { warning: 85, critical: 95 },
        { 
          component: 'system_monitor',
          details: {
            used: `${(metrics.diskUsage.used / 1024**3).toFixed(2)}GB`,
            total: `${(metrics.diskUsage.total / 1024**3).toFixed(2)}GB`
          }
        }
      );

      // Log system uptime
      const uptimeHours = Math.floor(metrics.uptime / 3600);
      this.logger.logWithEmoji(
        'info',
        LogEmojis.INFO,
        `System uptime: ${uptimeHours} hours`,
        { component: 'system_monitor', uptime: metrics.uptime }
      );

    } catch (error) {
      this.logger.error('Failed to collect system metrics', error as Error);
    }
  }

  /**
   * Start performance timing for an operation
   */
  public startTiming(operationId: string): void {
    this.performanceTimers.set(operationId, performance.now());
  }

  /**
   * End performance timing and log the result
   */
  public endTiming(
    operationId: string,
    operationName: string,
    meta?: LogMetadata
  ): number {
    const startTime = this.performanceTimers.get(operationId);
    if (!startTime) {
      this.logger.warn(`No start time found for operation: ${operationId}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.performanceTimers.delete(operationId);

    // Log the timing with appropriate emoji based on duration
    const emoji = duration < 100 ? LogEmojis.FAST : 
                 duration < 1000 ? LogEmojis.INFO : LogEmojis.SLOW;

    this.logger.logWithEmoji(
      'info',
      emoji,
      `${operationName} completed in ${duration.toFixed(2)}ms`,
      { ...meta, duration, operationId }
    );

    return duration;
  }

  /**
   * Log trading operation with rich context
   */
  public logTradingOperation(
    context: TradingContext,
    result: 'success' | 'failed' | 'skipped',
    details?: Record<string, any>
  ): void {
    const { symbol, operation, amount, price, strategy, confidence } = context;
    
    let emoji: string;
    let level: 'info' | 'warn' | 'error';

    switch (result) {
      case 'success':
        emoji = operation === 'buy' ? LogEmojis.BUY : 
               operation === 'sell' ? LogEmojis.SELL : LogEmojis.SUCCESS;
        level = 'info';
        break;
      case 'failed':
        emoji = LogEmojis.ERROR;
        level = 'error';
        this.incrementErrorCount(`trading_${operation}_failed`);
        break;
      case 'skipped':
        emoji = LogEmojis.WARNING;
        level = 'warn';
        break;
    }

    let message = `Trading ${operation} ${result} for ${symbol}`;
    if (amount) message += ` (${amount} units)`;
    if (price) message += ` at $${price.toFixed(4)}`;

    const enrichedMeta: LogMetadata = {
      symbol,
      operation,
      result,
      amount,
      price,
      strategy,
      confidence,
      details,
      timestamp: new Date().toISOString()
    };

    this.logger.logWithEmoji(level, emoji, message, enrichedMeta);
    this.logger.trading(operation, message, enrichedMeta);
  }

  /**
   * Log API connectivity status
   */
  public logAPIConnectivity(
    apiName: string,
    status: 'connected' | 'disconnected' | 'error',
    latency?: number,
    error?: Error
  ): void {
    const statusMap = {
      connected: 'CONNECTED',
      disconnected: 'DISCONNECTED',
      error: 'TIMEOUT'
    } as const;

    this.logger.logConnectivity(
      apiName,
      statusMap[status],
      latency,
      { 
        error: error ? {
          name: error.name,
          message: error.message
        } : undefined
      }
    );

    if (status === 'error') {
      this.incrementErrorCount(`api_${apiName}_error`);
    }
  }

  /**
   * Log market analysis results
   */
  public logMarketAnalysis(
    symbol: string,
    analysis: {
      sentiment: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
      indicators: Record<string, any>;
      recommendation: string;
    }
  ): void {
    const sentimentMap = {
      bullish: 'BULLISH',
      bearish: 'BEARISH',
      neutral: 'NEUTRAL'
    } as const;

    this.logger.logMarketSentiment(
      symbol,
      sentimentMap[analysis.sentiment],
      analysis.confidence,
      analysis.indicators,
      { recommendation: analysis.recommendation }
    );
  }

  /**
   * Log notification delivery
   */
  public logNotificationDelivery(
    channel: 'telegram' | 'email' | 'webhook',
    status: 'sent' | 'failed' | 'queued',
    recipient?: string,
    error?: Error
  ): void {
    const channelMap = {
      telegram: 'TELEGRAM',
      email: 'EMAIL',
      webhook: 'WEBHOOK'
    } as const;

    const statusMap = {
      sent: 'SENT',
      failed: 'FAILED',
      queued: 'QUEUED'
    } as const;

    this.logger.logNotification(
      channelMap[channel],
      statusMap[status],
      recipient,
      {
        error: error ? {
          name: error.name,
          message: error.message
        } : undefined
      }
    );

    if (status === 'failed') {
      this.incrementErrorCount(`notification_${channel}_failed`);
    }
  }

  /**
   * Log security event
   */
  public logSecurityEvent(
    eventType: 'login' | 'logout' | 'api_access' | 'unauthorized' | 'suspicious',
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: string,
    context?: Record<string, any>
  ): void {
    const eventTypeMap = {
      login: 'LOGIN',
      logout: 'LOGOUT',
      api_access: 'API_ACCESS',
      unauthorized: 'UNAUTHORIZED',
      suspicious: 'SUSPICIOUS'
    } as const;

    const severityMap = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      critical: 'CRITICAL'
    } as const;

    this.logger.logSecurityEvent(
      eventTypeMap[eventType],
      severityMap[severity],
      details,
      context
    );

    if (severity === 'high' || severity === 'critical') {
      this.incrementErrorCount(`security_${eventType}_${severity}`);
    }
  }

  /**
   * Log application startup/shutdown
   */
  public logApplicationLifecycle(
    event: 'startup' | 'shutdown' | 'restart',
    component: string,
    details?: Record<string, any>
  ): void {
    const eventEmojis = {
      startup: LogEmojis.START,
      shutdown: LogEmojis.STOP,
      restart: LogEmojis.RESTART
    };

    const emoji = eventEmojis[event];
    const message = `Application ${event}: ${component}`;

    this.logger.logWithEmoji('info', emoji, message, {
      component,
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Increment error counter
   */
  private incrementErrorCount(errorType: string): void {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Generate comprehensive system report
   */
  public async generateSystemReport(): Promise<{
    timestamp: string;
    systemMetrics: SystemMetrics;
    performanceMetrics: Record<string, number>;
    operationCounters: Record<string, number>;
    errorStatistics: Record<string, number>;
  }> {
    const systemMetrics = await this.getSystemMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      systemMetrics,
      performanceMetrics: this.logger.getPerformanceMetrics(),
      operationCounters: this.logger.getOperationCounters(),
      errorStatistics: this.getErrorStatistics()
    };
  }

  /**
   * Reset all metrics and counters
   */
  public resetMetrics(): void {
    this.logger.resetMetrics();
    this.errorCounts.clear();
    this.performanceTimers.clear();
  }

  /**
   * Get the underlying enhanced logger
   */
  public getLogger(): EnhancedLogger {
    return this.logger;
  }
}

// Create and export singleton instance
export const logIntegration = new LogIntegration();

// Export types
export type { SystemMetrics, TradingContext };