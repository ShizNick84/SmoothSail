/**
 * =============================================================================
 * ENHANCED LOGGER WITH RICH FORMATTING AND VISUAL INDICATORS
 * =============================================================================
 * 
 * This module extends the base logger with rich formatting, emojis, and
 * visual indicators for better log readability and monitoring.
 * 
 * Features:
 * - Emoji-based status indicators
 * - Color-coded log levels
 * - Contextual information enrichment
 * - Performance metrics integration
 * - Visual progress indicators
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { Logger, LogMetadata } from './logger';
import chalk from 'chalk';

/**
 * Emoji mappings for different log types and statuses
 */
export const LogEmojis = {
  // System status
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  DEBUG: '🔍',
  
  // Trading operations
  BUY: '📈',
  SELL: '📉',
  PROFIT: '💰',
  LOSS: '💸',
  BALANCE: '⚖️',
  PORTFOLIO: '📊',
  
  // System operations
  START: '🚀',
  STOP: '🛑',
  RESTART: '🔄',
  INITIALIZE: '🔧',
  SHUTDOWN: '⏹️',
  
  // Network and connectivity
  CONNECTED: '🔗',
  DISCONNECTED: '🔌',
  TUNNEL: '🚇',
  API: '🌐',
  DATABASE: '🗄️',
  
  // Security and monitoring
  SECURITY: '🔒',
  AUDIT: '📋',
  ALERT: '🚨',
  MONITOR: '👁️',
  BACKUP: '💾',
  
  // Performance
  FAST: '⚡',
  SLOW: '🐌',
  MEMORY: '🧠',
  CPU: '⚙️',
  DISK: '💽',
  
  // Market data
  BULL: '🐂',
  BEAR: '🐻',
  ROCKET: '🚀',
  CRASH: '💥',
  TREND_UP: '📈',
  TREND_DOWN: '📉',
  
  // Notifications
  TELEGRAM: '📱',
  EMAIL: '📧',
  BELL: '🔔',
  MUTE: '🔕',
  
  // Analytics and reporting
  REPORT: '📊',
  TRADING: '💹',
  INSIGHT: '💡'
} as const;

/**
 * Color schemes for different log levels
 */
export const LogColors = {
  ERROR: chalk.red,
  WARN: chalk.yellow,
  INFO: chalk.blue,
  DEBUG: chalk.gray,
  SUCCESS: chalk.green,
  TRADING: chalk.magenta,
  SECURITY: chalk.cyan,
  PERFORMANCE: chalk.white
} as const;

/**
 * Enhanced logger with rich formatting and visual indicators
 */
export class EnhancedLogger extends Logger {
  private performanceMetrics: Map<string, number> = new Map();
  private operationCounters: Map<string, number> = new Map();

  constructor(componentName?: string) {
    super(componentName);
  }

  /**
   * Log with emoji and rich formatting
   */
  public logWithEmoji(
    level: 'info' | 'warn' | 'error' | 'debug',
    emoji: string,
    message: string,
    meta?: LogMetadata
  ): void {
    const formattedMessage = `${emoji} ${message}`;
    
    switch (level) {
      case 'info':
        this.info(formattedMessage, meta);
        break;
      case 'warn':
        this.warn(formattedMessage, meta);
        break;
      case 'error':
        this.error(formattedMessage, meta);
        break;
      case 'debug':
        this.debug(formattedMessage, meta);
        break;
    }
  }

  /**
   * Log trading operations with rich context
   */
  public logTradingOperation(
    operation: 'BUY' | 'SELL' | 'PROFIT' | 'LOSS' | 'BALANCE_CHECK',
    symbol: string,
    amount?: number,
    price?: number,
    profit?: number,
    meta?: LogMetadata
  ): void {
    const emoji = LogEmojis[operation];
    let message = `${operation} operation`;
    
    const enrichedMeta: LogMetadata = {
      ...meta,
      symbol,
      operation: operation.toLowerCase(),
      timestamp: new Date().toISOString()
    };

    if (amount !== undefined) {
      message += ` - Amount: ${amount}`;
      enrichedMeta.amount = amount;
    }
    
    if (price !== undefined) {
      message += ` - Price: $${price.toFixed(4)}`;
      enrichedMeta.price = price;
    }
    
    if (profit !== undefined) {
      const profitEmoji = profit > 0 ? LogEmojis.PROFIT : LogEmojis.LOSS;
      message += ` - P&L: ${profitEmoji} $${profit.toFixed(2)}`;
      enrichedMeta.profit = profit;
    }

    this.trading(operation.toLowerCase(), `${emoji} ${message}`, enrichedMeta);
    this.incrementCounter(`trading_${operation.toLowerCase()}`);
  }

