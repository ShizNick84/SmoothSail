/**
 * =============================================================================
 * ENHANCED ALERT SERVICE
 * =============================================================================
 * 
 * Comprehensive alert service implementing all enhanced alert types with
 * real-time data integration, intelligent routing, and delivery tracking.
 * 
 * Features:
 * - Comprehensive alert type handling
 * - Real-time market data integration
 * - Intelligent alert routing and prioritization
 * - Rate limiting and deduplication
 * - Multi-channel delivery with tracking
 * - Template-based message generation
 * - Alert escalation and recovery
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Enhanced Alert System Implementation
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { 
  EnhancedAlert, 
  EnhancedAlertType, 
  AlertSeverity, 
  AlertTemplateRegistry,
  AlertDataValidator,
  AlertStatistics,
  EnhancedAlertConfig,
  RealTimeMarketData,
  TradeOrderInfo,
  PositionInfo,
  ErrorContext
} from './enhanced-alert-types';
import { TelegramService } from './telegram-service';
import { EmailService } from './email-service';
import { NotificationRouter } from './notification-router';

/**
 * Enhanced alert service class
 */
export class EnhancedAlertService {
  private telegramService: TelegramService;
  private emailService: EmailService;
  private notificationRouter: NotificationRouter;
  private config: EnhancedAlertConfig;
  private statistics: AlertStatistics;
  private alertHistory: Map<string, EnhancedAlert>;
  private rateLimitCache: Map<string, { count: number; resetTime: Date }>;
  private deduplicationCache: Map<string, { hash: string; lastSent: Date; count: number }>;
  private isInitialized: boolean = false;

  constructor(config?: Partial<EnhancedAlertConfig>) {
    this.telegramService = new TelegramService();
    this.emailService = new EmailService();
    this.notificationRouter = new NotificationRouter();
    
    // Default configuration
    this.config = {
      enabled: true,
      defaultChannels: ['telegram', 'email'],
      rateLimiting: {
        enabled: true,
        maxAlertsPerMinute: 10,
        maxAlertsPerHour: 100,
        cooldownPeriod: 60
      },
      deduplication: {
        enabled: true,
        windowMinutes: 5,
        similarityThreshold: 0.8
      },
      escalation: {
        enabled: true,
        escalationRules: [
          { severity: AlertSeverity.CRITICAL, delayMinutes: 5, additionalChannels: ['telegram', 'email'] },
          { severity: AlertSeverity.EMERGENCY, delayMinutes: 1, additionalChannels: ['telegram', 'email'] }
        ]
      },
      ...config
    };

    this.statistics = {
      totalAlerts: 0,
      alertsByType: {} as Record<EnhancedAlertType, number>,
      alertsBySeverity: {} as Record<AlertSeverity, number>,
      alertsByChannel: {},
      deliverySuccess: {
        telegram: { sent: 0, failed: 0 },
        email: { sent: 0, failed: 0 },
        dashboard: { sent: 0, failed: 0 }
      },
      averageDeliveryTime: 0,
      systemUptime: Date.now()
    };

    this.alertHistory = new Map();
    this.rateLimitCache = new Map();
    this.deduplicationCache = new Map();
  }

