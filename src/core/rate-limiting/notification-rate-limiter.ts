/**
 * =============================================================================
 * NOTIFICATION RATE LIMITING SYSTEM
 * =============================================================================
 * 
 * This module provides comprehensive rate limiting for notification services
 * including Telegram bot messages and email notifications with priority
 * system, deduplication, and batching capabilities.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { RateLimitingSystem, RateLimiterType } from './rate-limiter';
import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * Notification types
 */
export enum NotificationType {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  SMS = 'sms'
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  EMERGENCY = 'emergency',    // System failures, security breaches
  CRITICAL = 'critical',      // Trading alerts, significant losses
  HIGH = 'high',             // Important trading updates
  NORMAL = 'normal',         // Regular notifications
  LOW = 'low'               // Informational messages
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  type: NotificationType;
  priority: NotificationPriority;
  recipient: string;
  subject?: string;
  message: string;
  metadata?: Record<string, any>;
  deduplicationKey?: string;
  batchable?: boolean;
  retryOnLimit?: boolean;
  maxRetries?: number;
}

/**
 * Notification queue item
 */
interface NotificationQueueItem {
  id: string;
  config: NotificationConfig;
  timestamp: Date;
  retryCount: number;
  scheduledTime?: Date;
}

/**
 * Notification batch
 */
interface NotificationBatch {
  type: NotificationType;
  recipient: string;
  notifications: NotificationQueueItem[];
  createdAt: Date;
}

/**
 * Deduplication entry
 */
interface DeduplicationEntry {
  key: string;
  lastSent: Date;
  count: number;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  totalSent: number;
  totalFailed: number;
  totalDeduped: number;
  totalBatched: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  queueLength: number;
  batchesWaiting: number;
}

/**
 * Notification rate limiting system with priority and batching
 */
export class NotificationRateLimiter extends EventEmitter {
  private rateLimitingSystem: RateLimitingSystem;
  private isInitialized: boolean = false;
  
  // Queue management
  private notificationQueue: NotificationQueueItem[] = [];
  private processingQueue: boolean = false;
  private queueProcessingInterval: NodeJS.Timeout | null = null;
  
  // Batching system
  private batchingEnabled: boolean = true;
  private batchTimeout: number = 30000; // 30 seconds
  private maxBatchSize: number = 10;
  private pendingBatches: Map<string, NotificationBatch> = new Map();
  private batchProcessingInterval: NodeJS.Timeout | null = null;
  
  // Deduplication system
  private deduplicationEnabled: boolean = true;
  private deduplicationWindow: number = 300000; // 5 minutes
  private deduplicationMap: Map<string, DeduplicationEntry> = new Map();
  private deduplicationCleanupInterval: NodeJS.Timeout | null = null;
  
  // Statistics
  private stats: NotificationStats = {
    totalSent: 0,
    totalFailed: 0,
    totalDeduped: 0,
    totalBatched: 0,
    byType: {} as Record<NotificationType, number>,
    byPriority: {} as Record<NotificationPriority, number>,
    queueLength: 0,
    batchesWaiting: 0
  };

  constructor(rateLimitingSystem: RateLimitingSystem) {
    super();
    this.rateLimitingSystem = rateLimitingSystem;
    this.initializeStats();
  }

  /**
   * Initialize the notification rate limiter
   */
  public async initialize(): Promise<void> {
    if (!this.rateLimitingSystem) {
      throw new Error('Rate limiting system not provided');
    }

    // Start queue processing
    this.startQueueProcessing();

    // Start batch processing
    if (this.batchingEnabled) {
      this.startBatchProcessing();
    }

    // Start deduplication cleanup
    if (this.deduplicationEnabled) {
      this.startDeduplicationCleanup();
    }

    this.isInitialized = true;
    logger.info('📢 Notification rate limiter initialized with batching and deduplication');
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): void {
    // Initialize type counters
    for (const type of Object.values(NotificationType)) {
      this.stats.byType[type] = 0;
    }

    // Initialize priority counters
    for (const priority of Object.values(NotificationPriority)) {
      this.stats.byPriority[priority] = 0;
    }
  }

  /**
   * Send notification with rate limiting
   */
  public async sendNotification(
    config: NotificationConfig,
    sendFunction: (config: NotificationConfig) => Promise<void>
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Notification rate limiter not initialized');
    }

    // Check for deduplication
    if (this.deduplicationEnabled && config.deduplicationKey) {
      if (this.isDuplicate(config.deduplicationKey)) {
        this.stats.totalDeduped++;
        logger.debug(`🔄 Notification deduplicated: ${config.deduplicationKey}`);
        return;
      }
    }

    const notificationItem: NotificationQueueItem = {
      id: this.generateNotificationId(),
      config: { ...config },
      timestamp: new Date(),
      retryCount: 0
    };

    // Store the send function separately to avoid type conflicts
    (notificationItem as any).sendFunction = sendFunction;

    // Add to appropriate queue based on priority and batching
    if (config.batchable && this.batchingEnabled && config.priority !== NotificationPriority.EMERGENCY) {
      this.addToBatch(notificationItem);
    } else {
      this.addToQueue(notificationItem);
    }

