/**
 * =============================================================================
 * NOTIFICATION MANAGER
 * =============================================================================
 * 
 * Central notification management system that coordinates all notification
 * services for the AI crypto trading agent. Provides a unified interface
 * for sending notifications across multiple channels.
 * 
 * Features:
 * - Unified notification interface
 * - Service coordination and management
 * - Health monitoring and statistics
 * - Graceful error handling and fallbacks
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { EmailService } from './email-service';
import { TelegramService } from './telegram-service';
import { NotificationRouter } from './notification-router';
import { TradingNotifications, TradeExecutionData, PositionData, PerformanceSummaryData, SystemHealthData } from './trading-notifications';

/**
 * Notification manager configuration
 */
export interface NotificationManagerConfig {
  emailEnabled: boolean;
  telegramEnabled: boolean;
  routingEnabled: boolean;
  tradingNotificationsEnabled: boolean;
  healthCheckInterval: number; // minutes
}

/**
 * Notification service health status
 */
export interface ServiceHealthStatus {
  service: string;
  healthy: boolean;
  lastCheck: Date;
  error?: string;
  statistics?: Record<string, any>;
}

/**
 * Central notification manager class
 */
export class NotificationManager {
  private emailService: EmailService;
  private telegramService: TelegramService;
  private notificationRouter: NotificationRouter;
  private tradingNotifications: TradingNotifications;
  private config: NotificationManagerConfig;
  private healthStatus: Map<string, ServiceHealthStatus>;
  private healthCheckInterval?: NodeJS.Timeout;
  private isInitialized: boolean = false;

  constructor(config?: Partial<NotificationManagerConfig>) {
    this.config = {
      emailEnabled: true,
      telegramEnabled: true,
      routingEnabled: true,
      tradingNotificationsEnabled: true,
      healthCheckInterval: 5, // 5 minutes
      ...config
    };

    this.emailService = new EmailService();
    this.telegramService = new TelegramService();
    this.notificationRouter = new NotificationRouter();
    this.tradingNotifications = new TradingNotifications();
    this.healthStatus = new Map();
  }