  /**
   * Initialize the enhanced alert service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🔔 Initializing enhanced alert service...');

      // Initialize alert templates
      AlertTemplateRegistry.initialize();

      // Initialize notification services
      await Promise.all([
        this.telegramService.initialize(),
        this.emailService.initialize(),
        this.notificationRouter.initialize()
      ]);

      // Start background tasks
      this.startBackgroundTasks();

      this.isInitialized = true;
      logger.info('✅ Enhanced alert service initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize enhanced alert service:', error);
      throw error;
    }
  }

  /**
   * Send new trade order placed alert
   */
  public async sendNewTradeOrderAlert(
    orderInfo: TradeOrderInfo,
    marketData: RealTimeMarketData
  ): Promise<void> {
    const alert: EnhancedAlert = {
      id: `new_trade_${orderInfo.orderId}_${Date.now()}`,
      type: EnhancedAlertType.NEW_TRADE_ORDER_PLACED,
      severity: AlertSeverity.HIGH,
      title: `🆕 New Trade Order Placed: ${orderInfo.symbol}`,
      message: `New ${orderInfo.side} order placed for ${orderInfo.symbol}`,
      tradeOrder: orderInfo,
      marketData,
      systemInfo: this.getSystemInfo(),
      channels: ['telegram', 'email'],
      priority: 'high',
      tags: ['trade', 'order', 'new', orderInfo.symbol.toLowerCase()]
    };

    await this.processAlert(alert);
  }

  /**
   * Send trade update alert for price approaching stop loss
   */
  public async sendTradeUpdateStopLossAlert(
    position: PositionInfo,
    distancePercent: number
  ): Promise<void> {
    const alert: EnhancedAlert = {
      id: `stop_loss_warning_${position.positionId}_${Date.now()}`,
      type: EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS,
      severity: distancePercent <= 2 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
      title: `⚠️ Price Approaching Stop Loss: ${position.symbol}`,
      message: `${position.symbol} price is ${distancePercent.toFixed(2)}% away from stop loss`,
      position,
      marketData: position.marketData,
      systemInfo: this.getSystemInfo(),
      channels: ['telegram', 'email'],
      priority: distancePercent <= 2 ? 'critical' : 'high',
      tags: ['trade', 'update', 'stop-loss', 'warning', position.symbol.toLowerCase()]
    };

    await this.processAlert(alert);
  }

  /**
   * Send trade update alert for price approaching take profit
   */
  public async sendTradeUpdateTakeProfitAlert(
    position: PositionInfo,
    distancePercent: number
  ): Promise<void> {
    const alert: EnhancedAlert = {
      id: `take_profit_approaching_${position.positionId}_${Date.now()}`,
      type: EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_TAKE_PROFIT,
      severity: AlertSeverity.MEDIUM,
      title: `🎯 Price Approaching Take Profit: ${position.symbol}`,
      message: `${position.symbol} price is ${distancePercent.toFixed(2)}% away from take profit`,
      position,
      marketData: position.marketData,
      systemInfo: this.getSystemInfo(),
      channels: ['telegram'],
      priority: 'normal',
      tags: ['trade', 'update', 'take-profit', 'approaching', position.symbol.toLowerCase()]
    };

    await this.processAlert(alert);
  }

  /**
   * Send trade closed alert for profit target hit
   */
  public async sendTradeClosedProfitAlert(
    position: PositionInfo,
    exitPrice: number,
    realizedPnL: number
  ): Promise<void> {
    const alert: EnhancedAlert = {
      id: `trade_closed_profit_${position.positionId}_${Date.now()}`,
      type: EnhancedAlertType.TRADE_CLOSED_PROFIT_TARGET_HIT,
      severity: AlertSeverity.MEDIUM,
      title: `🎯 Profit Target Hit: ${position.symbol}`,
      message: `Profit target reached for ${position.symbol}. Realized P&L: ${realizedPnL.toFixed(2)}`,
      position: {
        ...position,
        realizedPnL,
        currentPrice: exitPrice
      },
      marketData: position.marketData,
      systemInfo: this.getSystemInfo(),
      channels: ['telegram', 'email'],
      priority: 'normal',
      tags: ['trade', 'closed', 'profit', 'success', position.symbol.toLowerCase()]
    };

    await this.processAlert(alert);
  }

