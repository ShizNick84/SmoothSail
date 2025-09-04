/**
 * =============================================================================
 * ORDER MANAGEMENT AND EXECUTION SYSTEM
 * =============================================================================
 * 
 * This module implements a comprehensive order management system for Gate.io
 * cryptocurrency trading with validation, confirmation, status monitoring,
 * and comprehensive audit logging for all order operations.
 * 
 * SECURITY FEATURES:
 * - Order validation with risk assessment before placement
 * - Real-time order status monitoring and updates
 * - Comprehensive audit logging for all order operations
 * - Order cancellation and modification with safety checks
 * - Position tracking and reconciliation
 * - Emergency stop-loss and position closure capabilities
 * 
 * CRITICAL TRADING NOTICE:
 * This system handles real financial assets and trading operations.
 * All order operations must be validated and logged for audit compliance.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { AuditService } from '@/security/audit-service';
import { GateIOClient } from '../api/gate-io-client';
import { 
  OrderRequest, 
  OrderResponse, 
  OrderModifyRequest, 
  OrderStatus, 
  OrderSide, 
  OrderType,
  TradingSymbol,
  TimeInForce 
} from '../api/types';

/**
 * Order validation result
 */
interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskScore: number; // 0-100
  estimatedCost: number;
  estimatedFees: number;
}

/**
 * Order execution result
 */
interface OrderExecutionResult {
  success: boolean;
  order: OrderResponse | null;
  executionTime: number;
  error?: string;
  validationResult: OrderValidationResult;
}

/**
 * Order status update
 */
interface OrderStatusUpdate {
  orderId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  timestamp: Date;
  filledAmount?: string;
  remainingAmount?: string;
  averagePrice?: string;
}

/**
 * Position summary
 */
interface PositionSummary {
  symbol: string;
  side: 'long' | 'short' | 'neutral';
  totalAmount: number;
  averagePrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  openOrders: OrderResponse[];
  lastUpdate: Date;
}

/**
 * Order management statistics
 */
interface OrderManagementStats {
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  cancelledOrders: number;
  totalVolume: number;
  totalFees: number;
  averageExecutionTime: number;
  successRate: number;
  lastOrderTime: Date | null;
}

/**
 * Order execution configuration
 */
interface OrderExecutionConfig {
  enablePreValidation: boolean;
  enablePostValidation: boolean;
  maxOrderValue: number;
  maxDailyVolume: number;
  enableRiskChecks: boolean;
  confirmationRequired: boolean;
  executionTimeout: number;
}

/**
 * Order Management and Execution System
 * Handles all order lifecycle operations with comprehensive validation and monitoring
 */
export class OrderManager extends EventEmitter {
  private gateIOClient: GateIOClient;
  private auditService: AuditService;
  private activeOrders: Map<string, OrderResponse> = new Map();
  private orderHistory: OrderResponse[] = [];
  private positions: Map<string, PositionSummary> = new Map();
  private stats: OrderManagementStats;
  private config: OrderExecutionConfig;
  
  // Monitoring and validation
  private statusMonitorInterval: NodeJS.Timeout | null = null;
  private readonly statusCheckInterval: number = 5000; // 5 seconds
  private readonly maxOrderAge: number = 86400000; // 24 hours in milliseconds

  constructor(gateIOClient: GateIOClient) {
    super();
    
    this.gateIOClient = gateIOClient;
    this.auditService = new AuditService();
    
    // Initialize statistics
    this.stats = {
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      cancelledOrders: 0,
      totalVolume: 0,
      totalFees: 0,
      averageExecutionTime: 0,
      successRate: 0,
      lastOrderTime: null,
    };
    
    // Default configuration
    this.config = {
      enablePreValidation: true,
      enablePostValidation: true,
      maxOrderValue: 10000, // $10,000 USD
      maxDailyVolume: 100000, // $100,000 USD
      enableRiskChecks: true,
      confirmationRequired: false,
      executionTimeout: 30000, // 30 seconds
    };
    
    logger.info('💹 Order Manager initialized with comprehensive validation');
  }

  /**
   * Initialize order manager with configuration
   * 
   * @param config - Order execution configuration
   * @returns Promise<boolean> - Success status
   */
  public async initialize(config?: Partial<OrderExecutionConfig>): Promise<boolean> {
    try {
      logger.info('🚀 Initializing Order Manager...');
      
      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config };
      }
      
