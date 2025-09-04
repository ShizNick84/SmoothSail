/**
 * =============================================================================
 * RATE LIMITED NOTIFICATION SERVICE
 * =============================================================================
 * 
 * This module provides rate-limited notification services for Telegram and
 * Email with priority system, deduplication, batching, and comprehensive
 * monitoring for the AI Crypto Trading Agent.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { NotificationRateLimiter, NotificationType, NotificationPriority, NotificationConfig } from '@/core/rate-limiting/notification-rate-limiter';
import { rateLimitingManager } from '@/core/rate-limiting';
import TelegramService, { TelegramNotification, TelegramNotificationType, TelegramPriority, TelegramTradingData, TelegramSystemData } from './telegram-service';
import { EmailService } from './email-service';
import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * Notification delivery result
 */
export interface NotificationDeliveryResult {
  id: string;
  type: NotificationType;
  success: boolean;
  messageId?: string | number;
  error?: string;
  timestamp: Date;
  deliveryTime: number;
}

/**
 * Batch notification configuration
 */
export interface BatchNotificationConfig {
  enabled: boolean;
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  batchableTypes: NotificationType[];
}

/**
 * Rate limited notification service configuration
 */
export interface RateLimitedNotificationConfig {
  telegram: {
    enabled: boolean;
    rateLimitEnabled: boolean;
    deduplicationEnabled: boolean;
    batchingEnabled: boolean;
  };
  email: {
    enabled: boolean;
    rateLimitEnabled: boolean;
    deduplicationEnabled: boolean;
    batchingEnabled: boolean;
  };
  globalSettings: {
    emergencyBypass: boolean;
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * Rate limited notification service
 */
export class RateLimitedNotificationService extends EventEmitter {
  private notificationRateLimiter: NotificationRateLimiter;
  private telegramService: TelegramService;
  private emailService: EmailService;
  private config: RateLimitedNotificationConfig;
  private isInitialized: boolean = false;
  private deliveryHistory: Map<string, NotificationDeliveryResult> = new Map();
  private maxHistorySize: number = 10000;

  constructor(config?: Partial<RateLimitedNotificationConfig>) {
    super();
    
    this.notificationRateLimiter = rateLimitingManager.getNotificationRateLimiter();
    this.telegramService = new TelegramService();
    this.emailService = new EmailService();
    
    this.config = {
      telegram: {
        enabled: true,
        rateLimitEnabled: true,
        deduplicationEnabled: true,
        batchingEnabled: true,
        ...config?.telegram
      },
      email: {
        enabled: true,
        rateLimitEnabled: true,
        deduplicationEnabled: true,
        batchingEnabled: true,
        ...config?.email
      },
      globalSettings: {
        emergencyBypass: false,
        maxRetries: 3,
        retryDelay: 5000,
        ...config?.globalSettings
      }
    };
  }

  /**
   * Initialize the rate limited notification service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('📢 Initializing rate limited notification service...');

      // Initialize rate limiting manager if not already done
      if (!rateLimitingManager['isInitialized']) {
        await rateLimitingManager.initialize();
      }

      // Initialize notification services
      if (this.config.telegram.enabled) {
        await this.telegramService.initialize();
        logger.info('✅ Telegram service initialized');
      }

      if (this.config.email.enabled) {
        await this.emailService.initialize();
        logger.info('✅ Email service initialized');
      }

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info('✅ Rate limited notification service initialized successfully');

      this.emit('initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize rate limited notification service:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for rate limiting events
   */
  private setupEventListeners(): void {
    this.notificationRateLimiter.on('notificationSent', (event) => {
      logger.debug(`📤 Notification sent: ${event.id}`);
      this.emit('notificationSent', event);
    });

    this.notificationRateLimiter.on('notificationFailed', (event) => {
      logger.warn(`📤 Notification failed: ${event.id} - ${event.error}`);
      this.emit('notificationFailed', event);
    });

    this.notificationRateLimiter.on('rateLimitExceeded', (violation) => {
      logger.warn(`🚦 Notification rate limit exceeded for ${violation.type}`);
      this.emit('rateLimitExceeded', violation);
    });
  }

  /**
   * Send Telegram notification with rate limiting
   */
  public async sendTelegramNotification(
    notification: Omit<TelegramNotification, 'id'>,
    options?: {
      priority?: NotificationPriority;
      deduplicationKey?: string;
      batchable?: boolean;
      bypassRateLimit?: boolean;
    }
  ): Promise<NotificationDeliveryResult> {
    if (!this.isInitialized) {
      throw new Error('Rate limited notification service not initialized');
    }

    if (!this.config.telegram.enabled) {
      throw new Error('Telegram notifications are disabled');
    }

    const notificationId = this.generateNotificationId('telegram');
    const startTime = Date.now();

    try {
      // Map Telegram priority to notification priority
      const priority = options?.priority || this.mapTelegramPriority(notification.priority);
      
      // Create notification config
      const notificationConfig: NotificationConfig = {
        type: NotificationType.TELEGRAM,
        priority,
        recipient: notification.chatId,
        message: notification.message,
        metadata: {
          parseMode: notification.parseMode,
          disableWebPagePreview: notification.disableWebPagePreview,
          disableNotification: notification.disableNotification,
          replyMarkup: notification.replyMarkup
        },
        deduplicationKey: options?.deduplicationKey || this.generateDeduplicationKey(notification),
        batchable: options?.batchable !== false && this.config.telegram.batchingEnabled,
        retryOnLimit: true,
        maxRetries: this.config.globalSettings.maxRetries
      };

      // Check for emergency bypass
      if (options?.bypassRateLimit || 
          (this.config.globalSettings.emergencyBypass && priority === NotificationPriority.EMERGENCY)) {
        
        logger.info(`🚨 Bypassing rate limit for emergency notification: ${notificationId}`);
        const messageId = await this.telegramService.sendNotification({
          ...notification,
          id: notificationId
        });

        const result: NotificationDeliveryResult = {
          id: notificationId,
          type: NotificationType.TELEGRAM,
          success: true,
          messageId,
          timestamp: new Date(),
          deliveryTime: Date.now() - startTime
        };

        this.recordDeliveryResult(result);
        return result;
      }

      // Send through rate limiter
      await this.notificationRateLimiter.sendNotification(
        notificationConfig,
        async (config) => {
          const telegramNotification: TelegramNotification = {
            id: notificationId,
            type: notification.type,
            priority: notification.priority,
            chatId: config.recipient,
            message: config.message,
            parseMode: config.metadata?.parseMode,
            disableWebPagePreview: config.metadata?.disableWebPagePreview,
            disableNotification: config.metadata?.disableNotification,
            replyMarkup: config.metadata?.replyMarkup,
            timestamp: new Date()
          };

          await this.telegramService.sendNotification(telegramNotification);
        }
      );

      const result: NotificationDeliveryResult = {
        id: notificationId,
        type: NotificationType.TELEGRAM,
        success: true,
        timestamp: new Date(),
        deliveryTime: Date.now() - startTime
      };

      this.recordDeliveryResult(result);
      return result;

    } catch (error) {
      const result: NotificationDeliveryResult = {
        id: notificationId,
        type: NotificationType.TELEGRAM,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        deliveryTime: Date.now() - startTime
      };

      this.recordDeliveryResult(result);
      throw error;
    }
  }

  /**
   * Send email notification with rate limiting
   */
  public async sendEmailNotification(
    emailData: {
      to: string;
      subject: string;
      message: string;
      html?: string;
      attachments?: any[];
    },
    options?: {
      priority?: NotificationPriority;
      deduplicationKey?: string;
      batchable?: boolean;
      bypassRateLimit?: boolean;
    }
  ): Promise<NotificationDeliveryResult> {
    if (!this.isInitialized) {
      throw new Error('Rate limited notification service not initialized');
    }

    if (!this.config.email.enabled) {
      throw new Error('Email notifications are disabled');
    }

    const notificationId = this.generateNotificationId('email');
    const startTime = Date.now();

    try {
      const priority = options?.priority || NotificationPriority.NORMAL;
      
      // Create notification config
      const notificationConfig: NotificationConfig = {
        type: NotificationType.EMAIL,
        priority,
        recipient: emailData.to,
        subject: emailData.subject,
        message: emailData.message,
        metadata: {
          html: emailData.html,
          attachments: emailData.attachments
        },
        deduplicationKey: options?.deduplicationKey || this.generateEmailDeduplicationKey(emailData),
        batchable: options?.batchable !== false && this.config.email.batchingEnabled,
        retryOnLimit: true,
        maxRetries: this.config.globalSettings.maxRetries
      };

      // Check for emergency bypass
      if (options?.bypassRateLimit || 
          (this.config.globalSettings.emergencyBypass && priority === NotificationPriority.EMERGENCY)) {
        
        logger.info(`🚨 Bypassing rate limit for emergency email: ${notificationId}`);
        const messageId = await this.emailService.sendEmail(emailData);

        const result: NotificationDeliveryResult = {
          id: notificationId,
          type: NotificationType.EMAIL,
          success: true,
          messageId,
          timestamp: new Date(),
          deliveryTime: Date.now() - startTime
        };

        this.recordDeliveryResult(result);
        return result;
      }

      // Send through rate limiter
      await this.notificationRateLimiter.sendNotification(
        notificationConfig,
        async (config) => {
          await this.emailService.sendEmail({
            to: config.recipient,
            subject: config.subject || 'Trading Agent Notification',
            message: config.message,
            html: config.metadata?.html,
            attachments: config.metadata?.attachments
          });
        }
      );

      const result: NotificationDeliveryResult = {
        id: notificationId,
        type: NotificationType.EMAIL,
        success: true,
        timestamp: new Date(),
        deliveryTime: Date.now() - startTime
      };

      this.recordDeliveryResult(result);
      return result;

    } catch (error) {
      const result: NotificationDeliveryResult = {
        id: notificationId,
        type: NotificationType.EMAIL,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        deliveryTime: Date.now() - startTime
      };

      this.recordDeliveryResult(result);
      throw error;
    }
  }

  /**
   * Send trade execution notification to all enabled channels
   */
  public async sendTradeExecutionNotification(
    data: TelegramTradingData,
    options?: {
      priority?: NotificationPriority;
      channels?: ('telegram' | 'email')[];
    }
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const channels = options?.channels || ['telegram', 'email'];
    const priority = options?.priority || NotificationPriority.HIGH;

    // Send Telegram notification
    if (channels.includes('telegram') && this.config.telegram.enabled) {
      try {
        const result = await this.sendTelegramNotification({
          type: TelegramNotificationType.TRADE_EXECUTION,
          priority: this.mapNotificationToTelegramPriority(priority),
          chatId: process.env.TELEGRAM_CHAT_ID!,
          message: '', // Will be generated by sendTradeExecutionNotification
          timestamp: new Date()
        }, {
          priority,
          deduplicationKey: `trade_${data.symbol}_${data.action}_${Date.now()}`,
          batchable: false // Trade executions should not be batched
        });

        // Use the Telegram service's specialized method
        await this.telegramService.sendTradeExecutionNotification(data);
        results.push(result);
      } catch (error) {
        logger.error('❌ Failed to send Telegram trade notification:', error);
      }
    }

    // Send Email notification
    if (channels.includes('email') && this.config.email.enabled) {
      try {
        const emailMessage = this.formatTradeExecutionEmail(data);
        const result = await this.sendEmailNotification({
          to: process.env.NOTIFICATION_EMAIL!,
          subject: `Trade Executed: ${data.action} ${data.symbol}`,
          message: emailMessage.text,
          html: emailMessage.html
        }, {
          priority,
          deduplicationKey: `trade_email_${data.symbol}_${data.action}_${Date.now()}`,
          batchable: false
        });

        results.push(result);
      } catch (error) {
        logger.error('❌ Failed to send email trade notification:', error);
      }
    }

    return results;
  }

  /**
   * Send system health notification
   */
  public async sendSystemHealthNotification(
    data: TelegramSystemData,
    options?: {
      priority?: NotificationPriority;
      channels?: ('telegram' | 'email')[];
    }
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const channels = options?.channels || ['telegram'];
    const priority = options?.priority || NotificationPriority.NORMAL;

    // Send Telegram notification
    if (channels.includes('telegram') && this.config.telegram.enabled) {
      try {
        const result = await this.sendTelegramNotification({
          type: TelegramNotificationType.SYSTEM_HEALTH,
          priority: this.mapNotificationToTelegramPriority(priority),
          chatId: process.env.TELEGRAM_CHAT_ID!,
          message: '', // Will be generated by sendSystemHealth
          timestamp: new Date()
        }, {
          priority,
          deduplicationKey: `health_${Date.now()}`,
          batchable: true
        });

        // Use the Telegram service's specialized method
        await this.telegramService.sendSystemHealth(data);
        results.push(result);
      } catch (error) {
        logger.error('❌ Failed to send Telegram health notification:', error);
      }
    }

    return results;
  }

  /**
   * Send security alert notification
   */
  public async sendSecurityAlert(
    alertData: {
      threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      incidentType: string;
      description: string;
      affectedSystems: string[];
      timestamp: Date;
    },
    options?: {
      channels?: ('telegram' | 'email')[];
    }
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const channels = options?.channels || ['telegram', 'email'];
    const priority = this.mapThreatLevelToPriority(alertData.threatLevel);

    // Send Telegram notification
    if (channels.includes('telegram') && this.config.telegram.enabled) {
      try {
        const result = await this.sendTelegramNotification({
          type: TelegramNotificationType.SECURITY_ALERT,
          priority: this.mapNotificationToTelegramPriority(priority),
          chatId: process.env.TELEGRAM_CHAT_ID!,
          message: '', // Will be generated by sendSecurityAlert
          timestamp: new Date()
        }, {
          priority,
          deduplicationKey: `security_${alertData.incidentType}_${alertData.timestamp.getTime()}`,
          batchable: false,
          bypassRateLimit: alertData.threatLevel === 'CRITICAL'
        });

        // Use the Telegram service's specialized method
        await this.telegramService.sendSecurityAlert(alertData);
        results.push(result);
      } catch (error) {
        logger.error('❌ Failed to send Telegram security alert:', error);
      }
    }

    // Send Email notification for high/critical alerts
    if (channels.includes('email') && this.config.email.enabled && 
        ['HIGH', 'CRITICAL'].includes(alertData.threatLevel)) {
      try {
        const emailMessage = this.formatSecurityAlertEmail(alertData);
        const result = await this.sendEmailNotification({
          to: process.env.SECURITY_EMAIL!,
          subject: `🚨 Security Alert: ${alertData.threatLevel} - ${alertData.incidentType}`,
          message: emailMessage.text,
          html: emailMessage.html
        }, {
          priority,
          deduplicationKey: `security_email_${alertData.incidentType}_${alertData.timestamp.getTime()}`,
          batchable: false,
          bypassRateLimit: alertData.threatLevel === 'CRITICAL'
        });

        results.push(result);
      } catch (error) {
        logger.error('❌ Failed to send email security alert:', error);
      }
    }

    return results;
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate deduplication key for Telegram notification
   */
  private generateDeduplicationKey(notification: Omit<TelegramNotification, 'id'>): string {
    const content = `${notification.type}_${notification.message.substring(0, 100)}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Generate deduplication key for email notification
   */
  private generateEmailDeduplicationKey(emailData: any): string {
    const content = `${emailData.subject}_${emailData.message.substring(0, 100)}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Map Telegram priority to notification priority
   */
  private mapTelegramPriority(telegramPriority: TelegramPriority): NotificationPriority {
    const mapping = {
      [TelegramPriority.LOW]: NotificationPriority.LOW,
      [TelegramPriority.NORMAL]: NotificationPriority.NORMAL,
      [TelegramPriority.HIGH]: NotificationPriority.HIGH,
      [TelegramPriority.CRITICAL]: NotificationPriority.CRITICAL
    };
    return mapping[telegramPriority] || NotificationPriority.NORMAL;
  }

  /**
   * Map notification priority to Telegram priority
   */
  private mapNotificationToTelegramPriority(priority: NotificationPriority): TelegramPriority {
    const mapping = {
      [NotificationPriority.LOW]: TelegramPriority.LOW,
      [NotificationPriority.NORMAL]: TelegramPriority.NORMAL,
      [NotificationPriority.HIGH]: TelegramPriority.HIGH,
      [NotificationPriority.CRITICAL]: TelegramPriority.CRITICAL,
      [NotificationPriority.EMERGENCY]: TelegramPriority.CRITICAL
    };
    return mapping[priority] || TelegramPriority.NORMAL;
  }

  /**
   * Map threat level to notification priority
   */
  private mapThreatLevelToPriority(threatLevel: string): NotificationPriority {
    const mapping = {
      'LOW': NotificationPriority.LOW,
      'MEDIUM': NotificationPriority.NORMAL,
      'HIGH': NotificationPriority.HIGH,
      'CRITICAL': NotificationPriority.EMERGENCY
    };
    return mapping[threatLevel] || NotificationPriority.NORMAL;
  }

  /**
   * Format trade execution email
   */
  private formatTradeExecutionEmail(data: TelegramTradingData): { text: string; html: string } {
    const text = `
Trade Executed: ${data.action} ${data.symbol}

Symbol: ${data.symbol}
Action: ${data.action}
Quantity: ${data.quantity}
Price: ${data.price?.toFixed(4)}
P&L: ${data.pnl?.toFixed(2)}
Balance: ${data.balance?.toFixed(2)}
Strategy: ${data.strategy}
Time: ${data.timestamp?.toLocaleString()}
    `.trim();

    const html = `
<h2>Trade Executed: ${data.action} ${data.symbol}</h2>
<table>
  <tr><td><strong>Symbol:</strong></td><td>${data.symbol}</td></tr>
  <tr><td><strong>Action:</strong></td><td>${data.action}</td></tr>
  <tr><td><strong>Quantity:</strong></td><td>${data.quantity}</td></tr>
  <tr><td><strong>Price:</strong></td><td>${data.price?.toFixed(4)}</td></tr>
  <tr><td><strong>P&L:</strong></td><td>${data.pnl?.toFixed(2)}</td></tr>
  <tr><td><strong>Balance:</strong></td><td>${data.balance?.toFixed(2)}</td></tr>
  <tr><td><strong>Strategy:</strong></td><td>${data.strategy}</td></tr>
  <tr><td><strong>Time:</strong></td><td>${data.timestamp?.toLocaleString()}</td></tr>
</table>
    `.trim();

    return { text, html };
  }

  /**
   * Format security alert email
   */
  private formatSecurityAlertEmail(alertData: any): { text: string; html: string } {
    const text = `
SECURITY ALERT: ${alertData.threatLevel}

Incident Type: ${alertData.incidentType}
Description: ${alertData.description}
Affected Systems: ${alertData.affectedSystems.join(', ')}
Detected: ${alertData.timestamp.toLocaleString()}

Please review and take appropriate action.
    `.trim();

    const html = `
<h2 style="color: red;">SECURITY ALERT: ${alertData.threatLevel}</h2>
<table>
  <tr><td><strong>Incident Type:</strong></td><td>${alertData.incidentType}</td></tr>
  <tr><td><strong>Description:</strong></td><td>${alertData.description}</td></tr>
  <tr><td><strong>Affected Systems:</strong></td><td>${alertData.affectedSystems.join(', ')}</td></tr>
  <tr><td><strong>Detected:</strong></td><td>${alertData.timestamp.toLocaleString()}</td></tr>
</table>
<p><strong>Please review and take appropriate action.</strong></p>
    `.trim();

    return { text, html };
  }

  /**
   * Record delivery result for tracking
   */
  private recordDeliveryResult(result: NotificationDeliveryResult): void {
    this.deliveryHistory.set(result.id, result);

    // Keep history size manageable
    if (this.deliveryHistory.size > this.maxHistorySize) {
      const oldestKey = this.deliveryHistory.keys().next().value;
      this.deliveryHistory.delete(oldestKey);
    }
  }

  /**
   * Get notification statistics
   */
  public getStatistics(): any {
    const rateLimiterStats = this.notificationRateLimiter.getStatistics();
    const telegramStats = this.telegramService.getStatistics();
    
    const deliveryResults = Array.from(this.deliveryHistory.values());
    const recentResults = deliveryResults.filter(
      r => Date.now() - r.timestamp.getTime() < 3600000 // Last hour
    );

    return {
      rateLimiter: rateLimiterStats,
      telegram: telegramStats,
      delivery: {
        totalDeliveries: deliveryResults.length,
        recentDeliveries: recentResults.length,
        successRate: recentResults.length > 0 
          ? (recentResults.filter(r => r.success).length / recentResults.length) * 100 
          : 0,
        averageDeliveryTime: recentResults.length > 0
          ? recentResults.reduce((acc, r) => acc + r.deliveryTime, 0) / recentResults.length
          : 0
      },
      config: this.config
    };
  }

  /**
   * Clear notification queues
   */
  public async clearQueues(): Promise<{ notifications: number; batches: number }> {
    const clearedNotifications = this.notificationRateLimiter.clearQueue();
    const clearedBatches = this.notificationRateLimiter.clearBatches();

    return {
      notifications: clearedNotifications,
      batches: clearedBatches
    };
  }

  /**
   * Shutdown the notification service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down rate limited notification service...');

    await this.telegramService.stop();
    
    this.deliveryHistory.clear();
    this.isInitialized = false;

    logger.info('✅ Rate limited notification service shutdown completed');
  }
}

// Interfaces are already exported above