  /**
   * Send trade closed alert for stop loss triggered
   */
  public async sendTradeClosedStopLossAlert(
    position: PositionInfo,
    exitPrice: number,
    realizedPnL: number
  ): Promise<void> {
    const alert: EnhancedAlert = {
      id: `trade_closed_stop_loss_${position.positionId}_${Date.now()}`,
      type: EnhancedAlertType.TRADE_CLOSED_STOP_LOSS_TRIGGERED,
      severity: AlertSeverity.HIGH,
      title: `🛑 Stop Loss Triggered: ${position.symbol}`,
      message: `Stop loss triggered for ${position.symbol}. Realized P&L: ${realizedPnL.toFixed(2)}`,
      position: {
        ...position,
        realizedPnL,
        currentPrice: exitPrice
      },
      marketData: position.marketData,
      systemInfo: this.getSystemInfo(),
      channels: ['telegram', 'email'],
      priority: 'high',
      tags: ['trade', 'closed', 'stop-loss', 'risk-management', position.symbol.toLowerCase()]
    };

    await this.processAlert(alert);
  }

  /**
   * Send API connection error alert
   */
  public async sendAPIConnectionErrorAlert(errorContext: ErrorContext): Promise<void> {
    const alert: EnhancedAlert = {
      id: `api_error_${errorContext.component}_${Date.now()}`,
      type: EnhancedAlertType.ERROR_API_CONNECTION_FAILED,
      severity: AlertSeverity.CRITICAL,
      title: `🚨 API Connection Failed: ${errorContext.component}`,
      message: `API connection failed for ${errorContext.component}: ${errorContext.errorMessage}`,
      errorContext,
      systemInfo: this.getSystemInfo(),
      channels: ['telegram', 'email'],
      priority: 'critical',
      tags: ['error', 'api', 'connection', 'critical', errorContext.component.toLowerCase()]
    };

    await this.processAlert(alert);
  }

  /**
   * Send network connectivity error alert
   */
  public async sendNetworkErrorAlert(errorContext: ErrorContext): Promise<void> {
    const alert: EnhancedAlert = {
      id: `network_error_${Date.now()}`,
      type: EnhancedAlertType.ERROR_NETWORK_CONNECTIVITY,
      severity: AlertSeverity.HIGH,
      title: `🌐 Network Connectivity Issue`,
      message: `Network connectivity issue detected: ${errorContext.errorMessage}`,
      errorContext,
      systemInfo: this.getSystemInfo(),
      channels: ['telegram', 'email'],
      priority: 'high',
      tags: ['error', 'network', 'connectivity', 'infrastructure']
    };

    await this.processAlert(alert);
  }

  /**
   * Send SSH tunnel failure alert
   */
  public async sendSSHTunnelErrorAlert(errorContext: ErrorContext): Promise<void> {
    const alert: EnhancedAlert = {
      id: `ssh_tunnel_error_${Date.now()}`,
      type: EnhancedAlertType.ERROR_SSH_TUNNEL_FAILURE,
      severity: AlertSeverity.CRITICAL,
      title: `🔒 SSH Tunnel Failure`,
      message: `SSH tunnel connection failed: ${errorContext.errorMessage}`,
      errorContext,
      systemInfo: this.getSystemInfo(),
      channels: ['telegram', 'email'],
      priority: 'critical',
      tags: ['error', 'ssh', 'tunnel', 'critical', 'infrastructure']
    };

    await this.processAlert(alert);
  }