  /**
   * Initialize the notification manager and all services
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🔔 Initializing notification manager...');

      // Initialize services based on configuration
      const initPromises: Promise<void>[] = [];

      if (this.config.emailEnabled) {
        initPromises.push(this.initializeEmailService());
      }

      if (this.config.telegramEnabled) {
        initPromises.push(this.initializeTelegramService());
      }

      if (this.config.routingEnabled) {
        initPromises.push(this.initializeNotificationRouter());
      }

      if (this.config.tradingNotificationsEnabled) {
        initPromises.push(this.initializeTradingNotifications());
      }

      // Initialize all services concurrently
      await Promise.all(initPromises);

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      logger.info('✅ Notification manager initialized successfully');

      // Send startup notification
      await this.sendStartupNotification();

    } catch (error) {
      logger.error('❌ Failed to initialize notification manager:', error);
      throw error;
    }
  }

  /**
   * Send trade execution notification
   */
  public async notifyTradeExecution(data: TradeExecutionData): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Notification manager not initialized');
    }

    try {
      if (this.config.tradingNotificationsEnabled) {
        await this.tradingNotifications.notifyTradeExecution(data);
      } else {
        // Fallback to direct service calls
        await this.fallbackTradeNotification(data);
      }
    } catch (error) {
      logger.error('❌ Failed to send trade execution notification:', error);
      // Don't throw - notifications shouldn't break trading
    }
  }

  /**
   * Send profit target hit notification
   */
  public async notifyProfitTargetHit(data: PositionData): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.config.tradingNotificationsEnabled) {
        await this.tradingNotifications.notifyProfitTargetHit(data);
      }
    } catch (error) {
      logger.error('❌ Failed to send profit target notification:', error);
    }
  }

  /**
   * Send stop loss triggered notification
   */
  public async notifyStopLossTriggered(data: PositionData): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.config.tradingNotificationsEnabled) {
        await this.tradingNotifications.notifyStopLossTriggered(data);
      }
    } catch (error) {
      logger.error('❌ Failed to send stop loss notification:', error);
    }
  }

  /**
   * Send daily performance summary
   */
  public async sendDailySummary(data: PerformanceSummaryData): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.config.tradingNotificationsEnabled) {
        await this.tradingNotifications.sendDailySummary(data);
      }
    } catch (error) {
      logger.error('❌ Failed to send daily summary:', error);
    }
  }

  /**
   * Send weekly performance summary
   */
  public async sendWeeklySummary(data: PerformanceSummaryData): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.config.tradingNotificationsEnabled) {
        await this.tradingNotifications.sendWeeklySummary(data);
      }
    } catch (error) {
      logger.error('❌ Failed to send weekly summary:', error);
    }
  }

  /**
   * Send system health notification
   */
  public async notifySystemHealth(data: SystemHealthData): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.config.tradingNotificationsEnabled) {
        await this.tradingNotifications.notifySystemHealth(data);
      }
    } catch (error) {
      logger.error('❌ Failed to send system health notification:', error);
    }
  }

  /**
   * Send security alert
   */
  public async sendSecurityAlert(data: {
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentType: string;
    description: string;
    affectedSystems: string[];
  }): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.config.routingEnabled) {
        await this.notificationRouter.sendSecurityAlert(data);
      } else {
        // Fallback to direct service calls
        await this.fallbackSecurityAlert(data);
      }
    } catch (error) {
      logger.error('❌ Failed to send security alert:', error);
    }
  }

  /**
   * Send emergency notification
   */
  public async sendEmergencyNotification(message: string, data?: Record<string, any>): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Send through all available channels for emergency
      const promises: Promise<any>[] = [];

      if (this.config.telegramEnabled) {
        promises.push(this.telegramService.sendNotification({
          id: `emergency_${Date.now()}`,
          type: 'EMERGENCY' as any,
          priority: 'critical' as any,
          chatId: process.env.TELEGRAM_CHAT_ID!,
          message: `🚨 <b>EMERGENCY ALERT</b> 🚨\n\n${message}`,
          parseMode: 'HTML',
          timestamp: new Date()
        }));
      }

      if (this.config.emailEnabled) {
        promises.push(this.emailService.sendSecurityAlert({
          threatLevel: 'CRITICAL',
          incidentType: 'EMERGENCY',
          description: message,
          affectedSystems: data?.affectedSystems || ['Trading System'],
          timestamp: new Date()
        }));
      }

      await Promise.allSettled(promises);
      logger.info('🚨 Emergency notification sent through all channels');

    } catch (error) {
      logger.error('❌ Failed to send emergency notification:', error);
    }
  }

  /**
   * Get notification manager health status
   */
  public getHealthStatus(): Map<string, ServiceHealthStatus> {
    return new Map(this.healthStatus);
  }

  /**
   * Get comprehensive statistics
   */
  public getStatistics(): {
    services: Record<string, any>;
    overallHealth: boolean;
    lastHealthCheck: Date;
  } {
    const services: Record<string, any> = {};
    let overallHealth = true;
    let lastHealthCheck = new Date(0);

    for (const [serviceName, status] of this.healthStatus.entries()) {
      services[serviceName] = {
        healthy: status.healthy,
        lastCheck: status.lastCheck,
        statistics: status.statistics
      };

      if (!status.healthy) {
        overallHealth = false;
      }

      if (status.lastCheck > lastHealthCheck) {
        lastHealthCheck = status.lastCheck;
      }
    }

    return {
      services,
      overallHealth,
      lastHealthCheck
    };
  }

  /**
   * Initialize email service
   */
  private async initializeEmailService(): Promise<void> {
    try {
      await this.emailService.initialize();
      this.updateHealthStatus('email', true);
      logger.info('✅ Email service initialized');
    } catch (error) {
      this.updateHealthStatus('email', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Initialize Telegram service
   */
  private async initializeTelegramService(): Promise<void> {
    try {
      await this.telegramService.initialize();
      this.updateHealthStatus('telegram', true);
      logger.info('✅ Telegram service initialized');
    } catch (error) {
      this.updateHealthStatus('telegram', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('❌ Failed to initialize Telegram service:', error);
      throw error;
    }
  }

  /**
   * Initialize notification router
   */
  private async initializeNotificationRouter(): Promise<void> {
    try {
      await this.notificationRouter.initialize();
      this.updateHealthStatus('router', true);
      logger.info('✅ Notification router initialized');
    } catch (error) {
      this.updateHealthStatus('router', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('❌ Failed to initialize notification router:', error);
      throw error;
    }
  }

  /**
   * Initialize trading notifications
   */
  private async initializeTradingNotifications(): Promise<void> {
    try {
      await this.tradingNotifications.initialize();
      this.updateHealthStatus('trading', true);
      logger.info('✅ Trading notifications initialized');
    } catch (error) {
      this.updateHealthStatus('trading', false, error instanceof Error ? error.message : 'Unknown error');
      logger.error('❌ Failed to initialize trading notifications:', error);
      throw error;
    }
  }

  /**
   * Update health status for a service
   */
  private updateHealthStatus(service: string, healthy: boolean, error?: string): void {
    this.healthStatus.set(service, {
      service,
      healthy,
      lastCheck: new Date(),
      error,
      statistics: this.getServiceStatistics(service)
    });
  }

  /**
   * Get statistics for a specific service
   */
  private getServiceStatistics(service: string): Record<string, any> {
    try {
      switch (service) {
        case 'email':
          return this.emailService.getStatistics();
        case 'telegram':
          return this.telegramService.getStatistics();
        case 'router':
          return this.notificationRouter.getStatistics();
        case 'trading':
          return this.tradingNotifications.getStatistics();
        default:
          return {};
      }
    } catch {
      return {};
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const intervalMs = this.config.healthCheckInterval * 60 * 1000;

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    logger.info(`🏥 Health monitoring started (${this.config.healthCheckInterval} minute intervals)`);
  }

  /**
   * Perform health check on all services
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const services = ['email', 'telegram', 'router', 'trading'];

      for (const service of services) {
        try {
          // Simple health check - update statistics
          const statistics = this.getServiceStatistics(service);
          this.updateHealthStatus(service, true);
        } catch (error) {
          this.updateHealthStatus(service, false, error instanceof Error ? error.message : 'Health check failed');
        }
      }

    } catch (error) {
      logger.error('❌ Health check failed:', error);
    }
  }

  /**
   * Send startup notification
   */
  private async sendStartupNotification(): Promise<void> {
    try {
      const message = `
🚀 <b>AI Crypto Trading Agent Started</b>

✅ Notification system initialized
📧 Email service: ${this.config.emailEnabled ? 'Enabled' : 'Disabled'}
🤖 Telegram service: ${this.config.telegramEnabled ? 'Enabled' : 'Disabled'}
🔀 Routing system: ${this.config.routingEnabled ? 'Enabled' : 'Disabled'}
📊 Trading notifications: ${this.config.tradingNotificationsEnabled ? 'Enabled' : 'Disabled'}

System ready for 24/7 operation! 💰
      `.trim();

      if (this.config.telegramEnabled) {
        await this.telegramService.sendNotification({
          id: `startup_${Date.now()}`,
          type: 'WELCOME' as any,
          priority: 'normal' as any,
          chatId: process.env.TELEGRAM_CHAT_ID!,
          message,
          parseMode: 'HTML',
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('❌ Failed to send startup notification:', error);
    }
  }

  /**
   * Fallback trade notification when trading notifications service is disabled
   */
  private async fallbackTradeNotification(data: TradeExecutionData): Promise<void> {
    const promises: Promise<any>[] = [];

    if (this.config.telegramEnabled) {
      promises.push(this.telegramService.sendTradeExecutionNotification({
        symbol: data.symbol,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        pnl: data.pnl,
        balance: data.balance,
        strategy: data.strategy,
        timestamp: data.timestamp
      }));
    }

    if (this.config.emailEnabled) {
      promises.push(this.emailService.sendTradeExecutionNotification({
        symbol: data.symbol,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        pnl: data.pnl,
        balance: data.balance,
        strategy: data.strategy,
        timestamp: data.timestamp
      }));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Fallback security alert when router is disabled
   */
  private async fallbackSecurityAlert(data: {
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentType: string;
    description: string;
    affectedSystems: string[];
  }): Promise<void> {
    const promises: Promise<any>[] = [];

    if (this.config.telegramEnabled) {
      promises.push(this.telegramService.sendSecurityAlert({
        ...data,
        timestamp: new Date()
      }));
    }

    if (this.config.emailEnabled) {
      promises.push(this.emailService.sendSecurityAlert({
        ...data,
        timestamp: new Date()
      }));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Stop the notification manager and all services
   */
  public async stop(): Promise<void> {
    try {
      logger.info('🛑 Stopping notification manager...');

      // Clear health check interval
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Stop services
      const stopPromises: Promise<void>[] = [];

      if (this.config.telegramEnabled) {
        stopPromises.push(this.telegramService.stop());
      }

      if (this.config.routingEnabled) {
        stopPromises.push(this.notificationRouter.stop());
      }

      if (this.config.tradingNotificationsEnabled) {
        stopPromises.push(this.tradingNotifications.stop());
      }

      await Promise.allSettled(stopPromises);

      this.isInitialized = false;
      logger.info('✅ Notification manager stopped successfully');

    } catch (error) {
      logger.error('❌ Error stopping notification manager:', error);
      throw error;
    }
  }
}

export default NotificationManager;