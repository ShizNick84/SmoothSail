/**
 * =============================================================================
 * MULTI-CHANNEL NOTIFICATION ROUTER
 * =============================================================================
 * 
 * Implements priority-based notification routing, alert deduplication,
 * rate limiting, and escalation procedures for the AI crypto trading agent.
 * 
 * Features:
 * - Priority-based routing across multiple channels
 * - Alert deduplication and rate limiting
 * - Escalation procedures for critical alerts
 * - Notification preference management
 * - Delivery confirmation and retry logic
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { EmailService, EmailNotificationType, EmailPriority } from './email-service';
import { TelegramService, TelegramNotificationType, TelegramPriority } from './telegram-service';

/**
 * Notification channels available for routing
 */
export enum NotificationChannel {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  SMS = 'sms', // Future implementation
  WEBHOOK = 'webhook', // Future implementation
  DASHBOARD = 'dashboard' // Future implementation
}

/**
 * Alert priority levels for routing decisions
 */
export enum AlertPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Alert categories for classification and routing
 */
export enum AlertCategory {
  TRADING = 'trading',
  SECURITY = 'security',
  SYSTEM = 'system',
  PERFORMANCE = 'performance',
  NETWORK = 'network',
  MAINTENANCE = 'maintenance'
}

/**
 * Notification routing rule structure
 */
export interface NotificationRule {
  id: string;
  name: string;
  category: AlertCategory;
  priority: AlertPriority;
  channels: NotificationChannel[];
  conditions?: NotificationCondition[];
  escalation?: EscalationRule;
  rateLimit?: RateLimitRule;
  enabled: boolean;
}

/**
 * Notification condition for rule matching
 */
export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value: any;
}

/**
 * Escalation rule for critical alerts
 */
export interface EscalationRule {
  enabled: boolean;
  delayMinutes: number;
  maxEscalations: number;
  escalationChannels: NotificationChannel[];
  escalationRecipients?: string[];
}

/**
 * Rate limiting rule to prevent spam
 */
export interface RateLimitRule {
  enabled: boolean;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
  windowMinutes: number;
}

/**
 * Alert structure for routing
 */
export interface Alert {
  id: string;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  message: string;
  data: Record<string, any>;
  timestamp: Date;
  source: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Notification delivery result
 */
export interface DeliveryResult {
  alertId: string;
  channel: NotificationChannel;
  success: boolean;
  messageId?: string | number;
  error?: string;
  timestamp: Date;
  retryCount: number;
}

/**
 * Alert deduplication entry
 */
interface DeduplicationEntry {
  alertHash: string;
  firstSeen: Date;
  lastSeen: Date;
  count: number;
  suppressed: boolean;
}

/**
 * Rate limiting entry
 */
interface RateLimitEntry {
  key: string;
  count: number;
  windowStart: Date;
  blocked: boolean;
}

/**
 * Escalation tracking entry
 */
interface EscalationEntry {
  alertId: string;
  escalationLevel: number;
  nextEscalationTime: Date;
  completed: boolean;
}

/**
 * Multi-channel notification router class
 */
export class NotificationRouter {
  private emailService: EmailService;
  private telegramService: TelegramService;
  private routingRules: Map<string, NotificationRule>;
  private deduplicationCache: Map<string, DeduplicationEntry>;
  private rateLimitCache: Map<string, RateLimitEntry>;
  private escalationQueue: Map<string, EscalationEntry>;
  private deliveryHistory: DeliveryResult[];
  private isInitialized: boolean = false;

  constructor() {
    this.emailService = new EmailService();
    this.telegramService = new TelegramService();
    this.routingRules = new Map();
    this.deduplicationCache = new Map();
    this.rateLimitCache = new Map();
    this.escalationQueue = new Map();
    this.deliveryHistory = [];
  }