  /**
   * Process alert through the enhanced system
   */
  private async processAlert(alert: EnhancedAlert): Promise<void> {
    if (!this.isInitialized || !this.config.enabled) {
      logger.warn('⚠️ Enhanced alert service not initialized or disabled');
      return;
    }

    try {
      logger.info(`🔔 Processing enhanced alert: ${alert.type} (${alert.severity})`);

      // Validate alert data
      const validation = AlertDataValidator.validateAlert(alert);
      if (!validation.valid) {
        logger.error('❌ Alert validation failed:', validation.errors);
        return;
      }

      // Check rate limiting
      if (this.config.rateLimiting.enabled && this.isRateLimited(alert)) {
        logger.warn(`⚠️ Alert rate limited: ${alert.id}`);
        return;
      }

      // Check deduplication
      if (this.config.deduplication.enabled && this.isDuplicate(alert)) {
        logger.info(`🔄 Alert deduplicated: ${alert.id}`);
        return;
      }

      // Store alert in history
      this.alertHistory.set(alert.id, alert);

      // Update statistics
      this.updateStatistics(alert);

      // Generate and send notifications
      await this.deliverAlert(alert);

      // Schedule escalation if needed
      if (this.config.escalation.enabled && this.shouldEscalate(alert)) {
        await this.scheduleEscalation(alert);
      }

      logger.info(`✅ Enhanced alert processed successfully: ${alert.id}`);

    } catch (error) {
      logger.error(`❌ Failed to process enhanced alert:`, error);
      throw error;
    }
  }

  /**
   * Deliver alert to configured channels
   */
  private async deliverAlert(alert: EnhancedAlert): Promise<void> {
    const deliveryPromises: Promise<any>[] = [];
    const startTime = Date.now();

    // Initialize delivery status
    alert.deliveryStatus = {
      telegram: { sent: false },
      email: { sent: false },
      dashboard: { sent: false }
    };

    // Deliver to Telegram
    if (alert.channels.includes('telegram')) {
      deliveryPromises.push(
        this.deliverToTelegram(alert)
          .then(messageId => {
            alert.deliveryStatus!.telegram = { sent: true, messageId };
            this.statistics.deliverySuccess.telegram.sent++;
          })
          .catch(error => {
            alert.deliveryStatus!.telegram = { sent: false, error: error.message };
            this.statistics.deliverySuccess.telegram.failed++;
            logger.error('❌ Telegram delivery failed:', error);
          })
      );
    }

    // Deliver to Email
    if (alert.channels.includes('email')) {
      deliveryPromises.push(
        this.deliverToEmail(alert)
          .then(messageId => {
            alert.deliveryStatus!.email = { sent: true, messageId };
            this.statistics.deliverySuccess.email.sent++;
          })
          .catch(error => {
            alert.deliveryStatus!.email = { sent: false, error: error.message };
            this.statistics.deliverySuccess.email.failed++;
            logger.error('❌ Email delivery failed:', error);
          })
      );
    }

    // Wait for all deliveries to complete
    await Promise.allSettled(deliveryPromises);

    // Update average delivery time
    const deliveryTime = Date.now() - startTime;
    this.statistics.averageDeliveryTime = 
      (this.statistics.averageDeliveryTime + deliveryTime) / 2;
  }

