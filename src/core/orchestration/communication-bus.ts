/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - INTER-COMPONENT COMMUNICATION BUS
 * =============================================================================
 * 
 * This module provides a comprehensive communication bus for inter-component
 * messaging, event handling, and data sharing across the trading system.
 * It ensures loose coupling while maintaining reliable message delivery.
 * 
 * CRITICAL SYSTEM NOTICE:
 * This communication bus handles critical trading events and system messages.
 * Message delivery reliability and ordering are essential for system safety
 * and financial operations.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { auditService } from '@/security/audit-service';

/**
 * Message interface
 */
export interface Message {
  /** Unique message identifier */
  id: string;
  /** Message type */
  type: string;
  /** Message payload */
  payload: any;
  /** Message metadata */
  metadata: MessageMetadata;
  /** Message timestamp */
  timestamp: Date;
  /** Message source component */
  source: string;
  /** Message target component(s) */
  target?: string | string[];
  /** Message priority */
  priority: MessagePriority;
  /** Message expiration time */
  expiresAt?: Date;
  /** Correlation ID for request/response */
  correlationId?: string;
  /** Reply-to address */
  replyTo?: string;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  /** Message version */
  version: string;
  /** Message schema */
  schema?: string;
  /** Message encoding */
  encoding: string;
  /** Message compression */
  compression?: string;
  /** Message encryption */
  encrypted: boolean;
  /** Message signature */
  signature?: string;
  /** Custom headers */
  headers: Record<string, string>;
}

/**
 * Message priority enumeration
 */
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
  EMERGENCY = 4
}

/**
 * Message handler interface
 */
export interface MessageHandler {
  /** Handler identifier */
  id: string;
  /** Message types this handler processes */
  messageTypes: string[];
  /** Handler function */
  handle(message: Message): Promise<any>;
  /** Handler priority */
  priority: number;
  /** Whether handler can handle message */
  canHandle?(message: Message): boolean;
}

/**
 * Subscription interface
 */
export interface Subscription {
  /** Subscription identifier */
  id: string;
  /** Component identifier */
  componentId: string;
  /** Message pattern to match */
  pattern: string | RegExp;
  /** Message handler */
  handler: MessageHandler;
  /** Subscription options */
  options: SubscriptionOptions;
  /** Subscription statistics */
  stats: SubscriptionStats;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Whether to acknowledge messages */
  acknowledge: boolean;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Message timeout in milliseconds */
  timeout: number;
  /** Whether to persist messages */
  persistent: boolean;
  /** Dead letter queue */
  deadLetterQueue?: string;
}

/**
 * Subscription statistics
 */
export interface SubscriptionStats {
  /** Messages received */
  messagesReceived: number;
  /** Messages processed successfully */
  messagesProcessed: number;
  /** Messages failed */
  messagesFailed: number;
  /** Average processing time */
  averageProcessingTime: number;
  /** Last message timestamp */
  lastMessageAt?: Date;
  /** Last error */
  lastError?: string;
}

/**
 * Communication bus configuration
 */
export interface CommunicationBusConfig {
  /** Maximum message queue size */
  maxQueueSize: number;
  /** Message retention time in milliseconds */
  messageRetention: number;
  /** Enable message persistence */
  enablePersistence: boolean;
  /** Enable message encryption */
  enableEncryption: boolean;
  /** Enable message compression */
  enableCompression: boolean;
  /** Default message timeout */
  defaultTimeout: number;
  /** Maximum concurrent handlers */
  maxConcurrentHandlers: number;
  /** Enable dead letter queue */
  enableDeadLetterQueue: boolean;
}

/**
 * Message delivery result
 */
export interface DeliveryResult {
  /** Whether delivery was successful */
  success: boolean;
  /** Delivery timestamp */
  deliveredAt: Date;
  /** Number of handlers that processed the message */
  handlerCount: number;
  /** Delivery errors */
  errors: string[];
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Communication bus class
 */
export class CommunicationBus extends EventEmitter {
  private subscriptions: Map<string, Subscription> = new Map();
  private messageQueue: Message[] = [];
  private processingQueue: Set<string> = new Set();
  private messageHistory: Map<string, Message> = new Map();
  private deadLetterQueue: Message[] = [];
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(private config: CommunicationBusConfig) {
    super();
    this.startMessageProcessing();
  }