  /**
   * Initialize the notification router
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🔀 Initializing notification router...');

      // Initialize notification services
      await this.emailService.initialize();
      await this.telegramService.initialize();

      // Load routing rules
      await this.loadRoutingRules();

      // Start background tasks
      this.startBackgroundTasks();

      this.isInitialized = true;
      logger.info('✅ Notification router initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize notification router:', error);
      throw error;
    }
  }

  /**
   * Route alert through appropriate channels based on rules
   */
  public async routeAlert(alert: Alert): Promise<DeliveryResult[]> {
    if (!this.isInitialized) {
      throw new Error('Notification router not initialized');
    }

    try {
      logger.info(`🔀 Routing alert: ${alert.id} (${alert.category}/${alert.priority})`);

      // Check for deduplication
      if (await this.isDuplicate(alert)) {
        logger.info(`🔄 Alert ${alert.id} is duplicate, skipping`);
        return [];
      }

      // Find matching routing rules
      const matchingRules = this.findMatchingRules(alert);
      
      if (matchingRules.length === 0) {
        logger.warn(`⚠️ No routing rules found for alert: ${alert.id}`);
        return [];
      }

      // Apply rate limiting
      const allowedRules = await this.applyRateLimit(alert, matchingRules);

      // Route to channels
      const deliveryResults: DeliveryResult[] = [];
      
      for (const rule of allowedRules) {
        for (const channel of rule.channels) {
          try {
            const result = await this.deliverToChannel(alert, channel, rule);
            deliveryResults.push(result);
          } catch (error) {
            logger.error(`❌ Failed to deliver to ${channel}:`, error);
            deliveryResults.push({
              alertId: alert.id,
              channel,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
              retryCount: 0
            });
          }
        }

        // Set up escalation if configured
        if (rule.escalation?.enabled && alert.priority === AlertPriority.CRITICAL) {
          await this.scheduleEscalation(alert, rule);
        }
      }

      // Store delivery history
      this.deliveryHistory.push(...deliveryResults);

      // Clean up old history (keep last 1000 entries)
      if (this.deliveryHistory.length > 1000) {
        this.deliveryHistory = this.deliveryHistory.slice(-1000);
      }

      logger.info(`✅ Alert ${alert.id} routed to ${deliveryResults.length} channels`);
      return deliveryResults;

    } catch (error) {
      logger.error(`❌ Failed to route alert ${alert.id}:`, error);
      throw error;
    }
  }

  /**
   * Send trading notification (convenience method)
   */
  public async sendTradingNotification(data: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    pnl?: number;
    balance: number;
    strategy: string;
  }): Promise<DeliveryResult[]> {
    const alert: Alert = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: AlertCategory.TRADING,
      priority: AlertPriority.HIGH,
      title: `Trade Executed: ${data.action} ${data.symbol}`,
      message: `${data.action} ${data.quantity} ${data.symbol} at $${data.price}`,
      data,
      timestamp: new Date(),
      source: 'trading-engine',
      tags: ['trade', 'execution', data.symbol.toLowerCase()]
    };