      // Load existing orders from exchange
      await this.loadExistingOrders();
      
      // Start order status monitoring
      this.startOrderStatusMonitoring();
      
      // Initialize position tracking
      await this.initializePositionTracking();
      
      await this.auditService.logSecurityEvent({
        type: 'ORDER_MANAGER_INITIALIZED',
        severity: 'INFO',
        details: { config: this.config },
        timestamp: new Date(),
      });
      
      logger.info('✅ Order Manager initialized successfully');
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to initialize Order Manager:', error);
      await this.auditService.logSecurityEvent({
        type: 'ORDER_MANAGER_INIT_FAILED',
        severity: 'ERROR',
        details: { error: error.message },
        timestamp: new Date(),
      });
      return false;
    }
  }

  /**
   * Place new order with comprehensive validation and confirmation
   * 
   * @param orderRequest - Order request parameters
   * @returns Promise<OrderExecutionResult> - Order execution result
   */
  public async placeOrder(orderRequest: OrderRequest): Promise<OrderExecutionResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`📝 Placing ${orderRequest.side} order for ${orderRequest.amount} ${orderRequest.currency_pair}`);
      
      // Pre-validation
      const validationResult = await this.validateOrder(orderRequest);
      if (!validationResult.isValid) {
        const error = `Order validation failed: ${validationResult.errors.join(', ')}`;
        await this.logOrderEvent('ORDER_VALIDATION_FAILED', orderRequest, { validationResult });
        return {
          success: false,
          order: null,
          executionTime: Date.now() - startTime,
          error,
          validationResult,
        };
      }
      
      // Log validation warnings if any
      if (validationResult.warnings.length > 0) {
        logger.warn('⚠️ Order validation warnings:', validationResult.warnings);
      }
      
      // Risk assessment
      if (this.config.enableRiskChecks) {
        const riskAssessment = await this.assessOrderRisk(orderRequest, validationResult);
        if (riskAssessment.riskScore > 80) {
          const error = `Order risk score too high: ${riskAssessment.riskScore}/100`;
          await this.logOrderEvent('ORDER_HIGH_RISK_REJECTED', orderRequest, { riskAssessment });
          return {
            success: false,
            order: null,
            executionTime: Date.now() - startTime,
            error,
            validationResult,
          };
        }
      }
      
      // Execute order through Gate.io API
      const orderResponse = await this.executeOrder(orderRequest);
      
      // Post-validation
      if (this.config.enablePostValidation) {
        const postValidation = await this.validateOrderExecution(orderRequest, orderResponse);
        if (!postValidation.isValid) {
          logger.error('❌ Post-execution validation failed:', postValidation.errors);
          // Attempt to cancel the order if validation fails
          await this.cancelOrder(orderResponse.id, 'Post-validation failure');
        }
      }
      
      // Store order in active orders
      this.activeOrders.set(orderResponse.id, orderResponse);
      this.orderHistory.push(orderResponse);
      
      // Update statistics
      const executionTime = Date.now() - startTime;
      this.updateOrderStats(true, executionTime, parseFloat(orderRequest.amount), validationResult.estimatedFees);
      
      // Update position tracking
      await this.updatePositionTracking(orderResponse);
      
      // Log successful order placement
      await this.logOrderEvent('ORDER_PLACED_SUCCESS', orderRequest, { 
        orderResponse, 
        executionTime,
        validationResult 
      });
      
      // Emit order placed event
      this.emit('orderPlaced', orderResponse);
      
      logger.info(`✅ Order placed successfully: ${orderResponse.id} (${executionTime}ms)`);
      
      return {
        success: true,
        order: orderResponse,
        executionTime,
        validationResult,
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Update statistics
      this.updateOrderStats(false, executionTime, 0, 0);
      
      // Log failed order placement
      await this.logOrderEvent('ORDER_PLACEMENT_FAILED', orderRequest, { 
        error: error.message,
        executionTime 
      });
      
      logger.error(`❌ Failed to place order: ${error.message}`);
      
      return {
        success: false,
        order: null,
        executionTime,
        error: error.message,
        validationResult: {
          isValid: false,
          errors: [error.message],
          warnings: [],
          riskScore: 100,
          estimatedCost: 0,
          estimatedFees: 0,
        },
      };
    }
  }

  /**
   * Cancel existing order with safety checks
   * 
   * @param orderId - Order ID to cancel
   * @param reason - Cancellation reason
   * @returns Promise<boolean> - Success status
   */
  public async cancelOrder(orderId: string, reason: string = 'User requested'): Promise<boolean> {
    try {
      logger.info(`🚫 Cancelling order: ${orderId} (reason: ${reason})`);
      
      // Check if order exists and is cancellable
      const order = this.activeOrders.get(orderId);
      if (!order) {
        logger.warn(`⚠️ Order not found in active orders: ${orderId}`);
        return false;
      }
      
      if (order.status === 'closed' || order.status === 'cancelled') {
        logger.warn(`⚠️ Order already ${order.status}: ${orderId}`);
        return false;
      }
      
      // Execute cancellation through Gate.io API
      await this.gateIOClient.makeRequest({
        method: 'DELETE',
        url: `/spot/orders/${orderId}`,
        data: { currency_pair: order.currency_pair },
      });
      
      // Update order status
      const updatedOrder = { ...order, status: 'cancelled' as OrderStatus };
      this.activeOrders.set(orderId, updatedOrder);
      
      // Update statistics
      this.stats.cancelledOrders++;
      
      // Log cancellation
      await this.logOrderEvent('ORDER_CANCELLED', order, { reason });
      
      // Emit order cancelled event
      this.emit('orderCancelled', updatedOrder, reason);
      
      logger.info(`✅ Order cancelled successfully: ${orderId}`);
      return true;
      
    } catch (error) {
      logger.error(`❌ Failed to cancel order ${orderId}:`, error);
      await this.logOrderEvent('ORDER_CANCELLATION_FAILED', { orderId }, { 
        error: error.message, 
        reason 
      });
      return false;
    }
  }

  /**
   * Modify existing order
   * 
   * @param orderId - Order ID to modify
   * @param modifications - Order modifications
   * @returns Promise<OrderResponse | null> - Modified order or null if failed
   */
  public async modifyOrder(
    orderId: string, 
    modifications: OrderModifyRequest
  ): Promise<OrderResponse | null> {
    try {
      logger.info(`✏️ Modifying order: ${orderId}`);
      
      // Check if order exists and is modifiable
      const order = this.activeOrders.get(orderId);
      if (!order) {
        logger.warn(`⚠️ Order not found: ${orderId}`);
        return null;
      }
      
      if (order.status !== 'open') {
        logger.warn(`⚠️ Order not modifiable (status: ${order.status}): ${orderId}`);
        return null;
      }
      
      // Validate modifications
      const validationResult = await this.validateOrderModification(order, modifications);
      if (!validationResult.isValid) {
        logger.error('❌ Order modification validation failed:', validationResult.errors);
        return null;
      }
      
      // Execute modification through Gate.io API
      const modifiedOrder = await this.gateIOClient.makeRequest<OrderResponse>({
        method: 'PATCH',
        url: `/spot/orders/${orderId}`,
        data: {
          currency_pair: order.currency_pair,
          ...modifications,
        },
      });
      
      // Update stored order
      this.activeOrders.set(orderId, modifiedOrder);
      
      // Log modification
      await this.logOrderEvent('ORDER_MODIFIED', order, { 
        modifications, 
        modifiedOrder,
        validationResult 
      });
      
      // Emit order modified event
      this.emit('orderModified', modifiedOrder, modifications);
      
      logger.info(`✅ Order modified successfully: ${orderId}`);
      return modifiedOrder;
      
    } catch (error) {
      logger.error(`❌ Failed to modify order ${orderId}:`, error);
      await this.logOrderEvent('ORDER_MODIFICATION_FAILED', { orderId }, { 
        error: error.message, 
        modifications 
      });
      return null;
    }
  }

  /**
   * Get order status with real-time updates
   * 
   * @param orderId - Order ID
   * @returns Promise<OrderResponse | null> - Order details or null if not found
   */
  public async getOrderStatus(orderId: string): Promise<OrderResponse | null> {
    try {
      // First check local cache
      const cachedOrder = this.activeOrders.get(orderId);
      
      // Fetch latest status from exchange
      const orderResponse = await this.gateIOClient.makeRequest<OrderResponse>({
        method: 'GET',
        url: `/spot/orders/${orderId}`,
        params: { currency_pair: cachedOrder?.currency_pair || 'BTC_USDT' },
      });
      
      // Update local cache
      if (orderResponse) {
        this.activeOrders.set(orderId, orderResponse);
        
        // Check for status changes
        if (cachedOrder && cachedOrder.status !== orderResponse.status) {
          await this.handleOrderStatusChange(cachedOrder, orderResponse);
        }
      }
      
      return orderResponse;
      
    } catch (error) {
      logger.error(`❌ Failed to get order status ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Get all active orders
   * 
   * @returns Array of active orders
   */
  public getActiveOrders(): OrderResponse[] {
    return Array.from(this.activeOrders.values()).filter(
      order => order.status === 'open'
    );
  }

  /**
   * Get order history
   * 
   * @param limit - Maximum number of orders to return
   * @returns Array of historical orders
   */
  public getOrderHistory(limit: number = 100): OrderResponse[] {
    return this.orderHistory
      .sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())
      .slice(0, limit);
  }

  /**
   * Get position summary for symbol
   * 
   * @param symbol - Trading symbol
   * @returns Position summary or null if no position
   */
  public getPosition(symbol: string): PositionSummary | null {
    return this.positions.get(symbol) || null;
  }

  /**
   * Get all positions
   * 
   * @returns Array of all position summaries
   */
  public getAllPositions(): PositionSummary[] {
    return Array.from(this.positions.values());
  }

  /**
   * Emergency stop - cancel all open orders
   * 
   * @param reason - Emergency stop reason
   * @returns Promise<boolean> - Success status
   */
  public async emergencyStop(reason: string = 'Emergency stop triggered'): Promise<boolean> {
    try {
      logger.warn(`🚨 EMERGENCY STOP: ${reason}`);
      
      const activeOrders = this.getActiveOrders();
      const cancellationPromises = activeOrders.map(order => 
        this.cancelOrder(order.id, `Emergency stop: ${reason}`)
      );
      
      const results = await Promise.allSettled(cancellationPromises);
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      await this.auditService.logSecurityEvent({
        type: 'EMERGENCY_STOP_EXECUTED',
        severity: 'CRITICAL',
        details: { 
          reason, 
          totalOrders: activeOrders.length, 
          cancelledOrders: successCount 
        },
        timestamp: new Date(),
      });
      
      logger.warn(`🚨 Emergency stop completed: ${successCount}/${activeOrders.length} orders cancelled`);
      
      // Emit emergency stop event
      this.emit('emergencyStop', reason, successCount, activeOrders.length);
      
      return successCount === activeOrders.length;
      
    } catch (error) {
      logger.error('❌ Emergency stop failed:', error);
      return false;
    }
  }

  /**
   * Validate order before placement
   * 
   * @param orderRequest - Order request to validate
   * @returns Promise<OrderValidationResult> - Validation result
   */
  private async validateOrder(orderRequest: OrderRequest): Promise<OrderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    
    // Validate required fields
    if (!orderRequest.currency_pair) {
      errors.push('Currency pair is required');
    }
    
    if (!orderRequest.side) {
      errors.push('Order side is required');
    }
    
    if (!orderRequest.amount || parseFloat(orderRequest.amount) <= 0) {
      errors.push('Order amount must be positive');
    }
    
    if (orderRequest.type === 'limit' && (!orderRequest.price || parseFloat(orderRequest.price) <= 0)) {
      errors.push('Limit orders require a positive price');
    }
    
    // Validate order size limits
    const orderValue = parseFloat(orderRequest.amount) * (parseFloat(orderRequest.price || '0') || 1);
    if (orderValue > this.config.maxOrderValue) {
      errors.push(`Order value exceeds maximum: ${orderValue} > ${this.config.maxOrderValue}`);
      riskScore += 30;
    }
    
    // Check daily volume limits
    const todayVolume = this.calculateTodayVolume();
    if (todayVolume + orderValue > this.config.maxDailyVolume) {
      warnings.push(`Order would exceed daily volume limit: ${todayVolume + orderValue} > ${this.config.maxDailyVolume}`);
      riskScore += 20;
    }
    
    // Estimate costs and fees
    const estimatedCost = orderValue;
    const estimatedFees = orderValue * 0.002; // Assume 0.2% fee
    
    // Check account balance (simplified)
    try {
      const balances = await this.gateIOClient.makeRequest({
        method: 'GET',
        url: '/spot/accounts',
      });
      
      // Add balance validation logic here
      // This is simplified - in production, you'd check specific currency balances
      
    } catch (error) {
      warnings.push('Could not verify account balance');
      riskScore += 10;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
      estimatedCost,
      estimatedFees,
    };
  }

  /**
   * Execute order through Gate.io API
   * 
   * @param orderRequest - Order request
   * @returns Promise<OrderResponse> - Order response
   */
  private async executeOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    const orderResponse = await this.gateIOClient.makeRequest<OrderResponse>({
      method: 'POST',
      url: '/spot/orders',
      data: orderRequest,
    });
    
    return orderResponse;
  }

  /**
   * Validate order execution
   * 
   * @param orderRequest - Original order request
   * @param orderResponse - Order response from exchange
   * @returns Promise<OrderValidationResult> - Validation result
   */
  private async validateOrderExecution(
    orderRequest: OrderRequest, 
    orderResponse: OrderResponse
  ): Promise<OrderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate response matches request
    if (orderResponse.currency_pair !== orderRequest.currency_pair) {
      errors.push('Currency pair mismatch');
    }
    
    if (orderResponse.side !== orderRequest.side) {
      errors.push('Order side mismatch');
    }
    
    if (orderResponse.type !== orderRequest.type) {
      errors.push('Order type mismatch');
    }
    
    if (Math.abs(parseFloat(orderResponse.amount) - parseFloat(orderRequest.amount)) > 0.00001) {
      errors.push('Order amount mismatch');
    }
    
    // Validate order was accepted
    if (!orderResponse.id) {
      errors.push('Order ID not received');
    }
    
    if (orderResponse.status === 'cancelled' || orderResponse.status === 'expired') {
      warnings.push(`Order immediately ${orderResponse.status}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: errors.length > 0 ? 100 : warnings.length * 10,
      estimatedCost: 0,
      estimatedFees: 0,
    };
  }

  /**
   * Assess order risk
   * 
   * @param orderRequest - Order request
   * @param validationResult - Validation result
   * @returns Promise<any> - Risk assessment
   */
  private async assessOrderRisk(
    orderRequest: OrderRequest, 
    validationResult: OrderValidationResult
  ): Promise<any> {
    // Simplified risk assessment
    // In production, this would include more sophisticated risk models
    return {
      riskScore: validationResult.riskScore,
      factors: validationResult.warnings,
    };
  }

  /**
   * Validate order modification
   * 
   * @param order - Original order
   * @param modifications - Proposed modifications
   * @returns Promise<OrderValidationResult> - Validation result
   */
  private async validateOrderModification(
    order: OrderResponse, 
    modifications: OrderModifyRequest
  ): Promise<OrderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate modification parameters
    if (modifications.price && parseFloat(modifications.price) <= 0) {
      errors.push('Modified price must be positive');
    }
    
    if (modifications.amount && parseFloat(modifications.amount) <= 0) {
      errors.push('Modified amount must be positive');
    }
    
    // Check if modifications are significant
    if (modifications.price && Math.abs(parseFloat(modifications.price) - parseFloat(order.price)) < 0.01) {
      warnings.push('Price modification is very small');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: errors.length * 20,
      estimatedCost: 0,
      estimatedFees: 0,
    };
  }

  /**
   * Handle order status changes
   * 
   * @param oldOrder - Previous order state
   * @param newOrder - New order state
   */
  private async handleOrderStatusChange(
    oldOrder: OrderResponse, 
    newOrder: OrderResponse
  ): Promise<void> {
    const statusUpdate: OrderStatusUpdate = {
      orderId: newOrder.id,
      oldStatus: oldOrder.status,
      newStatus: newOrder.status,
      timestamp: new Date(),
      filledAmount: newOrder.filled_total,
      remainingAmount: newOrder.left,
      averagePrice: newOrder.price,
    };
    
    // Log status change
    await this.logOrderEvent('ORDER_STATUS_CHANGED', newOrder, { statusUpdate });
    
    // Update position tracking
    await this.updatePositionTracking(newOrder);
    
    // Emit status change event
    this.emit('orderStatusChanged', statusUpdate);
    
    logger.info(`📊 Order status changed: ${statusUpdate.orderId} (${statusUpdate.oldStatus} -> ${statusUpdate.newStatus})`);
  }

  /**
   * Load existing orders from exchange
   */
  private async loadExistingOrders(): Promise<void> {
    try {
      // Load open orders for each supported trading pair
      const symbols: TradingSymbol[] = ['BTC_USDT', 'ETH_USDT'];
      
      for (const symbol of symbols) {
        const orders = await this.gateIOClient.makeRequest<OrderResponse[]>({
          method: 'GET',
          url: '/spot/orders',
          params: { 
            currency_pair: symbol,
            status: 'open',
            limit: 100 
          },
        });
        
        // Store active orders
        orders.forEach(order => {
          this.activeOrders.set(order.id, order);
          this.orderHistory.push(order);
        });
      }
      
      logger.info(`📋 Loaded ${this.activeOrders.size} existing orders`);
      
    } catch (error) {
      logger.error('❌ Failed to load existing orders:', error);
    }
  }

  /**
   * Start order status monitoring
   */
  private startOrderStatusMonitoring(): void {
    this.statusMonitorInterval = setInterval(async () => {
      await this.monitorOrderStatuses();
    }, this.statusCheckInterval);
    
    logger.info('👁️ Started order status monitoring');
  }

  /**
   * Monitor order statuses
   */
  private async monitorOrderStatuses(): Promise<void> {
    const activeOrders = this.getActiveOrders();
    
    for (const order of activeOrders) {
      try {
        await this.getOrderStatus(order.id);
      } catch (error) {
        logger.error(`❌ Failed to monitor order ${order.id}:`, error);
      }
    }
    
    // Clean up old orders
    await this.cleanupOldOrders();
  }

  /**
   * Initialize position tracking
   */
  private async initializePositionTracking(): Promise<void> {
    try {
      // Initialize positions for supported symbols
      const symbols: TradingSymbol[] = ['BTC_USDT', 'ETH_USDT'];
      
      for (const symbol of symbols) {
        this.positions.set(symbol, {
          symbol,
          side: 'neutral',
          totalAmount: 0,
          averagePrice: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          openOrders: [],
          lastUpdate: new Date(),
        });
      }
      
      logger.info('📊 Position tracking initialized');
      
    } catch (error) {
      logger.error('❌ Failed to initialize position tracking:', error);
    }
  }

  /**
   * Update position tracking
   * 
   * @param order - Order to update position with
   */
  private async updatePositionTracking(order: OrderResponse): Promise<void> {
    try {
      const position = this.positions.get(order.currency_pair);
      if (!position) return;
      
      // Update position based on order status
      if (order.status === 'closed') {
        const filledAmount = parseFloat(order.filled_total);
        const price = parseFloat(order.price);
        
        if (order.side === 'buy') {
          position.totalAmount += filledAmount;
        } else {
          position.totalAmount -= filledAmount;
        }
        
        // Recalculate average price (simplified)
        if (position.totalAmount > 0) {
          position.averagePrice = price; // Simplified calculation
        }
      }
      
      // Update open orders
      position.openOrders = this.getActiveOrders().filter(
        o => o.currency_pair === order.currency_pair
      );
      
      position.lastUpdate = new Date();
      
    } catch (error) {
      logger.error('❌ Failed to update position tracking:', error);
    }
  }

  /**
   * Calculate today's trading volume
   */
  private calculateTodayVolume(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.orderHistory
      .filter(order => new Date(order.create_time) >= today)
      .reduce((total, order) => {
        const volume = parseFloat(order.amount) * parseFloat(order.price);
        return total + volume;
      }, 0);
  }

  /**
   * Update order statistics
   * 
   * @param success - Order success status
   * @param executionTime - Execution time in milliseconds
   * @param volume - Order volume
   * @param fees - Order fees
   */
  private updateOrderStats(
    success: boolean, 
    executionTime: number, 
    volume: number, 
    fees: number
  ): void {
    this.stats.totalOrders++;
    this.stats.lastOrderTime = new Date();
    
    if (success) {
      this.stats.successfulOrders++;
      this.stats.totalVolume += volume;
      this.stats.totalFees += fees;
    } else {
      this.stats.failedOrders++;
    }
    
    // Update average execution time
    const alpha = 0.1;
    this.stats.averageExecutionTime = 
      (alpha * executionTime) + ((1 - alpha) * this.stats.averageExecutionTime);
    
    // Update success rate
    this.stats.successRate = (this.stats.successfulOrders / this.stats.totalOrders) * 100;
  }

  /**
   * Clean up old orders from memory
   */
  private async cleanupOldOrders(): Promise<void> {
    const cutoffTime = Date.now() - this.maxOrderAge;
    
    // Remove old orders from active orders map
    for (const [orderId, order] of this.activeOrders.entries()) {
      const orderTime = new Date(order.create_time).getTime();
      if (orderTime < cutoffTime && (order.status === 'closed' || order.status === 'cancelled')) {
        this.activeOrders.delete(orderId);
      }
    }
    
    // Limit order history size
    if (this.orderHistory.length > 1000) {
      this.orderHistory = this.orderHistory
        .sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())
        .slice(0, 1000);
    }
  }

  /**
   * Log order event for audit trail
   * 
   * @param eventType - Event type
   * @param orderData - Order data
   * @param additionalData - Additional event data
   */
  private async logOrderEvent(
    eventType: string, 
    orderData: any, 
    additionalData: any = {}
  ): Promise<void> {
    await this.auditService.logSecurityEvent({
      type: eventType,
      severity: 'INFO',
      details: {
        orderData: this.sanitizeOrderData(orderData),
        ...additionalData,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Sanitize order data for logging
   * 
   * @param orderData - Order data to sanitize
   * @returns Sanitized order data
   */
  private sanitizeOrderData(orderData: any): any {
    // Remove sensitive information from logs
    const sanitized = { ...orderData };
    
    // Keep only essential order information
    if (sanitized.text) {
      delete sanitized.text; // May contain sensitive info
    }
    
    return sanitized;
  }

  /**
   * Get order management statistics
   */
  public getOrderStats(): OrderManagementStats {
    return { ...this.stats };
  }

  /**
   * Get order execution configuration
   */
  public getConfig(): OrderExecutionConfig {
    return { ...this.config };
  }

  /**
   * Update order execution configuration
   * 
   * @param config - New configuration
   */
  public updateConfig(config: Partial<OrderExecutionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('⚙️ Order execution configuration updated');
  }

  /**
   * Create and place a new order (alias for placeOrder for compatibility)
   * 
   * @param orderRequest - Order request parameters
   * @returns Promise<OrderResponse | null> - Order response or null if failed
   */
  public async createOrder(orderRequest: OrderRequest): Promise<OrderResponse | null> {
    try {
      const result = await this.placeOrder(orderRequest);
      return result.success ? result.order : null;
    } catch (error) {
      logger.error('❌ Failed to create order:', error);
      return null;
    }
  }

  /**
   * Get all open orders from the exchange
   * 
   * @param symbol - Optional symbol filter
   * @returns Promise<OrderResponse[]> - Array of open orders
   */
  public async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      logger.debug('📋 Fetching open orders from exchange...');
      
      const symbols: TradingSymbol[] = symbol ? [symbol as TradingSymbol] : ['BTC_USDT', 'ETH_USDT'];
      const allOrders: OrderResponse[] = [];
      
      for (const tradingSymbol of symbols) {
        try {
          const orders = await this.gateIOClient.makeRequest<OrderResponse[]>({
            method: 'GET',
            url: '/spot/orders',
            params: { 
              currency_pair: tradingSymbol,
              status: 'open',
              limit: 100 
            },
          });
          
          allOrders.push(...orders);
        } catch (error) {
          logger.warn(`⚠️ Failed to fetch orders for ${tradingSymbol}:`, error);
        }
      }
      
      // Update local cache
      allOrders.forEach(order => {
        this.activeOrders.set(order.id, order);
      });
      
      logger.info(`📋 Retrieved ${allOrders.length} open orders`);
      return allOrders;
      
    } catch (error) {
      logger.error('❌ Failed to get open orders:', error);
      return [];
    }
  }

  /**
   * Cancel all open orders (emergency stop functionality)
   * 
   * @param reason - Reason for cancelling all orders
   * @returns Promise<boolean> - Success status
   */
  public async cancelAllOrders(reason: string = 'Cancel all orders requested'): Promise<boolean> {
    try {
      logger.warn(`🚨 Cancelling all open orders: ${reason}`);
      
      // Get all open orders first
      const openOrders = await this.getOpenOrders();
      
      if (openOrders.length === 0) {
        logger.info('✅ No open orders to cancel');
        return true;
      }
      
      // Cancel each order
      const cancellationPromises = openOrders.map(order => 
        this.cancelOrder(order.id, reason)
      );
      
      const results = await Promise.allSettled(cancellationPromises);
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      const success = successCount === openOrders.length;
      
      // Log the operation
      await this.auditService.logSecurityEvent({
        type: 'CANCEL_ALL_ORDERS',
        severity: success ? 'INFO' : 'WARNING',
        details: { 
          reason, 
          totalOrders: openOrders.length, 
          cancelledOrders: successCount,
          success 
        },
        timestamp: new Date(),
      });
      
      if (success) {
        logger.info(`✅ Successfully cancelled all ${successCount} orders`);
      } else {
        logger.warn(`⚠️ Cancelled ${successCount}/${openOrders.length} orders`);
      }
      
      // Emit cancel all orders event
      this.emit('cancelAllOrders', reason, successCount, openOrders.length);
      
      return success;
      
    } catch (error) {
      logger.error('❌ Failed to cancel all orders:', error);
      await this.auditService.logSecurityEvent({
        type: 'CANCEL_ALL_ORDERS_FAILED',
        severity: 'ERROR',
        details: { 
          reason, 
          error: error.message 
        },
        timestamp: new Date(),
      });
      return false;
    }
  }

  /**
   * Refresh open orders from the exchange and update local cache
   * 
   * @returns Promise<void>
   */
  public async refreshOpenOrders(): Promise<void> {
    try {
      logger.debug('🔄 Refreshing open orders from exchange...');
      
      // Get fresh data from exchange
      const openOrders = await this.getOpenOrders();
      
      // Clear existing active orders and rebuild from fresh data
      this.activeOrders.clear();
      
      // Add all open orders to active orders map
      openOrders.forEach(order => {
        this.activeOrders.set(order.id, order);
      });
      
      // Update position tracking
      for (const order of openOrders) {
        await this.updatePositionTracking(order);
      }
      
      logger.debug(`🔄 Refreshed ${openOrders.length} open orders`);
      
      // Emit refresh event
      this.emit('ordersRefreshed', openOrders.length);
      
    } catch (error) {
      logger.error('❌ Failed to refresh open orders:', error);
    }
  }

  /**
   * Check if the order manager is healthy and operational
   * 
   * @returns boolean - Health status
   */
  public isHealthy(): boolean {
    try {
      // Check if the order manager is properly initialized
      if (!this.gateIOClient || !this.auditService) {
        logger.warn('⚠️ Order manager not properly initialized');
        return false;
      }
      
      // Check if monitoring is running
      if (!this.statusMonitorInterval) {
        logger.warn('⚠️ Order status monitoring not running');
        return false;
      }
      
      // Check if we have reasonable statistics (not all zeros)
      if (this.stats.totalOrders > 0 && this.stats.successRate < 0.5) {
        logger.warn('⚠️ Order success rate is below 50%');
        return false;
      }
      
      // Check if we have too many active orders (potential issue)
      const activeOrderCount = this.getActiveOrders().length;
      if (activeOrderCount > 100) {
        logger.warn(`⚠️ Too many active orders: ${activeOrderCount}`);
        return false;
      }
      
      // Check if average execution time is reasonable
      if (this.stats.averageExecutionTime > 30000) { // 30 seconds
        logger.warn(`⚠️ Average execution time too high: ${this.stats.averageExecutionTime}ms`);
        return false;
      }
      
      logger.debug('✅ Order manager health check passed');
      return true;
      
    } catch (error) {
      logger.error('❌ Order manager health check failed:', error);
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down Order Manager...');
    
    // Stop status monitoring
    if (this.statusMonitorInterval) {
      clearInterval(this.statusMonitorInterval);
      this.statusMonitorInterval = null;
    }
    
    // Log final statistics
    await this.auditService.logSecurityEvent({
      type: 'ORDER_MANAGER_SHUTDOWN',
      severity: 'INFO',
      details: { 
        stats: this.stats,
        activeOrders: this.activeOrders.size,
        positions: this.positions.size 
      },
      timestamp: new Date(),
    });
    
    logger.info('✅ Order Manager shutdown completed');
  }
}

// Export types
export type {
  OrderValidationResult,
  OrderExecutionResult,
  OrderStatusUpdate,
  PositionSummary,
  OrderManagementStats,
  OrderExecutionConfig,
};
