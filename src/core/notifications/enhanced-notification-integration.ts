/**
 * =============================================================================
 * ENHANCED NOTIFICATION INTEGRATION SERVICE
 * =============================================================================
 * 
 * Integration service that combines enhanced alert types, real-time templates,
 * and notification delivery to provide a comprehensive notification system
 * with real-time market data and intelligent content generation.
 * 
 * Features:
 * - Unified notification interface
 * - Real-time data integration
 * - Template-based content generation
 * - Multi-channel delivery coordination
 * - Performance monitoring and analytics
 * - Error handling and recovery
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Enhanced Notification Integration
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { EnhancedAlertService } from './enhanced-alert-service';
import { 
  EnhancedTelegramTemplates, 
  EnhancedEmailTemplates, 
  TemplateContextCalculator 
} from './enhanced-notification-templates';
import { 
  EnhancedAlert, 
  EnhancedAlertType, 
  AlertSeverity,
  RealTimeMarketData,
  TradeOrderInfo,
  PositionInfo,
  ErrorContext
} from './enhanced-alert-types';
import { TelegramService } from './telegram-service';
import { EmailService } from './email-service';

/**
 * Market data provider interface
 */
export interface MarketDataProvider {
  getCurrentMarketData(symbol: string): Promise<RealTimeMarketData>;
  getMultipleMarketData(symbols: string[]): Promise<Map<string, RealTimeMarketData>>;
}

/**
 * System metrics provider interface
 */
export interface SystemMetricsProvider {
  getCurrentSystemMetrics(): Promise<{
    timestamp: Date;
    systemLoad: number;
    networkLatency: number;
    tunnelStatus: string;
    tradingStatus: string;
    memoryUsage: number;
    cpuUsage: number;
  }>;
}

/**
 * Notification delivery options
 */
export interface NotificationDeliveryOptions {
  channels?: ('telegram' | 'email' | 'dashboard')[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
  includeMarketData?: boolean;
  includeSystemMetrics?: boolean;
  customTemplate?: string;
  tags?: string[];
}

/**
 * Enhanced notification integration service
 */
export class EnhancedNotificationIntegration {
  private alertService: EnhancedAlertService;
  private telegramService: TelegramService;
  private emailService: EmailService;
  private marketDataProvider?: MarketDataProvider;
  private systemMetricsProvider?: SystemMetricsProvider;
  private isInitialized: boolean = false;
  private deliveryStats: {
    totalNotifications: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageDeliveryTime: number;
    lastDeliveryTime?: Date;
  };

  constructor(
    marketDataProvider?: MarketDataProvider,
    systemMetricsProvider?: SystemMetricsProvider
  ) {
    this.alertService = new EnhancedAlertService();
    this.telegramService = new TelegramService();
    this.emailService = new EmailService();
    this.marketDataProvider = marketDataProvider;
    this.systemMetricsProvider = systemMetricsProvider;
    
    this.deliveryStats = {
      totalNotifications: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageDeliveryTime: 0
    };
  }

  /**
   * Initialize the enhanced notification integration
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🔔 Initializing enhanced notification integration...');

      // Initialize core services
      await Promise.all([
        this.alertService.initialize(),
        this.telegramService.initialize(),
        this.emailService.initialize()
      ]);

      this.isInitialized = true;
      logger.info('✅ Enhanced notification integration initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize enhanced notification integration:', error);
      throw error;
    }
  }

  /**
   * Send new trade order notification with real-time data
   */
  public async sendNewTradeOrderNotification(
    orderInfo: TradeOrderInfo,
    options: NotificationDeliveryOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Enhanced notification integration not initialized');
    }

    try {
      const startTime = Date.now();
      logger.info(`🔔 Sending new trade order notification: ${orderInfo.symbol}`);

      // Get real-time market data
      const marketData = options.includeMarketData !== false && this.marketDataProvider
        ? await this.marketDataProvider.getCurrentMarketData(orderInfo.symbol)
        : undefined;

      // Get system metrics
      const systemMetrics = options.includeSystemMetrics !== false && this.systemMetricsProvider
        ? await this.systemMetricsProvider.getCurrentSystemMetrics()
        : undefined;

      // Create enhanced alert
      const alert: EnhancedAlert = {
        id: `new_trade_${orderInfo.orderId}_${Date.now()}`,
        type: EnhancedAlertType.NEW_TRADE_ORDER_PLACED,
        severity: AlertSeverity.HIGH,
        title: `🆕 New Trade Order Placed: ${orderInfo.symbol}`,
        message: `New ${orderInfo.side} order placed for ${orderInfo.symbol}`,
        tradeOrder: orderInfo,
        marketData,
        systemInfo: {
          timestamp: new Date(),
          source: 'enhanced-notification-integration',
          environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
          version: process.env.npm_package_version || '1.0.0',
          instanceId: process.env.INSTANCE_ID || 'intel-nuc-001'
        },
        channels: options.channels || ['telegram', 'email'],
        priority: options.priority || 'high',
        tags: ['trade', 'order', 'new', orderInfo.symbol.toLowerCase(), ...(options.tags || [])]
      };

      // Generate and send notifications
      await this.deliverEnhancedNotification(alert, marketData, systemMetrics);

      // Update statistics
      this.updateDeliveryStats(Date.now() - startTime, true);

      logger.info(`✅ New trade order notification sent successfully: ${orderInfo.symbol}`);

    } catch (error) {
      this.updateDeliveryStats(0, false);
      logger.error(`❌ Failed to send new trade order notification:`, error);
      throw error;
    }
  }

