/**
 * =============================================================================
 * ORDER MANAGER MISSING METHODS TESTS
 * =============================================================================
 * 
 * Tests for the newly implemented missing methods in OrderManager:
 * - createOrder()
 * - getOpenOrders()
 * - cancelAllOrders()
 * - refreshOpenOrders()
 * - isHealthy()
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { OrderManager } from '../order-manager';
import { GateIOClient } from '../../api/gate-io-client';
import { AuditService } from '@/security/audit-service';
import { OrderRequest, OrderResponse, OrderStatus } from '../../api/types';

// Mock dependencies
jest.mock('../../api/gate-io-client');
jest.mock('@/security/audit-service');
jest.mock('@/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const MockedGateIOClient = GateIOClient as jest.MockedClass<typeof GateIOClient>;
const MockedAuditService = AuditService as jest.MockedClass<typeof AuditService>;

describe('OrderManager Missing Methods', () => {
  let orderManager: OrderManager;
  let mockGateIOClient: jest.Mocked<GateIOClient>;
  let mockAuditService: jest.Mocked<AuditService>;

  // Sample test data
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
    create_time_ms: 1704067200000,
    update_time_ms: 1704067200000,
    status: 'open' as OrderStatus,
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
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockGateIOClient = new MockedGateIOClient() as jest.Mocked<GateIOClient>;
    mockAuditService = new MockedAuditService() as jest.Mocked<AuditService>;

    // Setup default mock implementations
    mockGateIOClient.makeRequest = jest.fn();
    mockAuditService.logSecurityEvent = jest.fn().mockResolvedValue(undefined);

    // Create order manager instance
    orderManager = new OrderManager(mockGateIOClient);
  });

  describe('createOrder()', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should create order successfully', async () => {
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Initialize call
        .mockResolvedValueOnce([]) // Balance check
        .mockResolvedValueOnce(sampleOrderResponse); // Order placement

      const result = await orderManager.createOrder(sampleOrderRequest);

      expect(result).toBeTruthy();
      expect(result?.id).toBe('order-123');
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/spot/orders',
        data: sampleOrderRequest,
      });
    });

    it('should return null on order creation failure', async () => {
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Initialize call
        .mockRejectedValueOnce(new Error('API error')); // Order placement fails

      const result = await orderManager.createOrder(sampleOrderRequest);

      expect(result).toBeNull();
    });

    it('should handle validation errors', async () => {
      const invalidOrder: OrderRequest = {
        currency_pair: '',
        type: 'limit',
        side: 'buy',
        amount: '0',
        price: '50000',
      };

      const result = await orderManager.createOrder(invalidOrder);

      expect(result).toBeNull();
    });
  });

  describe('getOpenOrders()', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should fetch open orders for all symbols', async () => {
      const openOrders = [sampleOrderResponse];
      mockGateIOClient.makeRequest.mockResolvedValue(openOrders);

      const result = await orderManager.getOpenOrders();

      expect(result).toHaveLength(2); // Called for BTC_USDT and ETH_USDT
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/spot/orders',
        params: {
          currency_pair: 'BTC_USDT',
          status: 'open',
          limit: 100,
        },
      });
    });

    it('should fetch open orders for specific symbol', async () => {
      const openOrders = [sampleOrderResponse];
      mockGateIOClient.makeRequest.mockResolvedValue(openOrders);

      const result = await orderManager.getOpenOrders('BTC_USDT');

      expect(result).toHaveLength(1);
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      mockGateIOClient.makeRequest.mockRejectedValue(new Error('API error'));

      const result = await orderManager.getOpenOrders();

      expect(result).toEqual([]);
    });

    it('should update local cache with fetched orders', async () => {
      const openOrders = [sampleOrderResponse];
      mockGateIOClient.makeRequest.mockResolvedValue(openOrders);

      await orderManager.getOpenOrders();

      const activeOrders = orderManager.getActiveOrders();
      expect(activeOrders).toHaveLength(2); // One for each symbol call
    });
  });

  describe('cancelAllOrders()', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should cancel all open orders successfully', async () => {
      const openOrders = [sampleOrderResponse];
      
      // Mock getOpenOrders call
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce(openOrders) // BTC_USDT orders
        .mockResolvedValueOnce([]) // ETH_USDT orders
        .mockResolvedValueOnce(undefined); // Cancel order call

      const result = await orderManager.cancelAllOrders('Test cancellation');

      expect(result).toBe(true);
      expect(mockGateIOClient.makeRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/spot/orders/order-123',
        data: { currency_pair: 'BTC_USDT' },
      });
    });

    it('should return true when no orders to cancel', async () => {
      // Mock empty orders response
      mockGateIOClient.makeRequest.mockResolvedValue([]);

      const result = await orderManager.cancelAllOrders();

      expect(result).toBe(true);
    });

    it('should handle partial cancellation failures', async () => {
      const openOrders = [sampleOrderResponse, { ...sampleOrderResponse, id: 'order-456' }];
      
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce(openOrders) // BTC_USDT orders
        .mockResolvedValueOnce([]) // ETH_USDT orders
        .mockResolvedValueOnce(undefined) // First cancel succeeds
        .mockRejectedValueOnce(new Error('Cancel failed')); // Second cancel fails

      const result = await orderManager.cancelAllOrders();

      expect(result).toBe(false);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CANCEL_ALL_ORDERS',
          severity: 'WARNING',
        })
      );
    });
  });

  describe('refreshOpenOrders()', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should refresh open orders and update cache', async () => {
      const openOrders = [sampleOrderResponse];
      mockGateIOClient.makeRequest.mockResolvedValue(openOrders);

      await orderManager.refreshOpenOrders();

      // Verify the cache was updated
      const activeOrders = orderManager.getActiveOrders();
      expect(activeOrders).toHaveLength(2); // One for each symbol
    });

    it('should emit ordersRefreshed event', async () => {
      const openOrders = [sampleOrderResponse];
      mockGateIOClient.makeRequest.mockResolvedValue(openOrders);

      const eventSpy = jest.fn();
      orderManager.on('ordersRefreshed', eventSpy);

      await orderManager.refreshOpenOrders();

      expect(eventSpy).toHaveBeenCalledWith(2); // Total orders refreshed
    });

    it('should handle refresh errors gracefully', async () => {
      mockGateIOClient.makeRequest.mockRejectedValue(new Error('API error'));

      // Should not throw
      await expect(orderManager.refreshOpenOrders()).resolves.toBeUndefined();
    });
  });

  describe('isHealthy()', () => {
    it('should return false when not initialized', () => {
      const result = orderManager.isHealthy();
      expect(result).toBe(false);
    });

    it('should return true when properly initialized and healthy', async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();

      const result = orderManager.isHealthy();
      expect(result).toBe(true);
    });

    it('should return false when success rate is too low', async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();

      // Simulate low success rate by updating stats
      const stats = orderManager.getOrderStats();
      stats.totalOrders = 10;
      stats.successfulOrders = 3; // 30% success rate

      const result = orderManager.isHealthy();
      expect(result).toBe(false);
    });

    it('should return false when average execution time is too high', async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();

      // Simulate high execution time
      const stats = orderManager.getOrderStats();
      stats.averageExecutionTime = 35000; // 35 seconds

      const result = orderManager.isHealthy();
      expect(result).toBe(false);
    });

    it('should handle health check errors gracefully', async () => {
      // Create order manager with null client to trigger error
      const brokenOrderManager = new OrderManager(null as any);

      const result = brokenOrderManager.isHealthy();
      expect(result).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      mockGateIOClient.makeRequest.mockResolvedValue([]);
      await orderManager.initialize();
    });

    it('should handle complete order lifecycle', async () => {
      // 1. Create order
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([]) // Balance check
        .mockResolvedValueOnce(sampleOrderResponse); // Order creation

      const createdOrder = await orderManager.createOrder(sampleOrderRequest);
      expect(createdOrder).toBeTruthy();

      // 2. Get open orders
      mockGateIOClient.makeRequest.mockResolvedValue([sampleOrderResponse]);
      const openOrders = await orderManager.getOpenOrders();
      expect(openOrders.length).toBeGreaterThan(0);

      // 3. Refresh orders
      await orderManager.refreshOpenOrders();

      // 4. Check health
      const isHealthy = orderManager.isHealthy();
      expect(isHealthy).toBe(true);

      // 5. Cancel all orders
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce([sampleOrderResponse]) // Get orders
        .mockResolvedValueOnce([]) // Get orders for second symbol
        .mockResolvedValueOnce(undefined); // Cancel order

      const cancelResult = await orderManager.cancelAllOrders();
      expect(cancelResult).toBe(true);
    });

    it('should maintain consistency across operations', async () => {
      // Create multiple orders
      const orders = [
        { ...sampleOrderResponse, id: 'order-1' },
        { ...sampleOrderResponse, id: 'order-2' },
        { ...sampleOrderResponse, id: 'order-3' },
      ];

      mockGateIOClient.makeRequest.mockResolvedValue(orders);

      // Refresh orders
      await orderManager.refreshOpenOrders();

      // Verify all orders are tracked
      const activeOrders = orderManager.getActiveOrders();
      expect(activeOrders.length).toBeGreaterThanOrEqual(3);

      // Cancel all orders
      mockGateIOClient.makeRequest
        .mockResolvedValueOnce(orders) // Get orders
        .mockResolvedValueOnce([]) // Get orders for second symbol
        .mockResolvedValue(undefined); // Cancel calls

      const cancelResult = await orderManager.cancelAllOrders();
      expect(cancelResult).toBe(true);
    });
  });
});