  /**
   * Log system status with visual indicators
   */
  public logSystemStatus(
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'STARTING' | 'STOPPING',
    component: string,
    details?: Record<string, any>,
    meta?: LogMetadata
  ): void {
    const statusEmojis = {
      HEALTHY: LogEmojis.SUCCESS,
      WARNING: LogEmojis.WARNING,
      CRITICAL: LogEmojis.ERROR,
      STARTING: LogEmojis.START,
      STOPPING: LogEmojis.STOP
    };

    const emoji = statusEmojis[status];
    const message = `System ${status.toLowerCase()}: ${component}`;
    
    const enrichedMeta: LogMetadata = {
      ...meta,
      component,
      status: status.toLowerCase(),
      details,
      timestamp: new Date().toISOString()
    };

    const level = status === 'CRITICAL' ? 'error' : 
                 status === 'WARNING' ? 'warn' : 'info';
    
    this.logWithEmoji(level, emoji, message, enrichedMeta);
  }

  /**
   * Log performance metrics with visual indicators
   */
  public logPerformance(
    metric: string,
    value: number,
    unit: string,
    threshold?: { warning: number; critical: number },
    meta?: LogMetadata
  ): void {
    let emoji: string = LogEmojis.INFO;
    let level: 'info' | 'warn' | 'error' = 'info';
    
    if (threshold) {
      if (value >= threshold.critical) {
        emoji = LogEmojis.ERROR;
        level = 'error';
      } else if (value >= threshold.warning) {
        emoji = LogEmojis.WARNING;
        level = 'warn';
      } else {
        emoji = LogEmojis.SUCCESS;
      }
    }

    const message = `Performance metric: ${metric} = ${value}${unit}`;
    
    const enrichedMeta: LogMetadata = {
      ...meta,
      metric,
      value,
      unit,
      threshold,
      timestamp: new Date().toISOString()
    };

    this.logWithEmoji(level, emoji, message, enrichedMeta);
    this.performanceMetrics.set(metric, value);
  }

  /**
   * Log network connectivity status
   */
  public logConnectivity(
    service: string,
    status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'TIMEOUT',
    latency?: number,
    meta?: LogMetadata
  ): void {
    const statusEmojis = {
      CONNECTED: LogEmojis.CONNECTED,
      DISCONNECTED: LogEmojis.DISCONNECTED,
      RECONNECTING: LogEmojis.RESTART,
      TIMEOUT: LogEmojis.WARNING
    };

    const emoji = statusEmojis[status];
    let message = `${service} ${status.toLowerCase()}`;
    
    if (latency !== undefined) {
      const latencyEmoji = latency < 100 ? LogEmojis.FAST : 
                          latency < 500 ? LogEmojis.INFO : LogEmojis.SLOW;
      message += ` ${latencyEmoji} (${latency}ms)`;
    }

    const enrichedMeta: LogMetadata = {
      ...meta,
      service,
      status: status.toLowerCase(),
      latency,
      timestamp: new Date().toISOString()
    };

    const level = status === 'DISCONNECTED' || status === 'TIMEOUT' ? 'warn' : 'info';
    this.logWithEmoji(level, emoji, message, enrichedMeta);
  }

  /**
   * Log market sentiment and analysis
   */
  public logMarketSentiment(
    symbol: string,
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    confidence: number,
    indicators?: Record<string, any>,
    meta?: LogMetadata
  ): void {
    const sentimentEmojis = {
      BULLISH: LogEmojis.BULL,
      BEARISH: LogEmojis.BEAR,
      NEUTRAL: LogEmojis.BALANCE
    };

    const emoji = sentimentEmojis[sentiment];
    const message = `Market sentiment for ${symbol}: ${sentiment} (${(confidence * 100).toFixed(1)}% confidence)`;
    
    const enrichedMeta: LogMetadata = {
      ...meta,
      symbol,
      sentiment: sentiment.toLowerCase(),
      confidence,
      indicators,
      timestamp: new Date().toISOString()
    };

    this.trading('market_analysis', `${emoji} ${message}`, enrichedMeta);
  }