  /**
   * Send trade update notification for stop loss approaching
   */
  public async sendStopLossApproachingNotification(
    position: PositionInfo,
    distancePercent: number,
    options: NotificationDeliveryOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Enhanced notification integration not initialized');
    }

    try {
      const startTime = Date.now();
      logger.info(`⚠️ Sending stop loss approaching notification: ${position.symbol}`);

      // Get real-time market data
      const marketData = options.includeMarketData !== false && this.marketDataProvider
        ? await this.marketDataProvider.getCurrentMarketData(position.symbol)
        : position.marketData;

      // Get system metrics
      const systemMetrics = options.includeSystemMetrics !== false && this.systemMetricsProvider
        ? await this.systemMetricsProvider.getCurrentSystemMetrics()
        : undefined;

      // Determine severity based on distance
      const severity = distancePercent <= 1 ? AlertSeverity.CRITICAL : 
                      distancePercent <= 3 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM;

      // Create enhanced alert
      const alert: EnhancedAlert = {
        id: `stop_loss_warning_${position.positionId}_${Date.now()}`,
        type: EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS,
        severity,
        title: `⚠️ Price Approaching Stop Loss: ${position.symbol}`,
        message: `${position.symbol} price is ${distancePercent.toFixed(2)}% away from stop loss`,
        position: {
          ...position,
          marketData: marketData || position.marketData
        },
        marketData,
        systemInfo: {
          timestamp: new Date(),
          source: 'enhanced-notification-integration',
          environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
          version: process.env.npm_package_version || '1.0.0',
          instanceId: process.env.INSTANCE_ID || 'intel-nuc-001'
        },
        channels: options.channels || ['telegram', 'email'],
        priority: options.priority || (distancePercent <= 2 ? 'critical' : 'high'),
        tags: ['trade', 'update', 'stop-loss', 'warning', position.symbol.toLowerCase(), ...(options.tags || [])]
      };

      // Generate and send notifications
      await this.deliverEnhancedNotification(alert, marketData, systemMetrics);

      // Update statistics
      this.updateDeliveryStats(Date.now() - startTime, true);

      logger.info(`✅ Stop loss approaching notification sent: ${position.symbol}`);

    } catch (error) {
      this.updateDeliveryStats(0, false);
      logger.error(`❌ Failed to send stop loss approaching notification:`, error);
      throw error;
    }
  }

  /**
   * Send trade closed profit notification
   */
  public async sendTradeClosedProfitNotification(
    position: PositionInfo,
    exitPrice: number,
    realizedPnL: number,
    options: NotificationDeliveryOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Enhanced notification integration not initialized');
    }

    try {
      const startTime = Date.now();
      logger.info(`🎯 Sending trade closed profit notification: ${position.symbol}`);

      // Get real-time market data
      const marketData = options.includeMarketData !== false && this.marketDataProvider
        ? await this.marketDataProvider.getCurrentMarketData(position.symbol)
        : position.marketData;

      // Get system metrics
      const systemMetrics = options.includeSystemMetrics !== false && this.systemMetricsProvider
        ? await this.systemMetricsProvider.getCurrentSystemMetrics()
        : undefined;

      // Create enhanced alert
      const alert: EnhancedAlert = {
        id: `trade_closed_profit_${position.positionId}_${Date.now()}`,
        type: EnhancedAlertType.TRADE_CLOSED_PROFIT_TARGET_HIT,
        severity: AlertSeverity.MEDIUM,
        title: `🎯 Profit Target Hit: ${position.symbol}`,
        message: `Profit target reached for ${position.symbol}. Realized P&L: ${realizedPnL.toFixed(2)}`,
        position: {
          ...position,
          realizedPnL,
          currentPrice: exitPrice,
          marketData: marketData || position.marketData
        },
        marketData,
        systemInfo: {
          timestamp: new Date(),
          source: 'enhanced-notification-integration',
          environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
          version: process.env.npm_package_version || '1.0.0',
          instanceId: process.env.INSTANCE_ID || 'intel-nuc-001'
        },
        channels: options.channels || ['telegram', 'email'],
        priority: options.priority || 'normal',
        tags: ['trade', 'closed', 'profit', 'success', position.symbol.toLowerCase(), ...(options.tags || [])]
      };

      // Generate and send notifications
      await this.deliverEnhancedNotification(alert, marketData, systemMetrics);

      // Update statistics
      this.updateDeliveryStats(Date.now() - startTime, true);

      logger.info(`✅ Trade closed profit notification sent: ${position.symbol}`);

    } catch (error) {
      this.updateDeliveryStats(0, false);
      logger.error(`❌ Failed to send trade closed profit notification:`, error);
      throw error;
    }
  }

  /**
   * Send API error notification with system context
   */
  public async sendAPIErrorNotification(
    errorContext: ErrorContext,
    options: NotificationDeliveryOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Enhanced notification integration not initialized');
    }

    try {
      const startTime = Date.now();
      logger.info(`🚨 Sending API error notification: ${errorContext.component}`);

      // Get system metrics
      const systemMetrics = options.includeSystemMetrics !== false && this.systemMetricsProvider
        ? await this.systemMetricsProvider.getCurrentSystemMetrics()
        : undefined;

      // Create enhanced alert
      const alert: EnhancedAlert = {
        id: `api_error_${errorContext.component}_${Date.now()}`,
        type: EnhancedAlertType.ERROR_API_CONNECTION_FAILED,
        severity: AlertSeverity.CRITICAL,
        title: `🚨 API Connection Failed: ${errorContext.component}`,
        message: `API connection failed for ${errorContext.component}: ${errorContext.errorMessage}`,
        errorContext,
        systemInfo: {
          timestamp: new Date(),
          source: 'enhanced-notification-integration',
          environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
          version: process.env.npm_package_version || '1.0.0',
          instanceId: process.env.INSTANCE_ID || 'intel-nuc-001'
        },
        channels: options.channels || ['telegram', 'email'],
        priority: options.priority || 'critical',
        tags: ['error', 'api', 'connection', 'critical', errorContext.component.toLowerCase(), ...(options.tags || [])]
      };

      // Generate and send notifications
      await this.deliverEnhancedNotification(alert, undefined, systemMetrics);

      // Update statistics
      this.updateDeliveryStats(Date.now() - startTime, true);

      logger.info(`✅ API error notification sent: ${errorContext.component}`);

    } catch (error) {
      this.updateDeliveryStats(0, false);
      logger.error(`❌ Failed to send API error notification:`, error);
      throw error;
    }
  }

  /**
   * Deliver enhanced notification with template generation
   */
  private async deliverEnhancedNotification(
    alert: EnhancedAlert,
    marketData?: RealTimeMarketData,
    systemMetrics?: any
  ): Promise<void> {
    // Calculate template context
    const context = TemplateContextCalculator.calculateContext(alert, marketData, systemMetrics);

    // Initialize delivery status
    alert.deliveryStatus = {
      telegram: { sent: false },
      email: { sent: false },
      dashboard: { sent: false }
    };

    const deliveryPromises: Promise<any>[] = [];

    // Deliver to Telegram with enhanced template
    if (alert.channels.includes('telegram')) {
      deliveryPromises.push(
        this.deliverToTelegramWithTemplate(alert, context)
          .then(messageId => {
            alert.deliveryStatus!.telegram = { sent: true, messageId };
          })
          .catch(error => {
            alert.deliveryStatus!.telegram = { sent: false, error: error.message };
            logger.error('❌ Enhanced Telegram delivery failed:', error);
          })
      );
    }

    // Deliver to Email with enhanced template
    if (alert.channels.includes('email')) {
      deliveryPromises.push(
        this.deliverToEmailWithTemplate(alert, context)
          .then(messageId => {
            alert.deliveryStatus!.email = { sent: true, messageId };
          })
          .catch(error => {
            alert.deliveryStatus!.email = { sent: false, error: error.message };
            logger.error('❌ Enhanced Email delivery failed:', error);
          })
      );
    }

    // Wait for all deliveries
    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver to Telegram with enhanced template
   */
  private async deliverToTelegramWithTemplate(
    alert: EnhancedAlert,
    context: any
  ): Promise<number> {
    let message: string;

    // Generate message based on alert type
    switch (alert.type) {
      case EnhancedAlertType.NEW_TRADE_ORDER_PLACED:
        message = EnhancedTelegramTemplates.generateNewTradeOrderTemplate(context);
        break;
      case EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS:
        message = EnhancedTelegramTemplates.generateStopLossApproachingTemplate(context);
        break;
      case EnhancedAlertType.TRADE_CLOSED_PROFIT_TARGET_HIT:
        message = EnhancedTelegramTemplates.generateTradeClosedProfitTemplate(context);
        break;
      case EnhancedAlertType.ERROR_API_CONNECTION_FAILED:
        message = EnhancedTelegramTemplates.generateAPIErrorTemplate(context);
        break;
      default:
        message = `${alert.title}\n\n${alert.message}\n\n⏰ ${new Date().toLocaleString()}`;
    }

    // Send via Telegram service
    return await this.telegramService.sendNotification({
      id: alert.id,
      type: alert.type as any,
      priority: alert.priority as any,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      timestamp: new Date()
    });
  }

  /**
   * Deliver to Email with enhanced template
   */
  private async deliverToEmailWithTemplate(
    alert: EnhancedAlert,
    context: any
  ): Promise<string> {
    let htmlContent: string;

    // Generate HTML content based on alert type
    switch (alert.type) {
      case EnhancedAlertType.NEW_TRADE_ORDER_PLACED:
        htmlContent = EnhancedEmailTemplates.generateNewTradeOrderEmailTemplate(context);
        break;
      case EnhancedAlertType.TRADE_CLOSED_PROFIT_TARGET_HIT:
        htmlContent = EnhancedEmailTemplates.generateTradeClosedProfitEmailTemplate(context);
        break;
      default:
        // Use basic template for other types
        htmlContent = this.generateBasicEmailTemplate(alert, context);
    }

    // Send via Email service
    return await this.emailService.sendNotification({
      id: alert.id,
      type: alert.type as any,
      priority: alert.priority as any,
      to: [process.env.EMAIL_TO!],
      subject: alert.title,
      templateData: {
        htmlContent,
        systemName: 'AI Crypto Trading Agent - Intel NUC',
        timestamp: alert.systemInfo.timestamp.toISOString()
      },
      timestamp: new Date()
    });
  }

  /**
   * Generate basic email template for unsupported alert types
   */
  private generateBasicEmailTemplate(alert: EnhancedAlert, context: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${alert.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .footer { background: #343a40; color: white; padding: 15px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${alert.title}</h1>
        </div>
        <div class="content">
            <p>${alert.message}</p>
            <p><strong>Alert Type:</strong> ${alert.type}</p>
            <p><strong>Severity:</strong> ${alert.severity}</p>
            <p><strong>Time:</strong> ${alert.systemInfo.timestamp.toLocaleString()}</p>
        </div>
        <div class="footer">
            <p>AI Crypto Trading Agent - Intel NUC</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Update delivery statistics
   */
  private updateDeliveryStats(deliveryTime: number, success: boolean): void {
    this.deliveryStats.totalNotifications++;
    
    if (success) {
      this.deliveryStats.successfulDeliveries++;
      this.deliveryStats.averageDeliveryTime = 
        (this.deliveryStats.averageDeliveryTime + deliveryTime) / 2;
    } else {
      this.deliveryStats.failedDeliveries++;
    }
    
    this.deliveryStats.lastDeliveryTime = new Date();
  }

  /**
   * Get delivery statistics
   */
  public getDeliveryStatistics() {
    return { ...this.deliveryStats };
  }

  /**
   * Get alert service statistics
   */
  public getAlertStatistics() {
    return this.alertService.getStatistics();
  }

  /**
   * Get recent alert history
   */
  public getRecentAlerts(limit: number = 50) {
    return this.alertService.getAlertHistory(limit);
  }

  /**
   * Test notification system with sample data
   */
  public async testNotificationSystem(): Promise<void> {
    logger.info('🧪 Testing enhanced notification system...');

    // Test new trade order notification
    const testOrder: TradeOrderInfo = {
      orderId: 'test_order_123',
      symbol: 'BTC/USDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: 0.1,
      price: 45000,
      stopPrice: undefined,
      timeInForce: 'GTC',
      status: 'NEW',
      executedQuantity: 0,
      commission: 0,
      commissionAsset: 'USDT',
      timestamp: new Date(),
      updateTime: new Date(),
      strategy: 'AI Momentum Strategy',
      confidence: 0.85,
      riskReward: 2.5,
      stopLoss: 44000,
      takeProfit: 47000,
      positionSize: 5,
      maxRisk: 500
    };

    await this.sendNewTradeOrderNotification(testOrder, {
      channels: ['telegram'],
      tags: ['test']
    });

    logger.info('✅ Notification system test completed');
  }

  /**
   * Stop the enhanced notification integration
   */
  public async stop(): Promise<void> {
    try {
      await Promise.all([
        this.alertService.stop(),
        this.telegramService.stop()
      ]);
      
      this.isInitialized = false;
      logger.info('🛑 Enhanced notification integration stopped');
    } catch (error) {
      logger.error('❌ Error stopping enhanced notification integration:', error);
    }
  }
}

export default EnhancedNotificationIntegration;