  /**
   * Deliver alert to Telegram with enhanced formatting
   */
  private async deliverToTelegram(alert: EnhancedAlert): Promise<number> {
    const template = AlertTemplateRegistry.getTemplate(alert.type);
    if (!template) {
      throw new Error(`No Telegram template found for alert type: ${alert.type}`);
    }

    // Generate message from template
    const message = this.generateTelegramMessage(alert, template.telegramTemplate);

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
   * Deliver alert to Email with enhanced formatting
   */
  private async deliverToEmail(alert: EnhancedAlert): Promise<string> {
    const template = AlertTemplateRegistry.getTemplate(alert.type);
    if (!template) {
      throw new Error(`No Email template found for alert type: ${alert.type}`);
    }

    // Generate email content
    const templateData = this.generateEmailTemplateData(alert);

    // Send via Email service
    return await this.emailService.sendNotification({
      id: alert.id,
      type: alert.type as any,
      priority: alert.priority as any,
      to: [process.env.EMAIL_TO!],
      subject: alert.title,
      templateData,
      timestamp: new Date()
    });
  }

  /**
   * Generate Telegram message from template and alert data
   */
  private generateTelegramMessage(alert: EnhancedAlert, template: string): string {
    let message = template;

    // Replace basic alert fields
    message = message.replace(/{{id}}/g, alert.id);
    message = message.replace(/{{title}}/g, alert.title);
    message = message.replace(/{{message}}/g, alert.message);
    message = message.replace(/{{severity}}/g, alert.severity);
    message = message.replace(/{{timestamp}}/g, alert.systemInfo.timestamp.toLocaleString());

    // Replace trade order fields
    if (alert.tradeOrder) {
      const order = alert.tradeOrder;
      message = message.replace(/{{symbol}}/g, order.symbol);
      message = message.replace(/{{side}}/g, order.side);
      message = message.replace(/{{type}}/g, order.type);
      message = message.replace(/{{quantity}}/g, order.quantity.toString());
      message = message.replace(/{{price}}/g, order.price?.toFixed(4) || 'Market');
      message = message.replace(/{{strategy}}/g, order.strategy);
      message = message.replace(/{{confidence}}/g, (order.confidence * 100).toFixed(1));
      message = message.replace(/{{riskReward}}/g, order.riskReward.toFixed(2));
      message = message.replace(/{{stopLoss}}/g, order.stopLoss?.toFixed(4) || 'N/A');
      message = message.replace(/{{takeProfit}}/g, order.takeProfit?.toFixed(4) || 'N/A');
    }

    // Replace position fields
    if (alert.position) {
      const position = alert.position;
      message = message.replace(/{{symbol}}/g, position.symbol);
      message = message.replace(/{{positionSize}}/g, position.size.toString());
      message = message.replace(/{{entryPrice}}/g, position.entryPrice.toFixed(4));
      message = message.replace(/{{currentPrice}}/g, position.currentPrice.toFixed(4));
      message = message.replace(/{{unrealizedPnL}}/g, position.unrealizedPnL.toFixed(2));
      message = message.replace(/{{realizedPnL}}/g, position.realizedPnL?.toFixed(2) || '0.00');
      message = message.replace(/{{stopLoss}}/g, position.stopLoss.toFixed(4));
      message = message.replace(/{{takeProfit}}/g, position.takeProfit.toFixed(4));
      message = message.replace(/{{duration}}/g, this.formatDuration(position.duration));
      message = message.replace(/{{maxProfit}}/g, position.maxProfit.toFixed(2));
      message = message.replace(/{{maxDrawdown}}/g, position.maxDrawdown.toFixed(2));

      // Calculate distance to stop loss
      const distanceToStopLoss = Math.abs((position.currentPrice - position.stopLoss) / position.currentPrice * 100);
      message = message.replace(/{{distanceToStopLoss}}/g, distanceToStopLoss.toFixed(2));
    }

    // Replace market data fields
    if (alert.marketData) {
      const market = alert.marketData;
      message = message.replace(/{{currentPrice}}/g, market.currentPrice.toFixed(4));
      message = message.replace(/{{priceChange24h}}/g, market.priceChangePercent24h.toFixed(2));
      message = message.replace(/{{volume24h}}/g, this.formatVolume(market.volume24h));
      message = message.replace(/{{support}}/g, market.technicalIndicators?.support.toFixed(4) || 'N/A');
      message = message.replace(/{{resistance}}/g, market.technicalIndicators?.resistance.toFixed(4) || 'N/A');
    }

    // Replace error context fields
    if (alert.errorContext) {
      const error = alert.errorContext;
      message = message.replace(/{{component}}/g, error.component);
      message = message.replace(/{{errorMessage}}/g, error.errorMessage);
      message = message.replace(/{{errorCode}}/g, error.errorCode);
      message = message.replace(/{{retryAttempts}}/g, error.retryAttempts.toString());
      message = message.replace(/{{maxRetries}}/g, error.maxRetries.toString());
      message = message.replace(/{{nextRetryTime}}/g, error.nextRetryTime?.toLocaleTimeString() || 'N/A');
      message = message.replace(/{{recoveryAction}}/g, error.recoveryAction || 'Automatic retry');
      message = message.replace(/{{systemLoad}}/g, error.systemLoad?.toFixed(1) || 'N/A');
      message = message.replace(/{{networkLatency}}/g, error.networkLatency?.toString() || 'N/A');
      message = message.replace(/{{memoryUsage}}/g, error.memoryUsage?.toFixed(1) || 'N/A');
    }

    return message;
  }

  /**
   * Generate email template data from alert
   */
  private generateEmailTemplateData(alert: EnhancedAlert): Record<string, any> {
    const data: Record<string, any> = {
      systemName: 'AI Crypto Trading Agent - Intel NUC',
      timestamp: alert.systemInfo.timestamp.toISOString(),
      theme: 'light',
      alertId: alert.id,
      alertType: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message
    };

    // Add trade order data
    if (alert.tradeOrder) {
      Object.assign(data, {
        symbol: alert.tradeOrder.symbol,
        side: alert.tradeOrder.side,
        quantity: alert.tradeOrder.quantity,
        price: alert.tradeOrder.price,
        strategy: alert.tradeOrder.strategy,
        confidence: alert.tradeOrder.confidence * 100
      });
    }

    // Add position data
    if (alert.position) {
      Object.assign(data, {
        symbol: alert.position.symbol,
        entryPrice: alert.position.entryPrice,
        currentPrice: alert.position.currentPrice,
        unrealizedPnL: alert.position.unrealizedPnL,
        realizedPnL: alert.position.realizedPnL
      });
    }

    // Add market data
    if (alert.marketData) {
      Object.assign(data, {
        marketPrice: alert.marketData.currentPrice,
        priceChange24h: alert.marketData.priceChangePercent24h,
        volume24h: alert.marketData.volume24h
      });
    }

    // Add error context
    if (alert.errorContext) {
      Object.assign(data, {
        errorComponent: alert.errorContext.component,
        errorMessage: alert.errorContext.errorMessage,
        errorCode: alert.errorContext.errorCode
      });
    }

    return data;
  }

  /**
   * Check if alert should be rate limited
   */
  private isRateLimited(alert: EnhancedAlert): boolean {
    const key = `${alert.type}_${alert.severity}`;
    const now = new Date();
    const entry = this.rateLimitCache.get(key);

    if (entry) {
      // Check if window has expired
      if (now.getTime() - entry.resetTime.getTime() > 60000) { // 1 minute window
        entry.count = 1;
        entry.resetTime = now;
        return false;
      }

      // Check rate limit
      if (entry.count >= this.config.rateLimiting.maxAlertsPerMinute) {
        return true;
      }

      entry.count++;
      return false;
    } else {
      this.rateLimitCache.set(key, { count: 1, resetTime: now });
      return false;
    }
  }

  /**
   * Check if alert is duplicate
   */
  private isDuplicate(alert: EnhancedAlert): boolean {
    const hash = this.generateAlertHash(alert);
    const entry = this.deduplicationCache.get(hash);
    const now = new Date();

    if (entry) {
      const timeDiff = now.getTime() - entry.lastSent.getTime();
      const windowMs = this.config.deduplication.windowMinutes * 60 * 1000;

      if (timeDiff < windowMs) {
        entry.count++;
        return true;
      } else {
        entry.lastSent = now;
        entry.count = 1;
        return false;
      }
    } else {
      this.deduplicationCache.set(hash, { hash, lastSent: now, count: 1 });
      return false;
    }
  }

  /**
   * Generate hash for alert deduplication
   */
  private generateAlertHash(alert: EnhancedAlert): string {
    const hashData = {
      type: alert.type,
      severity: alert.severity,
      symbol: alert.tradeOrder?.symbol || alert.position?.symbol || 'system',
      component: alert.errorContext?.component || 'general'
    };

    return Buffer.from(JSON.stringify(hashData)).toString('base64');
  }

  /**
   * Check if alert should be escalated
   */
  private shouldEscalate(alert: EnhancedAlert): boolean {
    return this.config.escalation.escalationRules.some(
      rule => rule.severity === alert.severity
    );
  }

  /**
   * Schedule alert escalation
   */
  private async scheduleEscalation(alert: EnhancedAlert): Promise<void> {
    const rule = this.config.escalation.escalationRules.find(
      r => r.severity === alert.severity
    );

    if (rule) {
      setTimeout(async () => {
        logger.warn(`⚠️ Escalating alert: ${alert.id}`);
        // Resend to additional channels
        // Implementation would depend on specific escalation requirements
      }, rule.delayMinutes * 60 * 1000);
    }
  }

  /**
   * Update alert statistics
   */
  private updateStatistics(alert: EnhancedAlert): void {
    this.statistics.totalAlerts++;
    this.statistics.alertsByType[alert.type] = (this.statistics.alertsByType[alert.type] || 0) + 1;
    this.statistics.alertsBySeverity[alert.severity] = (this.statistics.alertsBySeverity[alert.severity] || 0) + 1;
    
    alert.channels.forEach(channel => {
      this.statistics.alertsByChannel[channel] = (this.statistics.alertsByChannel[channel] || 0) + 1;
    });

    this.statistics.lastAlert = new Date();
  }

  /**
   * Get system information
   */
  private getSystemInfo() {
    return {
      timestamp: new Date(),
      source: 'enhanced-alert-service',
      environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
      version: process.env.npm_package_version || '1.0.0',
      instanceId: process.env.INSTANCE_ID || 'intel-nuc-001'
    };
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  }

  /**
   * Format volume in human-readable format
   */
  private formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    } else {
      return volume.toFixed(2);
    }
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Clean up caches every hour
    setInterval(() => {
      this.cleanupCaches();
    }, 60 * 60 * 1000);