  /**
   * Publish a message to the bus
   * 
   * @param type Message type
   * @param payload Message payload
   * @param options Message options
   * @returns Promise<DeliveryResult>
   */
  public async publish(
    type: string,
    payload: any,
    options: Partial<{
      source: string;
      target: string | string[];
      priority: MessagePriority;
      expiresAt: Date;
      correlationId: string;
      replyTo: string;
      metadata: Partial<MessageMetadata>;
    }> = {}
  ): Promise<DeliveryResult> {
    const message: Message = {
      id: this.generateMessageId(),
      type,
      payload,
      timestamp: new Date(),
      source: options.source || 'unknown',
      target: options.target,
      priority: options.priority || MessagePriority.NORMAL,
      expiresAt: options.expiresAt,
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      metadata: {
        version: '1.0',
        encoding: 'json',
        encrypted: this.config.enableEncryption,
        headers: {},
        ...options.metadata
      }
    };

    logger.debug(`📤 Publishing message: ${type} (${message.id})`);

    try {
      // Validate message
      this.validateMessage(message);

      // Add to queue
      this.addToQueue(message);

      // Store in history
      if (this.config.enablePersistence) {
        this.messageHistory.set(message.id, message);
      }

      // Process immediately if high priority
      if (message.priority >= MessagePriority.HIGH) {
        return await this.processMessage(message);
      }

      // Return pending result for normal priority messages
      return {
        success: true,
        deliveredAt: new Date(),
        handlerCount: 0,
        errors: [],
        processingTime: 0
      };

    } catch (error) {
      logger.error(`❌ Failed to publish message ${type}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to messages
   * 
   * @param componentId Component identifier
   * @param pattern Message pattern
   * @param handler Message handler
   * @param options Subscription options
   * @returns Subscription ID
   */
  public subscribe(
    componentId: string,
    pattern: string | RegExp,
    handler: MessageHandler,
    options: Partial<SubscriptionOptions> = {}
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: Subscription = {
      id: subscriptionId,
      componentId,
      pattern,
      handler,
      options: {
        acknowledge: true,
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        persistent: false,
        ...options
      },
      stats: {
        messagesReceived: 0,
        messagesProcessed: 0,
        messagesFailed: 0,
        averageProcessingTime: 0
      }
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    logger.info(`📥 Component ${componentId} subscribed to pattern: ${pattern} (${subscriptionId})`);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from messages
   * 
   * @param subscriptionId Subscription identifier
   */
  public unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      logger.info(`📤 Unsubscribed: ${subscriptionId} (${subscription.componentId})`);
    }
  }

  /**
   * Send a request and wait for response
   * 
   * @param type Message type
   * @param payload Message payload
   * @param timeout Timeout in milliseconds
   * @returns Promise<any> Response payload
   */
  public async request(type: string, payload: any, timeout: number = 30000): Promise<any> {
    const correlationId = this.generateCorrelationId();
    const replyTo = `reply.${correlationId}`;

    // Set up response handler
    const responsePromise = new Promise((resolve, reject) => {
      const responseTimeout = setTimeout(() => {
        this.unsubscribe(subscriptionId);
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);

      const subscriptionId = this.subscribe(
        'request-response',
        replyTo,
        {
          id: `response-handler-${correlationId}`,
          messageTypes: [replyTo],
          priority: 100,
          handle: async (message: Message) => {
            clearTimeout(responseTimeout);
            this.unsubscribe(subscriptionId);
            resolve(message.payload);
          }
        }
      );
    });

    // Send request
    await this.publish(type, payload, {
      correlationId,
      replyTo,
      priority: MessagePriority.HIGH
    });

    return responsePromise;
  }

  /**
   * Send a response to a request
   * 
   * @param originalMessage Original request message
   * @param responsePayload Response payload
   */
  public async respond(originalMessage: Message, responsePayload: any): Promise<void> {
    if (!originalMessage.replyTo || !originalMessage.correlationId) {
      throw new Error('Cannot respond to message without replyTo or correlationId');
    }

    await this.publish(originalMessage.replyTo, responsePayload, {
      correlationId: originalMessage.correlationId,
      priority: MessagePriority.HIGH
    });
  }

  /**
   * Get subscription statistics
   * 
   * @param subscriptionId Subscription identifier
   * @returns Subscription statistics or undefined
   */
  public getSubscriptionStats(subscriptionId: string): SubscriptionStats | undefined {
    const subscription = this.subscriptions.get(subscriptionId);
    return subscription?.stats;
  }

  /**
   * Get all subscriptions for a component
   * 
   * @param componentId Component identifier
   * @returns Array of subscriptions
   */
  public getComponentSubscriptions(componentId: string): Subscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.componentId === componentId);
  }

  /**
   * Get bus statistics
   * 
   * @returns Bus statistics
   */
  public getStatistics(): {
    totalSubscriptions: number;
    queueSize: number;
    processingQueueSize: number;
    messageHistorySize: number;
    deadLetterQueueSize: number;
    totalMessagesProcessed: number;
  } {
    let totalMessagesProcessed = 0;
    
    for (const subscription of this.subscriptions.values()) {
      totalMessagesProcessed += subscription.stats.messagesProcessed;
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      queueSize: this.messageQueue.length,
      processingQueueSize: this.processingQueue.size,
      messageHistorySize: this.messageHistory.size,
      deadLetterQueueSize: this.deadLetterQueue.length,
      totalMessagesProcessed
    };
  }

  /**
   * Clear expired messages
   */
  public clearExpiredMessages(): void {
    const now = new Date();
    
    // Clear expired messages from queue
    this.messageQueue = this.messageQueue.filter(message => {
      if (message.expiresAt && message.expiresAt < now) {
        logger.debug(`🗑️ Removing expired message: ${message.id}`);
        return false;
      }
      return true;
    });

    // Clear old messages from history
    if (this.config.enablePersistence) {
      const retentionTime = this.config.messageRetention;
      const cutoffTime = new Date(now.getTime() - retentionTime);

      for (const [messageId, message] of this.messageHistory) {
        if (message.timestamp < cutoffTime) {
          this.messageHistory.delete(messageId);
        }
      }
    }
  }

  /**
   * Shutdown the communication bus
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down communication bus...');

    // Stop processing
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process remaining high-priority messages
    const highPriorityMessages = this.messageQueue
      .filter(msg => msg.priority >= MessagePriority.HIGH);

    for (const message of highPriorityMessages) {
      try {
        await this.processMessage(message);
      } catch (error) {
        logger.error(`❌ Failed to process message during shutdown: ${message.id}`, error);
      }
    }

    // Clear all data
    this.subscriptions.clear();
    this.messageQueue = [];
    this.processingQueue.clear();
    this.messageHistory.clear();
    this.deadLetterQueue = [];

    logger.info('✅ Communication bus shutdown completed');
  }

  /**
   * Start message processing loop
   */
  private startMessageProcessing(): void {
    this.isProcessing = true;
    
    this.processingInterval = setInterval(async () => {
      if (this.messageQueue.length > 0) {
        await this.processNextMessage();
      }
      
      // Clean up expired messages periodically
      if (Math.random() < 0.1) { // 10% chance each interval
        this.clearExpiredMessages();
      }
    }, 100); // Process every 100ms
  }

  /**
   * Process next message in queue
   */
  private async processNextMessage(): Promise<void> {
    if (!this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    // Sort by priority and timestamp
    this.messageQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp.getTime() - b.timestamp.getTime(); // Older first
    });

    const message = this.messageQueue.shift();
    if (message) {
      await this.processMessage(message);
    }
  }

  /**
   * Process a specific message
   * 
   * @param message Message to process
   * @returns Promise<DeliveryResult>
   */
  private async processMessage(message: Message): Promise<DeliveryResult> {
    const startTime = Date.now();
    const result: DeliveryResult = {
      success: true,
      deliveredAt: new Date(),
      handlerCount: 0,
      errors: [],
      processingTime: 0
    };

    try {
      // Check if message is expired
      if (message.expiresAt && message.expiresAt < new Date()) {
        logger.debug(`⏰ Message expired: ${message.id}`);
        return result;
      }

      // Mark as processing
      this.processingQueue.add(message.id);

      // Find matching subscriptions
      const matchingSubscriptions = this.findMatchingSubscriptions(message);
      
      if (matchingSubscriptions.length === 0) {
        logger.debug(`📭 No handlers for message: ${message.type} (${message.id})`);
        return result;
      }

      // Process with each matching handler
      const handlerPromises = matchingSubscriptions.map(subscription => 
        this.processWithHandler(message, subscription)
      );

      const handlerResults = await Promise.allSettled(handlerPromises);
      
      // Collect results
      for (const handlerResult of handlerResults) {
        if (handlerResult.status === 'fulfilled') {
          result.handlerCount++;
        } else {
          result.success = false;
          result.errors.push(handlerResult.reason?.message || 'Unknown error');
        }
      }

      result.processingTime = Date.now() - startTime;

      // Log result
      if (result.success) {
        logger.debug(`✅ Message processed: ${message.type} (${message.id}) - ${result.handlerCount} handlers`);
      } else {
        logger.error(`❌ Message processing failed: ${message.type} (${message.id}) - errors: ${result.errors.join(', ')}`);
      }

      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.processingTime = Date.now() - startTime;
      
      logger.error(`❌ Message processing error: ${message.id}`, error);
      
      // Move to dead letter queue if enabled
      if (this.config.enableDeadLetterQueue) {
        this.deadLetterQueue.push(message);
      }

      return result;

    } finally {
      // Remove from processing queue
      this.processingQueue.delete(message.id);
    }
  }

  /**
   * Process message with specific handler
   * 
   * @param message Message to process
   * @param subscription Subscription with handler
   * @returns Promise<any>
   */
  private async processWithHandler(message: Message, subscription: Subscription): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Update stats
      subscription.stats.messagesReceived++;
      subscription.stats.lastMessageAt = new Date();

      // Check if handler can handle this message
      if (subscription.handler.canHandle && !subscription.handler.canHandle(message)) {
        return;
      }

      // Process with timeout
      const handlerPromise = subscription.handler.handle(message);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Handler timeout: ${subscription.handler.id}`));
        }, subscription.options.timeout);
      });

      const result = await Promise.race([handlerPromise, timeoutPromise]);

      // Update stats
      const processingTime = Date.now() - startTime;
      subscription.stats.messagesProcessed++;
      subscription.stats.averageProcessingTime = 
        (subscription.stats.averageProcessingTime * (subscription.stats.messagesProcessed - 1) + processingTime) / 
        subscription.stats.messagesProcessed;

      return result;

    } catch (error) {
      // Update error stats
      subscription.stats.messagesFailed++;
      subscription.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`❌ Handler error: ${subscription.handler.id}`, error);
      throw error;
    }
  }

  /**
   * Find subscriptions matching a message
   * 
   * @param message Message to match
   * @returns Array of matching subscriptions
   */
  private findMatchingSubscriptions(message: Message): Subscription[] {
    const matching: Subscription[] = [];

    for (const subscription of this.subscriptions.values()) {
      if (this.messageMatches(message, subscription.pattern)) {
        // Check target filtering
        if (message.target) {
          const targets = Array.isArray(message.target) ? message.target : [message.target];
          if (!targets.includes(subscription.componentId)) {
            continue;
          }
        }

        matching.push(subscription);
      }
    }

    // Sort by handler priority
    matching.sort((a, b) => b.handler.priority - a.handler.priority);

    return matching;
  }

  /**
   * Check if message matches pattern
   * 
   * @param message Message to check
   * @param pattern Pattern to match against
   * @returns True if matches
   */
  private messageMatches(message: Message, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      // Simple string matching with wildcards
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`^${regexPattern}$`).test(message.type);
    } else {
      return pattern.test(message.type);
    }
  }

  /**
   * Validate message format
   * 
   * @param message Message to validate
   */
  private validateMessage(message: Message): void {
    if (!message.id) {
      throw new Error('Message ID is required');
    }

    if (!message.type) {
      throw new Error('Message type is required');
    }

    if (!message.source) {
      throw new Error('Message source is required');
    }

    if (message.expiresAt && message.expiresAt <= new Date()) {
      throw new Error('Message expiration time must be in the future');
    }
  }

  /**
   * Add message to queue
   * 
   * @param message Message to add
   */
  private addToQueue(message: Message): void {
    // Check queue size limit
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority message
      const lowPriorityIndex = this.messageQueue.findIndex(msg => msg.priority <= MessagePriority.NORMAL);
      if (lowPriorityIndex >= 0) {
        const removed = this.messageQueue.splice(lowPriorityIndex, 1)[0];
        logger.warn(`⚠️ Queue full, removed message: ${removed.id}`);
      } else {
        throw new Error('Message queue is full and no low-priority messages to remove');
      }
    }

    this.messageQueue.push(message);
  }

  /**
   * Generate unique message ID
   * 
   * @returns Unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique subscription ID
   * 
   * @returns Unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique correlation ID
   * 
   * @returns Unique correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Default communication bus configuration
 */
export const defaultCommunicationBusConfig: CommunicationBusConfig = {
  maxQueueSize: 10000,
  messageRetention: 24 * 60 * 60 * 1000, // 24 hours
  enablePersistence: true,
  enableEncryption: false,
  enableCompression: false,
  defaultTimeout: 30000,
  maxConcurrentHandlers: 100,
  enableDeadLetterQueue: true
};

/**
 * Global communication bus instance
 */
export const communicationBus = new CommunicationBus(defaultCommunicationBusConfig);

// =============================================================================
// COMMUNICATION BUS NOTES
// =============================================================================
// 1. Event-driven inter-component communication with message queuing
// 2. Priority-based message processing with timeout handling
// 3. Request/response pattern support with correlation IDs
// 4. Subscription-based message routing with pattern matching
// 5. Message persistence and dead letter queue for reliability
// 6. Comprehensive statistics and monitoring capabilities
// 7. Graceful shutdown with high-priority message processing
// 8. Configurable message retention and queue size limits
// =============================================================================