  /**
   * Log notification delivery status
   */
  public logNotification(
    channel: 'TELEGRAM' | 'EMAIL' | 'WEBHOOK',
    status: 'SENT' | 'FAILED' | 'QUEUED',
    recipient?: string,
    meta?: LogMetadata
  ): void {
    const channelEmojis = {
      TELEGRAM: LogEmojis.TELEGRAM,
      EMAIL: LogEmojis.EMAIL,
      WEBHOOK: LogEmojis.API
    };

    const statusEmojis = {
      SENT: LogEmojis.SUCCESS,
      FAILED: LogEmojis.ERROR,
      QUEUED: LogEmojis.INFO
    };

    const channelEmoji = channelEmojis[channel];
    const statusEmoji = statusEmojis[status];
    
    let message = `${channelEmoji} ${channel} notification ${status.toLowerCase()}`;
    if (recipient) {
      message += ` to ${recipient}`;
    }

    const enrichedMeta: LogMetadata = {
      ...meta,
      channel: channel.toLowerCase(),
      status: status.toLowerCase(),
      recipient,
      timestamp: new Date().toISOString()
    };

    const level = status === 'FAILED' ? 'error' : 'info';
    this.logWithEmoji(level, statusEmoji, message, enrichedMeta);
  }

  /**
   * Log security events with appropriate classification
   */
  public logSecurityEvent(
    eventType: 'LOGIN' | 'LOGOUT' | 'API_ACCESS' | 'UNAUTHORIZED' | 'SUSPICIOUS',
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: string,
    meta?: LogMetadata
  ): void {
    const severityEmojis = {
      LOW: LogEmojis.INFO,
      MEDIUM: LogEmojis.WARNING,
      HIGH: LogEmojis.ALERT,
      CRITICAL: LogEmojis.ERROR
    };

    const emoji = severityEmojis[severity];
    const message = `${LogEmojis.SECURITY} Security event: ${eventType} - ${details}`;
    
    const enrichedMeta: LogMetadata = {
      ...meta,
      eventType: eventType.toLowerCase(),
      severity: severity.toLowerCase(),
      classification: 'CONFIDENTIAL',
      timestamp: new Date().toISOString()
    };

    const level = severity === 'CRITICAL' || severity === 'HIGH' ? 'error' : 
                 severity === 'MEDIUM' ? 'warn' : 'info';
    
    this.security(eventType.toLowerCase(), `${emoji} ${message}`, enrichedMeta);
  }

  /**
   * Create a progress indicator for long-running operations
   */
  public logProgress(
    operation: string,
    current: number,
    total: number,
    meta?: LogMetadata
  ): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    const emoji = percentage === 100 ? LogEmojis.SUCCESS : LogEmojis.INFO;
    
    const message = `${operation} progress: ${progressBar} ${percentage}% (${current}/${total})`;
    
    const enrichedMeta: LogMetadata = {
      ...meta,
      operation,
      current,
      total,
      percentage,
      timestamp: new Date().toISOString()
    };

    this.logWithEmoji('info', emoji, message, enrichedMeta);
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Increment operation counter
   */
  private incrementCounter(operation: string): void {
    const current = this.operationCounters.get(operation) || 0;
    this.operationCounters.set(operation, current + 1);
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): Record<string, number> {
    return Object.fromEntries(this.performanceMetrics);
  }

  /**
   * Get operation counters
   */
  public getOperationCounters(): Record<string, number> {
    return Object.fromEntries(this.operationCounters);
  }

  /**
   * Reset all counters and metrics
   */
  public resetMetrics(): void {
    this.performanceMetrics.clear();
    this.operationCounters.clear();
  }

  /**
   * Generate a summary report of logging activity
   */
  public generateLogSummary(): {
    metrics: Record<string, number>;
    counters: Record<string, number>;
    timestamp: string;
  } {
    return {
      metrics: this.getPerformanceMetrics(),
      counters: this.getOperationCounters(),
      timestamp: new Date().toISOString()
    };
  }
}

// Create and export enhanced logger instance
export const enhancedLogger = new EnhancedLogger();

// Export types and constants
export type { LogMetadata };