    // Update statistics every 5 minutes
    setInterval(() => {
      this.updateSystemStatistics();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCaches(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean rate limit cache
    for (const [key, entry] of this.rateLimitCache.entries()) {
      if (now - entry.resetTime.getTime() > maxAge) {
        this.rateLimitCache.delete(key);
      }
    }

    // Clean deduplication cache
    for (const [key, entry] of this.deduplicationCache.entries()) {
      if (now - entry.lastSent.getTime() > maxAge) {
        this.deduplicationCache.delete(key);
      }
    }

    // Clean alert history (keep last 1000 alerts)
    if (this.alertHistory.size > 1000) {
      const entries = Array.from(this.alertHistory.entries());
      entries.sort((a, b) => b[1].systemInfo.timestamp.getTime() - a[1].systemInfo.timestamp.getTime());
      
      this.alertHistory.clear();
      entries.slice(0, 1000).forEach(([key, value]) => {
        this.alertHistory.set(key, value);
      });
    }

    logger.info('🧹 Enhanced alert service caches cleaned up');
  }

  /**
   * Update system statistics
   */
  private updateSystemStatistics(): void {
    this.statistics.systemUptime = Date.now() - this.statistics.systemUptime;
  }

  /**
   * Get alert statistics
   */
  public getStatistics(): AlertStatistics {
    return { ...this.statistics };
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit: number = 100): EnhancedAlert[] {
    const alerts = Array.from(this.alertHistory.values());
    return alerts
      .sort((a, b) => b.systemInfo.timestamp.getTime() - a.systemInfo.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Stop the enhanced alert service
   */
  public async stop(): Promise<void> {
    try {
      await Promise.all([
        this.telegramService.stop(),
        this.notificationRouter.stop()
      ]);
      
      this.isInitialized = false;
      logger.info('🛑 Enhanced alert service stopped');
    } catch (error) {
      logger.error('❌ Error stopping enhanced alert service:', error);
    }
  }
}

export default EnhancedAlertService;