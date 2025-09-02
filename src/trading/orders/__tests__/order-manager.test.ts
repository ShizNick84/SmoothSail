/**
 * =============================================================================
 * ORDER MANAGER TESTS
 * =============================================================================
 * 
 * Comprehensive test suite for the order management system with validation,
 * execution, status monitoring, and position tracking.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { OrderManager } from '../order-manager';
import { GateIOClient } from '../../api/gate-io-client';
import { AuditService } from '@/security/audit-service';
import { OrderRequest, OrderResponse, OrderStatus, OrderSide, OrderType } from '../../api/types';

// Mock dependencies
jest.mock('../../api/gate-io-client');
jest.mock('@/security/audit-service');
jest.mock('@/core/logging/logger');

const MockedGateIOClient = GateIOClient as jest.MockedClass<typeof GateIOClient>;
const MockedAuditService = AuditService as jest.MockedClass<typeof AuditService>;

describe('OrderManager', () => {
  let orderManager: OrderManager;
  let mockGateIOClient: jest.Mocked<GateIOClient>;
  let mockAuditService: jest.Mocked<AuditService>;

  // Sample order data
  const sampleOrderRequest: OrderRequest = {
    currency_pair: 'BTC_USDT',
    type: 'limit',
    side: 'buy',
    amount: '0.001',
    price: '50000',
    time_in_force: 'GTC',
  };

  const sampleOrderResponse: OrderResponse = {
    id: 'order-123',
    text: 'test-order',
    create_time: '2024-01-01T00:00:00Z',
    update_time: '2024-01-01T00:00:00Z',
    create_time_ms: Date.now(),
    update_time_ms: Date.now(),
    status: 'open',
    currency_pair: 'BTC_USDT',
    type: 'limit',
    account: 'spot',
    side: 'buy',
    amount: '0.001',
    price: '50000',
    time_in_force: 'GTC',
    iceberg: '0',
    auto_borrow: false,
    auto_repay: false,
    left: '0.001',
    filled_total: '0',
    fee: '0',
    fee_currency: 'USDT',
    point_fee: '0',
    gt_fee: '0',
    gt_discount: false,
    rebated_fee: '0',
    rebated_fee_currency: 'USDT',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock GateIO client
    mockGateIOClient = new MockedGateIOClient() as jest.Mocked<GateIOClient>;
    mockGateIOClient.makeRequest = jest.fn();
    
    // Mock audit service
    mockAuditService = new MockedAuditService() as jest.Mocked<AuditService>;
    mockAuditService.logSecurityEvent = jest.fn().mockResolvedValue(undefined);
    
    // Create order manager instance
    orderManager = new OrderManager(mockGateIOClient);
  });

  describe('Initialization', () => {
    it('should initialize successfully with default configuration', async () => {
      // Mock existing orders response
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      
      const result = await orderManager.initialize();
      
      expect(result).toBe(true);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER_MANAGER_INITIALIZED',
          severity: 'INFO'
        })
      );
    });

    it('should initialize with custom configuration', async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      
      const customConfig = {
        maxOrderValue: 5000,
        enableRiskChecks: false,
      };
      
      const result = await orderManager.initialize(customConfig);
      
      expect(result).toBe(true);
      const config = orderManager.getConfig();
      expect(config.maxOrderValue).toBe(5000);
      expect(config.enableRiskChecks).toBe(false);
    });

    it('should load existing orders during initialization', async () => {
      const existingOrders = [sampleOrderResponse];
      mockGateIOClient.makeRequest.mockResolvedValue(existingOrders);
      
      await orderManager.initialize();
      
      const activeOrders = orderManager.getActiveOrders();
      expect(activeOrders).toHaveLength(1);
      expect(activeOrders[0].id).toBe('order-123');
    });

    it('should handle initialization failure gracefully', async () => {
      mockGateIOClient.makeRequest.mockRejectedValue(new Error('API error'));
      
      const result = await orderManager.initialize();
      
      expect(result).toBe(false);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER_MANAGER_INIT_FAILED',
          severity: 'ERROR'
        })
      );
    });
  });

  describe('Order Placement', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should place order successfully with validation', async () => {
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Account balance check
        .mockResolvedValueOnce(sampleOrderResponse); // Order placement
      
      const result = await orderManager.placeOrder(sampleOrderRequest);
      
      expect(result.success).toBe(true);
      expect(result.order).toEqual(sampleOrderResponse);
      expect(result.validationResult.isValid).toBe(true);
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/spot/orders',
          data: sampleOrderRequest
        })
      );
    });

    it('should reject invalid orders', async () => {
      const invalidOrder: OrderRequest = {
        currency_pair: '',
        type: 'limit',
        side: 'buy',
        amount: '0',
        price: '50000',
      };
      
      const result = await orderManager.placeOrder(invalidOrder);
      
      expect(result.success).toBe(false);
      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.errors).toContain('Currency pair is required');
      expect(result.validationResult.errors).toContain('Order amount must be positive');
    });

    it('should reject orders exceeding maximum value', async () => {
      const largeOrder: OrderRequest = {
        ...sampleOrderRequest,
        amount: '1', // 1 BTC at $50,000 = $50,000 (exceeds default $10,000 limit)
      };
      
      const result = await orderManager.placeOrder(largeOrder);
      
      expect(result.success).toBe(false);
      expect(result.validationResult.errors).toContain(
        expect.stringContaining('Order value exceeds maximum')
      );
    });

    it('should handle high-risk orders', async () => {
      // Configure to enable risk checks
      orderManager.updateConfig({ enableRiskChecks: true });
      
      const highRiskOrder: OrderRequest = {
        ...sampleOrderRequest,
        amount: '0.2', // $10,000 order (at limit)
      };
      
      mockGateIOClient.makeRequest.mockResolvedValueOnce([]); // Balance check
      
      const result = await orderManager.placeOrder(highRiskOrder);
      
      // Should succeed but with warnings
      expect(result.success).toBe(true);
      expect(result.validationResult.warnings.length).toBeGreaterThan(0);
    });

    it('should handle API errors during order placement', async () => {
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Balance check
        .mockRejectedValueOnce(new Error('API error'));
      
      const result = await orderManager.placeOrder(sampleOrderRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });

    it('should perform post-execution validation', async () => {
      const mismatchedResponse = {
        ...sampleOrderResponse,
        side: 'sell' as OrderSide, // Different from request
      };
      
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Balance check
        .mockResolvedValueOnce(mismatchedResponse) // Order placement
        .mockResolvedValueOnce(undefined); // Order cancellation
      
      const result = await orderManager.placeOrder(sampleOrderRequest);
      
      expect(result.success).toBe(true);
      // Should attempt to cancel due to validation failure
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: `/spot/orders/${mismatchedResponse.id}`
        })
      );
    });
  });

  describe('Order Cancellation', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([sampleOrderResponse]);
      await orderManager.initialize();
    });

    it('should cancel order successfully', async () => {
      mockGateIOClient.makeRequest.mockResolvedValueOnce(undefined);
      
      const result = await orderManager.cancelOrder('order-123', 'User requested');
      
      expect(result).toBe(true);
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/spot/orders/order-123',
          data: { currency_pair: 'BTC_USDT' }
        })
      );
    });

    it('should handle cancellation of non-existent order', async () => {
      const result = await orderManager.cancelOrder('non-existent', 'Test');
      
      expect(result).toBe(false);
    });

    it('should handle cancellation of already closed order', async () => {
      const closedOrder = { ...sampleOrderResponse, status: 'closed' as OrderStatus };
      mockGateIOClient.makeRequest.mockResolvedValue([closedOrder]);
      await orderManager.initialize();
      
      const result = await orderManager.cancelOrder('order-123', 'Test');
      
      expect(result).toBe(false);
    });

    it('should handle API errors during cancellation', async () => {
      mockGateIOClient.makeRequest.mockRejectedValueOnce(new Error('API error'));
      
      const result = await orderManager.cancelOrder('order-123', 'Test');
      
      expect(result).toBe(false);
    });
  });

  describe('Order Modification', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([sampleOrderResponse]);
      await orderManager.initialize();
    });

    it('should modify order successfully', async () => {
      const modifications = {
        price: '51000',
        amount: '0.002',
      };
      
      const modifiedOrder = {
        ...sampleOrderResponse,
        price: '51000',
        amount: '0.002',
      };
      
      mockGateIOClient.makeRequest.mockResolvedValueOnce(modifiedOrder);
      
      const result = await orderManager.modifyOrder('order-123', modifications);
      
      expect(result).toEqual(modifiedOrder);
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/spot/orders/order-123',
          data: expect.objectContaining({
            currency_pair: 'BTC_USDT',
            ...modifications
          })
        })
      );
    });

    it('should reject invalid modifications', async () => {
      const invalidModifications = {
        price: '-100', // Negative price
      };
      
      const result = await orderManager.modifyOrder('order-123', invalidModifications);
      
      expect(result).toBeNull();
    });

    it('should handle modification of non-modifiable order', async () => {
      const closedOrder = { ...sampleOrderResponse, status: 'closed' as OrderStatus };
      mockGateIOClient.makeRequest.mockResolvedValue([closedOrder]);
      await orderManager.initialize();
      
      const result = await orderManager.modifyOrder('order-123', { price: '51000' });
      
      expect(result).toBeNull();
    });
  });

  describe('Order Status Monitoring', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([sampleOrderResponse]);
      await orderManager.initialize();
    });

    it('should get order status successfully', async () => {
      const updatedOrder = { ...sampleOrderResponse, status: 'closed' as OrderStatus };
      mockGateIOClient.makeRequest.mockResolvedValueOnce(updatedOrder);
      
      const result = await orderManager.getOrderStatus('order-123');
      
      expect(result).toEqual(updatedOrder);
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/spot/orders/order-123'
        })
      );
    });

    it('should handle status change events', async () => {
      const statusChangeSpy = jest.fn();
      orderManager.on('orderStatusChanged', statusChangeSpy);
      
      const updatedOrder = { ...sampleOrderResponse, status: 'closed' as OrderStatus };
      mockGateIOClient.makeRequest.mockResolvedValueOnce(updatedOrder);
      
      await orderManager.getOrderStatus('order-123');
      
      expect(statusChangeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          oldStatus: 'open',
          newStatus: 'closed'
        })
      );
    });

    it('should handle API errors during status check', async () => {
      mockGateIOClient.makeRequest.mockRejectedValueOnce(new Error('API error'));
      
      const result = await orderManager.getOrderStatus('order-123');
      
      expect(result).toBeNull();
    });
  });

  describe('Position Tracking', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should track positions correctly', async () => {
      const position = orderManager.getPosition('BTC_USDT');
      
      expect(position).toBeDefined();
      expect(position?.symbol).toBe('BTC_USDT');
      expect(position?.side).toBe('neutral');
      expect(position?.totalAmount).toBe(0);
    });

    it('should update position on order fill', async () => {
      const filledOrder = {
        ...sampleOrderResponse,
        status: 'closed' as OrderStatus,
        filled_total: '0.001',
      };
      
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Balance check
        .mockResolvedValueOnce(filledOrder); // Order placement
      
      await orderManager.placeOrder(sampleOrderRequest);
      
      const position = orderManager.getPosition('BTC_USDT');
      expect(position?.totalAmount).toBe(0.001);
    });

    it('should return all positions', () => {
      const positions = orderManager.getAllPositions();
      
      expect(positions).toHaveLength(2); // BTC_USDT and ETH_USDT
      expect(positions.map(p => p.symbol)).toContain('BTC_USDT');
      expect(positions.map(p => p.symbol)).toContain('ETH_USDT');
    });
  });

  describe('Emergency Stop', () => {
    beforeEach(async () => {
      const activeOrders = [
        sampleOrderResponse,
        { ...sampleOrderResponse, id: 'order-456' },
      ];
      mockGateIOClient.makeRequest.mockResolvedValue(activeOrders);
      await orderManager.initialize();
    });

    it('should cancel all active orders during emergency stop', async () => {
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce(undefined) // Cancel order-123
        .mockResolvedValueOnce(undefined); // Cancel order-456
      
      const emergencyStopSpy = jest.fn();
      orderManager.on('emergencyStop', emergencyStopSpy);
      
      const result = await orderManager.emergencyStop('Market crash detected');
      
      expect(result).toBe(true);
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledTimes(2);
      expect(emergencyStopSpy).toHaveBeenCalledWith(
        'Market crash detected',
        2, // cancelled orders
        2  // total orders
      );
    });

    it('should handle partial cancellation failures', async () => {
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce(undefined) // Cancel order-123 (success)
        .mockRejectedValueOnce(new Error('API error')); // Cancel order-456 (fail)
      
      const result = await orderManager.emergencyStop('Test emergency');
      
      expect(result).toBe(false); // Not all orders cancelled
    });
  });

  describe('Order History and Statistics', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should track order statistics', async () => {
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Balance check
        .mockResolvedValueOnce(sampleOrderResponse); // Order placement
      
      await orderManager.placeOrder(sampleOrderRequest);
      
      const stats = orderManager.getOrderStats();
      expect(stats.totalOrders).toBe(1);
      expect(stats.successfulOrders).toBe(1);
      expect(stats.failedOrders).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    it('should return order history', async () => {
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Balance check
        .mockResolvedValueOnce(sampleOrderResponse); // Order placement
      
      await orderManager.placeOrder(sampleOrderRequest);
      
      const history = orderManager.getOrderHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('order-123');
    });

    it('should limit order history size', async () => {
      const history = orderManager.getOrderHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should return current configuration', () => {
      const config = orderManager.getConfig();
      
      expect(config).toHaveProperty('enablePreValidation');
      expect(config).toHaveProperty('maxOrderValue');
      expect(config).toHaveProperty('enableRiskChecks');
    });

    it('should update configuration', () => {
      const newConfig = {
        maxOrderValue: 20000,
        enableRiskChecks: false,
      };
      
      orderManager.updateConfig(newConfig);
      
      const config = orderManager.getConfig();
      expect(config.maxOrderValue).toBe(20000);
      expect(config.enableRiskChecks).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should handle network errors gracefully', async () => {
      mockGateIOClient.makeRequest.mockRejectedValue(new Error('Network error'));
      
      const result = await orderManager.placeOrder(sampleOrderRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle API rate limiting', async () => {
      const rateLimitError = {
        response: { status: 429 },
        message: 'Rate limit exceeded'
      };
      
      mockGateIOClient.makeRequest.mockRejectedValue(rateLimitError);
      
      const result = await orderManager.placeOrder(sampleOrderRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle invalid order responses', async () => {
      const invalidResponse = {
        ...sampleOrderResponse,
        id: '', // Missing order ID
      };
      
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Balance check
        .mockResolvedValueOnce(invalidResponse); // Order placement
      
      const result = await orderManager.placeOrder(sampleOrderRequest);
      
      expect(result.success).toBe(true); // Order placed but validation warnings
      expect(result.validationResult.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should shutdown gracefully', async () => {
      await orderManager.shutdown();
      
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER_MANAGER_SHUTDOWN',
          severity: 'INFO'
        })
      );
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should emit orderPlaced event', async () => {
      const orderPlacedSpy = jest.fn();
      orderManager.on('orderPlaced', orderPlacedSpy);
      
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Balance check
        .mockResolvedValueOnce(sampleOrderResponse); // Order placement
      
      await orderManager.placeOrder(sampleOrderRequest);
      
      expect(orderPlacedSpy).toHaveBeenCalledWith(sampleOrderResponse);
    });

    it('should emit orderCancelled event', async () => {
      // First place an order
      mockGateIOClient.makeRequest.mockResolvedValue([sampleOrderResponse]);
      await orderManager.initialize();
      
      const orderCancelledSpy = jest.fn();
      orderManager.on('orderCancelled', orderCancelledSpy);
      
      mockGateIOClient.makeRequest.mockResolvedValueOnce(undefined);
      
      await orderManager.cancelOrder('order-123', 'Test cancellation');
      
      expect(orderCancelledSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-123' }),
        'Test cancellation'
      );
    });

    it('should emit orderModified event', async () => {
      // First place an order
      mockGateIOClient.makeRequest.mockResolvedValue([sampleOrderResponse]);
      await orderManager.initialize();
      
      const orderModifiedSpy = jest.fn();
      orderManager.on('orderModified', orderModifiedSpy);
      
      const modifications = { price: '51000' };
      const modifiedOrder = { ...sampleOrderResponse, price: '51000' };
      
      mockGateIOClient.makeRequest.mockResolvedValueOnce(modifiedOrder);
      
      await orderManager.modifyOrder('order-123', modifications);
      
      expect(orderModifiedSpy).toHaveBeenCalledWith(modifiedOrder, modifications);
    });
  });
});