    this.updateQueueStats();
  }

  /**
   * Check if notification is duplicate
   */
  private isDuplicate(deduplicationKey: string): boolean {
    const entry = this.deduplicationMap.get(deduplicationKey);
    if (!entry) return false;

    const now = new Date();
    const timeSinceLastSent = now.getTime() - entry.lastSent.getTime();
    
    return timeSinceLastSent < this.deduplicationWindow;
  }

  /**
   * Record notification for deduplication
   */
  private recordForDeduplication(deduplicationKey: string): void {
    const entry = this.deduplicationMap.get(deduplicationKey) || {
      key: deduplicationKey,
      lastSent: new Date(),
      count: 0
    };

    entry.lastSent = new Date();
    entry.count++;
    
    this.deduplicationMap.set(deduplicationKey, entry);
  }

  /**
   * Add notification to batch
   */
  private addToBatch(item: NotificationQueueItem): void {
    const batchKey = `${item.config.type}_${item.config.recipient}`;
    let batch = this.pendingBatches.get(batchKey);

    if (!batch) {
      batch = {
        type: item.config.type,
        recipient: item.config.recipient,
        notifications: [],
        createdAt: new Date()
      };
      this.pendingBatches.set(batchKey, batch);
    }

    batch.notifications.push(item);

    // Process batch immediately if it reaches max size or is emergency
    if (batch.notifications.length >= this.maxBatchSize) {
      this.processBatch(batchKey);
    }

    logger.debug(`📦 Added notification to batch ${batchKey} (${batch.notifications.length}/${this.maxBatchSize})`);
  }

  /**
   * Add notification to priority queue
   */
  private addToQueue(item: NotificationQueueItem): void {
    const priority = this.getPriorityValue(item.config.priority);
    
    // Find insertion point based on priority
    let insertIndex = this.notificationQueue.length;
    for (let i = 0; i < this.notificationQueue.length; i++) {
      const queuePriority = this.getPriorityValue(this.notificationQueue[i].config.priority);
      if (priority > queuePriority) {
        insertIndex = i;
        break;
      }
    }

    this.notificationQueue.splice(insertIndex, 0, item);
    logger.debug(`📬 Queued notification ${item.id} with priority ${item.config.priority}`);
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.EMERGENCY: return 5;
      case NotificationPriority.CRITICAL: return 4;
      case NotificationPriority.HIGH: return 3;
      case NotificationPriority.NORMAL: return 2;
      case NotificationPriority.LOW: return 1;
      default: return 2;
    }
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    this.queueProcessingInterval = setInterval(async () => {
      if (!this.processingQueue && this.notificationQueue.length > 0) {
        await this.processQueue();
      }
    }, 1000); // Check every second

    logger.info('🔄 Started notification queue processing');
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const item = this.notificationQueue.shift();
      if (!item) return;

      await this.processNotificationItem(item);
    } catch (error) {
      logger.error('❌ Error processing notification queue:', error);
    } finally {
      this.processingQueue = false;
      this.updateQueueStats();
    }
  }

  /**
   * Process individual notification item
   */
  private async processNotificationItem(item: NotificationQueueItem): Promise<void> {
    const { config, id } = item;
    const rateLimiterType = this.getNotificationRateLimiterType(config.type);

    try {
      // Apply rate limiting
      await this.rateLimitingSystem.consume(rateLimiterType, 1, true);

      // Execute the notification
      const sendFunction = (item as any).sendFunction;
      if (sendFunction) {
        await sendFunction(config);
      }

      // Record for deduplication
      if (config.deduplicationKey) {
        this.recordForDeduplication(config.deduplicationKey);
      }

      // Update statistics
      this.stats.totalSent++;
      this.stats.byType[config.type]++;
      this.stats.byPriority[config.priority]++;

      logger.debug(`✅ Notification ${id} sent successfully`);
      this.emit('notificationSent', { id, config });

    } catch (error) {
      // Handle rate limit errors
      if (this.isRateLimitError(error)) {
        if (config.retryOnLimit && item.retryCount < (config.maxRetries || 3)) {
          item.retryCount++;
          item.scheduledTime = new Date(Date.now() + 5000); // Retry in 5 seconds
          
          logger.warn(`⏳ Rate limit hit for ${config.type}, retrying notification ${id} (attempt ${item.retryCount})`);
          this.addToQueue(item);
          return;
        }
      }

      // Update failure statistics
      this.stats.totalFailed++;
      
      logger.error(`❌ Notification ${id} failed:`, error.message);
      this.emit('notificationFailed', { id, config, error });
    }
  }

  /**
   * Get rate limiter type for notification type
   */
  private getNotificationRateLimiterType(type: NotificationType): RateLimiterType {
    switch (type) {
      case NotificationType.TELEGRAM:
        return RateLimiterType.TELEGRAM_MESSAGES;
      case NotificationType.EMAIL:
        return RateLimiterType.EMAIL_NOTIFICATIONS;
      default:
        return RateLimiterType.EMAIL_NOTIFICATIONS;
    }
  }

  /**
   * Start batch processing
   */
  private startBatchProcessing(): void {
    this.batchProcessingInterval = setInterval(() => {
      this.processExpiredBatches();
    }, 5000); // Check every 5 seconds

    logger.info('📦 Started notification batch processing');
  }

  /**
   * Process expired batches
   */
  private processExpiredBatches(): void {
    const now = new Date();
    
    for (const [batchKey, batch] of this.pendingBatches) {
      const batchAge = now.getTime() - batch.createdAt.getTime();
      
      if (batchAge >= this.batchTimeout) {
        this.processBatch(batchKey);
      }
    }
  }

  /**
   * Process a specific batch
   */
  private processBatch(batchKey: string): void {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.notifications.length === 0) return;

    // Create combined notification
    const combinedNotification: NotificationQueueItem = {
      id: this.generateNotificationId(),
      config: this.createBatchedNotification(batch),
      timestamp: new Date(),
      retryCount: 0
    };

    // Store the send function from the first notification
    (combinedNotification as any).sendFunction = (batch.notifications[0] as any).sendFunction;

    // Add to priority queue
    this.addToQueue(combinedNotification);

    // Update statistics
    this.stats.totalBatched += batch.notifications.length;

    logger.info(`📦 Processed batch ${batchKey} with ${batch.notifications.length} notifications`);
    
    // Remove processed batch
    this.pendingBatches.delete(batchKey);
  }

  /**
   * Create batched notification from multiple notifications
   */
  private createBatchedNotification(batch: NotificationBatch): NotificationConfig {
    const messages = batch.notifications.map(n => n.config.message);
    const highestPriority = Math.max(...batch.notifications.map(n => this.getPriorityValue(n.config.priority)));
    
    const batchedConfig: NotificationConfig = {
      type: batch.type,
      priority: this.getPriorityFromValue(highestPriority),
      recipient: batch.recipient,
      subject: `Trading Agent - ${batch.notifications.length} Updates`,
      message: this.formatBatchedMessage(messages),
      batchable: false // Prevent re-batching
    };

    return batchedConfig;
  }

  /**
   * Format batched message
   */
  private formatBatchedMessage(messages: string[]): string {
    const header = `📊 Trading Agent Batch Update (${messages.length} notifications)\n\n`;
    const body = messages.map((msg, index) => `${index + 1}. ${msg}`).join('\n\n');
    const footer = `\n\n⏰ Sent at ${new Date().toLocaleString()}`;
    
    return header + body + footer;
  }

  /**
   * Get priority from numeric value
   */
  private getPriorityFromValue(value: number): NotificationPriority {
    switch (value) {
      case 5: return NotificationPriority.EMERGENCY;
      case 4: return NotificationPriority.CRITICAL;
      case 3: return NotificationPriority.HIGH;
      case 2: return NotificationPriority.NORMAL;
      case 1: return NotificationPriority.LOW;
      default: return NotificationPriority.NORMAL;
    }
  }

  /**
   * Start deduplication cleanup
   */
  private startDeduplicationCleanup(): void {
    this.deduplicationCleanupInterval = setInterval(() => {
      this.cleanupDeduplicationMap();
    }, 60000); // Cleanup every minute

    logger.info('🧹 Started deduplication cleanup');
  }

  /**
   * Cleanup expired deduplication entries
   */
  private cleanupDeduplicationMap(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.deduplicationMap) {
      const age = now.getTime() - entry.lastSent.getTime();
      if (age > this.deduplicationWindow) {
        this.deduplicationMap.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned up ${cleanedCount} expired deduplication entries`);
    }
  }

  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded')
    );
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update queue statistics
   */
  private updateQueueStats(): void {
    this.stats.queueLength = this.notificationQueue.length;
    this.stats.batchesWaiting = this.pendingBatches.size;
  }

  /**
   * Get notification statistics
   */
  public getStatistics(): NotificationStats {
    this.updateQueueStats();
    return { ...this.stats };
  }

  /**
   * Clear notification queue
   */
  public clearQueue(): number {
    const clearedCount = this.notificationQueue.length;
    this.notificationQueue = [];
    this.updateQueueStats();
    
    logger.info(`🧹 Cleared ${clearedCount} notifications from queue`);
    return clearedCount;
  }

  /**
   * Clear pending batches
   */
  public clearBatches(): number {
    const clearedCount = this.pendingBatches.size;
    this.pendingBatches.clear();
    this.updateQueueStats();
    
    logger.info(`🧹 Cleared ${clearedCount} pending batches`);
    return clearedCount;
  }

  /**
   * Shutdown the notification rate limiter
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down notification rate limiter...');

    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }

    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
      this.batchProcessingInterval = null;
    }

    if (this.deduplicationCleanupInterval) {
      clearInterval(this.deduplicationCleanupInterval);
      this.deduplicationCleanupInterval = null;
    }

    // Process remaining batches
    for (const batchKey of this.pendingBatches.keys()) {
      this.processBatch(batchKey);
    }

    this.notificationQueue = [];
    this.pendingBatches.clear();
    this.deduplicationMap.clear();
    this.isInitialized = false;

    logger.info('✅ Notification rate limiter shutdown completed');
  }
}

// Exports are handled by individual export statements above