    return await this.routeAlert(alert);
  }

  /**
   * Send security alert (convenience method)
   */
  public async sendSecurityAlert(data: {
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentType: string;
    description: string;
    affectedSystems: string[];
  }): Promise<DeliveryResult[]> {
    const priorityMap = {
      LOW: AlertPriority.LOW,
      MEDIUM: AlertPriority.NORMAL,
      HIGH: AlertPriority.HIGH,
      CRITICAL: AlertPriority.CRITICAL
    };

    const alert: Alert = {
      id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: AlertCategory.SECURITY,
      priority: priorityMap[data.threatLevel],
      title: `Security Alert: ${data.incidentType}`,
      message: data.description,
      data,
      timestamp: new Date(),
      source: 'security-manager',
      tags: ['security', 'threat', data.incidentType.toLowerCase()]
    };

    return await this.routeAlert(alert);
  }

  /**
   * Send system health alert (convenience method)
   */
  public async sendSystemHealthAlert(data: {
    component: string;
    status: 'healthy' | 'warning' | 'critical';
    metrics: Record<string, number>;
    message: string;
  }): Promise<DeliveryResult[]> {
    const priorityMap = {
      healthy: AlertPriority.LOW,
      warning: AlertPriority.NORMAL,
      critical: AlertPriority.HIGH
    };

    const alert: Alert = {
      id: `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: AlertCategory.SYSTEM,
      priority: priorityMap[data.status],
      title: `System Health: ${data.component}`,
      message: data.message,
      data,
      timestamp: new Date(),
      source: 'system-monitor',
      tags: ['health', 'system', data.component.toLowerCase()]
    };

    return await this.routeAlert(alert);
  }

  /**
   * Check if alert is duplicate based on content hash
   */
  private async isDuplicate(alert: Alert): Promise<boolean> {
    const alertHash = this.generateAlertHash(alert);
    const existing = this.deduplicationCache.get(alertHash);

    if (existing) {
      // Update existing entry
      existing.lastSeen = new Date();
      existing.count++;

      // Suppress if seen recently (within 5 minutes for same alert)
      const timeDiff = Date.now() - existing.firstSeen.getTime();
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        existing.suppressed = true;
        return true;
      }
    } else {
      // Create new entry
      this.deduplicationCache.set(alertHash, {
        alertHash,
        firstSeen: new Date(),
        lastSeen: new Date(),
        count: 1,
        suppressed: false
      });
    }

    return false;
  }

  /**
   * Generate hash for alert deduplication
   */
  private generateAlertHash(alert: Alert): string {
    const hashData = {
      category: alert.category,
      title: alert.title,
      source: alert.source,
      // Include some data fields but not timestamp
      dataHash: JSON.stringify(alert.data)
    };

    return Buffer.from(JSON.stringify(hashData)).toString('base64');
  }

  /**
   * Find routing rules that match the alert
   */
  private findMatchingRules(alert: Alert): NotificationRule[] {
    const matchingRules: NotificationRule[] = [];

    for (const rule of this.routingRules.values()) {
      if (!rule.enabled) continue;

      // Check category match
      if (rule.category !== alert.category) continue;

      // Check priority match (route if alert priority >= rule priority)
      const priorityOrder = [
        AlertPriority.LOW,
        AlertPriority.NORMAL,
        AlertPriority.HIGH,
        AlertPriority.CRITICAL,
        AlertPriority.EMERGENCY
      ];

      const alertPriorityIndex = priorityOrder.indexOf(alert.priority);
      const rulePriorityIndex = priorityOrder.indexOf(rule.priority);

      if (alertPriorityIndex < rulePriorityIndex) continue;

      // Check conditions if specified
      if (rule.conditions && !this.evaluateConditions(alert, rule.conditions)) {
        continue;
      }

      matchingRules.push(rule);
    }

    return matchingRules;
  }

  /**
   * Evaluate rule conditions against alert
   */
  private evaluateConditions(alert: Alert, conditions: NotificationCondition[]): boolean {
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(alert, condition.field);
      
      if (!this.evaluateCondition(fieldValue, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get field value from alert for condition evaluation
   */
  private getFieldValue(alert: Alert, field: string): any {
    const parts = field.split('.');
    let value: any = alert;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(fieldValue: any, condition: NotificationCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Apply rate limiting to rules
   */
  private async applyRateLimit(alert: Alert, rules: NotificationRule[]): Promise<NotificationRule[]> {
    const allowedRules: NotificationRule[] = [];

    for (const rule of rules) {
      if (!rule.rateLimit?.enabled) {
        allowedRules.push(rule);
        continue;
      }

      const rateLimitKey = `${rule.id}_${alert.category}`;
      const now = new Date();
      const existing = this.rateLimitCache.get(rateLimitKey);

      if (existing) {
        const windowElapsed = now.getTime() - existing.windowStart.getTime();
        const windowMinutes = rule.rateLimit.windowMinutes || 60;

        // Reset window if expired
        if (windowElapsed > windowMinutes * 60 * 1000) {
          existing.count = 0;
          existing.windowStart = now;
          existing.blocked = false;
        }

        // Check limits
        const minuteLimit = rule.rateLimit.maxPerMinute || Infinity;
        const hourLimit = rule.rateLimit.maxPerHour || Infinity;
        const dayLimit = rule.rateLimit.maxPerDay || Infinity;

        if (existing.count >= Math.min(minuteLimit, hourLimit, dayLimit)) {
          existing.blocked = true;
          logger.warn(`⚠️ Rate limit exceeded for rule ${rule.id}`);
          continue;
        }

        existing.count++;
      } else {
        this.rateLimitCache.set(rateLimitKey, {
          key: rateLimitKey,
          count: 1,
          windowStart: now,
          blocked: false
        });
      }

      allowedRules.push(rule);
    }

    return allowedRules;
  }

  /**
   * Deliver alert to specific channel
   */
  private async deliverToChannel(
    alert: Alert,
    channel: NotificationChannel,
    rule: NotificationRule
  ): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      let messageId: string | number | undefined;

      switch (channel) {
        case NotificationChannel.EMAIL:
          messageId = await this.deliverToEmail(alert);
          break;
        case NotificationChannel.TELEGRAM:
          messageId = await this.deliverToTelegram(alert);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      return {
        alertId: alert.id,
        channel,
        success: true,
        messageId,
        timestamp: new Date(),
        retryCount: 0
      };

    } catch (error) {
      return {
        alertId: alert.id,
        channel,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryCount: 0
      };
    }
  }

  /**
   * Deliver alert to email
   */
  private async deliverToEmail(alert: Alert): Promise<string> {
    switch (alert.category) {
      case AlertCategory.TRADING:
        return await this.emailService.sendTradeExecutionNotification({
          symbol: alert.data.symbol,
          action: alert.data.action,
          quantity: alert.data.quantity,
          price: alert.data.price,
          pnl: alert.data.pnl,
          balance: alert.data.balance,
          strategy: alert.data.strategy,
          timestamp: alert.timestamp
        });

      case AlertCategory.SECURITY:
        return await this.emailService.sendSecurityAlert({
          threatLevel: alert.data.threatLevel,
          incidentType: alert.data.incidentType,
          description: alert.message,
          affectedSystems: alert.data.affectedSystems,
          timestamp: alert.timestamp
        });

      default:
        // Generic email notification
        throw new Error(`Email delivery not implemented for category: ${alert.category}`);
    }
  }

  /**
   * Deliver alert to Telegram
   */
  private async deliverToTelegram(alert: Alert): Promise<number> {
    switch (alert.category) {
      case AlertCategory.TRADING:
        return await this.telegramService.sendTradeExecutionNotification(alert.data);

      case AlertCategory.SECURITY:
        return await this.telegramService.sendSecurityAlert({
          threatLevel: alert.data.threatLevel,
          incidentType: alert.data.incidentType,
          description: alert.message,
          affectedSystems: alert.data.affectedSystems,
          timestamp: alert.timestamp
        });

      case AlertCategory.SYSTEM:
        return await this.telegramService.sendSystemHealth(alert.data);

      default:
        throw new Error(`Telegram delivery not implemented for category: ${alert.category}`);
    }
  }

  /**
   * Schedule escalation for critical alerts
   */
  private async scheduleEscalation(alert: Alert, rule: NotificationRule): Promise<void> {
    if (!rule.escalation) return;

    const escalationTime = new Date(Date.now() + rule.escalation.delayMinutes * 60 * 1000);

    this.escalationQueue.set(alert.id, {
      alertId: alert.id,
      escalationLevel: 1,
      nextEscalationTime: escalationTime,
      completed: false
    });

    logger.info(`⏰ Escalation scheduled for alert ${alert.id} at ${escalationTime.toISOString()}`);
  }

  /**
   * Load default routing rules
   */
  private async loadRoutingRules(): Promise<void> {
    // Trading alerts - high priority, both channels
    this.routingRules.set('trading-high', {
      id: 'trading-high',
      name: 'High Priority Trading Alerts',
      category: AlertCategory.TRADING,
      priority: AlertPriority.HIGH,
      channels: [NotificationChannel.EMAIL, NotificationChannel.TELEGRAM],
      rateLimit: {
        enabled: true,
        maxPerMinute: 10,
        maxPerHour: 100,
        maxPerDay: 1000,
        windowMinutes: 60
      },
      enabled: true
    });

    // Security alerts - critical priority, both channels with escalation
    this.routingRules.set('security-critical', {
      id: 'security-critical',
      name: 'Critical Security Alerts',
      category: AlertCategory.SECURITY,
      priority: AlertPriority.HIGH,
      channels: [NotificationChannel.EMAIL, NotificationChannel.TELEGRAM],
      escalation: {
        enabled: true,
        delayMinutes: 15,
        maxEscalations: 3,
        escalationChannels: [NotificationChannel.TELEGRAM]
      },
      rateLimit: {
        enabled: true,
        maxPerMinute: 5,
        maxPerHour: 50,
        maxPerDay: 200,
        windowMinutes: 60
      },
      enabled: true
    });

    // System health - normal priority, Telegram only
    this.routingRules.set('system-health', {
      id: 'system-health',
      name: 'System Health Alerts',
      category: AlertCategory.SYSTEM,
      priority: AlertPriority.NORMAL,
      channels: [NotificationChannel.TELEGRAM],
      rateLimit: {
        enabled: true,
        maxPerMinute: 2,
        maxPerHour: 20,
        maxPerDay: 100,
        windowMinutes: 60
      },
      enabled: true
    });

    logger.info(`✅ Loaded ${this.routingRules.size} routing rules`);
  }

  /**
   * Start background tasks for cleanup and escalation
   */
  private startBackgroundTasks(): void {
    // Clean up caches every hour
    setInterval(() => {
      this.cleanupCaches();
    }, 60 * 60 * 1000);

    // Process escalations every minute
    setInterval(() => {
      this.processEscalations();
    }, 60 * 1000);
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCaches(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean deduplication cache
    for (const [key, entry] of this.deduplicationCache.entries()) {
      if (now - entry.lastSeen.getTime() > maxAge) {
        this.deduplicationCache.delete(key);
      }
    }

    // Clean rate limit cache
    for (const [key, entry] of this.rateLimitCache.entries()) {
      if (now - entry.windowStart.getTime() > maxAge) {
        this.rateLimitCache.delete(key);
      }
    }

    logger.info('🧹 Notification caches cleaned up');
  }

  /**
   * Process pending escalations
   */
  private async processEscalations(): Promise<void> {
    const now = new Date();

    for (const [alertId, escalation] of this.escalationQueue.entries()) {
      if (escalation.completed || escalation.nextEscalationTime > now) {
        continue;
      }

      try {
        // Find the rule that triggered this escalation
        const rule = Array.from(this.routingRules.values())
          .find(r => r.escalation?.enabled);

        if (rule?.escalation) {
          logger.warn(`⚠️ Escalating alert ${alertId} (level ${escalation.escalationLevel})`);

          // Send escalation notifications
          // This would typically involve sending to additional recipients or channels
          
          escalation.escalationLevel++;
          
          if (escalation.escalationLevel <= rule.escalation.maxEscalations) {
            // Schedule next escalation
            escalation.nextEscalationTime = new Date(
              now.getTime() + rule.escalation.delayMinutes * 60 * 1000
            );
          } else {
            // Max escalations reached
            escalation.completed = true;
            logger.warn(`⚠️ Max escalations reached for alert ${alertId}`);
          }
        }

      } catch (error) {
        logger.error(`❌ Error processing escalation for alert ${alertId}:`, error);
        escalation.completed = true;
      }
    }

    // Clean up completed escalations
    for (const [alertId, escalation] of this.escalationQueue.entries()) {
      if (escalation.completed) {
        this.escalationQueue.delete(alertId);
      }
    }
  }

  /**
   * Get notification router statistics
   */
  public getStatistics(): {
    totalAlerts: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    activeRules: number;
    pendingEscalations: number;
    cacheSize: {
      deduplication: number;
      rateLimit: number;
    };
  } {
    const successfulDeliveries = this.deliveryHistory.filter(d => d.success).length;
    const failedDeliveries = this.deliveryHistory.filter(d => !d.success).length;
    const activeRules = Array.from(this.routingRules.values()).filter(r => r.enabled).length;
    const pendingEscalations = Array.from(this.escalationQueue.values())
      .filter(e => !e.completed).length;

    return {
      totalAlerts: this.deliveryHistory.length,
      successfulDeliveries,
      failedDeliveries,
      activeRules,
      pendingEscalations,
      cacheSize: {
        deduplication: this.deduplicationCache.size,
        rateLimit: this.rateLimitCache.size
      }
    };
  }

  /**
   * Stop the notification router
   */
  public async stop(): Promise<void> {
    await this.telegramService.stop();
    logger.info('🛑 Notification router stopped');
  }
}

export default NotificationRouter;