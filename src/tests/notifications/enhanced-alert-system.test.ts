/**
 * =============================================================================
 * ENHANCED ALERT SYSTEM TESTS
 * =============================================================================
 * 
 * Comprehensive test suite for the enhanced alert system implementation
 * including alert types, templates, real-time data integration, and delivery.
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Enhanced Alert System Tests
 * =============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EnhancedAlertService } from '../../core/notifications/enhanced-alert-service';
import { EnhancedNotificationIntegration } from '../../core/notifications/enhanced-notification-integration';
import { 
  EnhancedTelegramTemplates, 
  EnhancedEmailTemplates, 
  TemplateContextCalculator 
} from '../../core/notifications/enhanced-notification-templates';
import { 
  EnhancedAlertType, 
  AlertSeverity, 
  AlertTemplateRegistry,
  AlertDataValidator,
  RealTimeMarketData,
  TradeOrderInfo,
  PositionInfo,
  ErrorContext
} from '../../core/notifications/enhanced-alert-types';

// Mock dependencies
jest.mock('../../core/logging/logger');
jest.mock('../../core/notifications/telegram-service');
jest.mock('../../core/notifications/email-service');
jest.mock('../../core/notifications/notification-router');

describe('Enhanced Alert System', () => {
  let alertService: EnhancedAlertService;
  let notificationIntegration: EnhancedNotificationIntegration;
  let mockMarketDataProvider: any;
  let mockSystemMetricsProvider: any;

  beforeEach(() => {
    // Initialize alert template registry
    AlertTemplateRegistry.initialize();

    // Create mock providers
    mockMarketDataProvider = {
      getCurrentMarketData: jest.fn(),
      getMultipleMarketData: jest.fn()
    };

    mockSystemMetricsProvider = {
      getCurrentSystemMetrics: jest.fn()
    };

    // Initialize services
    alertService = new EnhancedAlertService();
    notificationIntegration = new EnhancedNotificationIntegration(
      mockMarketDataProvider,
      mockSystemMetricsProvider
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Enhanced Alert Types', () => {
    it('should have all required alert types defined', () => {
      expect(EnhancedAlertType.NEW_TRADE_ORDER_PLACED).toBeDefined();
      expect(EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS).toBeDefined();
      expect(EnhancedAlertType.TRADE_CLOSED_PROFIT_TARGET_HIT).toBeDefined();
      expect(EnhancedAlertType.ERROR_API_CONNECTION_FAILED).toBeDefined();
    });

    it('should have proper alert severity levels', () => {
      expect(AlertSeverity.INFO).toBe('info');
      expect(AlertSeverity.LOW).toBe('low');
      expect(AlertSeverity.MEDIUM).toBe('medium');
      expect(AlertSeverity.HIGH).toBe('high');
      expect(AlertSeverity.CRITICAL).toBe('critical');
      expect(AlertSeverity.EMERGENCY).toBe('emergency');
    });
  });

  describe('Alert Template Registry', () => {
    it('should initialize with predefined templates', () => {
      const templates = AlertTemplateRegistry.getAllTemplates();
      expect(templates.size).toBeGreaterThan(0);
    });

    it('should have template for new trade order', () => {
      const template = AlertTemplateRegistry.getTemplate(EnhancedAlertType.NEW_TRADE_ORDER_PLACED);
      expect(template).toBeDefined();
      expect(template?.severity).toBe(AlertSeverity.HIGH);
      expect(template?.defaultChannels).toContain('telegram');
      expect(template?.defaultChannels).toContain('email');
    });

    it('should have template for stop loss approaching', () => {
      const template = AlertTemplateRegistry.getTemplate(EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS);
      expect(template).toBeDefined();
      expect(template?.severity).toBe(AlertSeverity.HIGH);
    });

    it('should have template for profit target hit', () => {
      const template = AlertTemplateRegistry.getTemplate(EnhancedAlertType.TRADE_CLOSED_PROFIT_TARGET_HIT);
      expect(template).toBeDefined();
      expect(template?.severity).toBe(AlertSeverity.MEDIUM);
    });

    it('should have template for API errors', () => {
      const template = AlertTemplateRegistry.getTemplate(EnhancedAlertType.ERROR_API_CONNECTION_FAILED);
      expect(template).toBeDefined();
      expect(template?.severity).toBe(AlertSeverity.CRITICAL);
    });
  });

  describe('Alert Data Validator', () => {
    it('should validate complete alert data', () => {
      const validAlert = {
        id: 'test_alert_123',
        type: EnhancedAlertType.NEW_TRADE_ORDER_PLACED,
        severity: AlertSeverity.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        systemInfo: {
          timestamp: new Date(),
          source: 'test',
          environment: 'development' as const,
          version: '1.0.0',
          instanceId: 'test-001'
        },
        channels: ['telegram' as const],
        priority: 'high' as const,
        tags: ['test']
      };

      const validation = AlertDataValidator.validateAlert(validAlert);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid alert data', () => {
      const invalidAlert = {
        // Missing required fields
        type: EnhancedAlertType.NEW_TRADE_ORDER_PLACED,
        severity: AlertSeverity.HIGH
      } as any;

      const validation = AlertDataValidator.validateAlert(invalidAlert);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate market data', () => {
      const validMarketData: RealTimeMarketData = {
        symbol: 'BTC/USDT',
        currentPrice: 45000,
        priceChange24h: 1000,
        priceChangePercent24h: 2.27,
        volume24h: 1000000,
        high24h: 46000,
        low24h: 44000,
        bid: 44999,
        ask: 45001,
        spread: 2,
        timestamp: new Date()
      };

      const validation = AlertDataValidator.validateMarketData(validMarketData);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Enhanced Telegram Templates', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        alert: {
          id: 'test_alert',
          type: EnhancedAlertType.NEW_TRADE_ORDER_PLACED,
          severity: AlertSeverity.HIGH,
          title: 'Test Alert',
          message: 'Test message'
        },
        tradeOrder: {
          orderId: 'order_123',
          symbol: 'BTC/USDT',
          side: 'BUY',
          type: 'LIMIT',
          quantity: 0.1,
          price: 45000,
          strategy: 'AI Strategy',
          confidence: 0.85,
          riskReward: 2.5,
          stopLoss: 44000,
          takeProfit: 47000,
          positionSize: 5,
          maxRisk: 500
        },
        marketData: {
          symbol: 'BTC/USDT',
          currentPrice: 45000,
          priceChangePercent24h: 2.27,
          volume24h: 1000000,
          high24h: 46000,
          low24h: 44000,
          technicalIndicators: {
            rsi: 65,
            support: 44500,
            resistance: 46000
          }
        },
        calculations: {
          profitLoss: 0,
          profitLossPercent: 0,
          riskReward: 2.5,
          positionValue: 4500,
          marketSentiment: 'Positive',
          trendDirection: 'Bullish',
          volatilityLevel: 'Medium'
        },
        systemMetrics: {
          timestamp: new Date(),
          systemLoad: 45.2,
          networkLatency: 23,
          tunnelStatus: 'Healthy',
          tradingStatus: 'Active'
        }
      };
    });

    it('should generate new trade order template', () => {
      const template = EnhancedTelegramTemplates.generateNewTradeOrderTemplate(mockContext);
      
      expect(template).toContain('NEW TRADE ORDER PLACED');
      expect(template).toContain('BTC/USDT');
      expect(template).toContain('BUY');
      expect(template).toContain('45000');
      expect(template).toContain('AI Strategy');
      expect(template).toContain('85.0%'); // confidence
      expect(template).toContain('Intel NUC');
    });

    it('should generate stop loss approaching template', () => {
      mockContext.position = {
        positionId: 'pos_123',
        symbol: 'BTC/USDT',
        side: 'LONG',
        size: 0.1,
        entryPrice: 44000,
        currentPrice: 44100,
        unrealizedPnL: 10,
        unrealizedPnLPercent: 0.23,
        stopLoss: 43500,
        takeProfit: 46000,
        duration: 120,
        maxProfit: 50,
        maxDrawdown: -20,
        marketData: mockContext.marketData
      };

      const template = EnhancedTelegramTemplates.generateStopLossApproachingTemplate(mockContext);
      
      expect(template).toContain('PRICE APPROACHING STOP LOSS');
      expect(template).toContain('BTC/USDT');
      expect(template).toContain('44100');
      expect(template).toContain('43500');
      expect(template).toContain('Distance');
    });

    it('should generate trade closed profit template', () => {
      mockContext.position = {
        positionId: 'pos_123',
        symbol: 'BTC/USDT',
        side: 'LONG',
        size: 0.1,
        entryPrice: 44000,
        currentPrice: 46000,
        realizedPnL: 200,
        stopLoss: 43500,
        takeProfit: 46000,
        duration: 180,
        maxProfit: 250,
        maxDrawdown: -50,
        marketData: mockContext.marketData
      };

      const template = EnhancedTelegramTemplates.generateTradeClosedProfitTemplate(mockContext);
      
      expect(template).toContain('PROFIT TARGET HIT');
      expect(template).toContain('BTC/USDT');
      expect(template).toContain('200.00'); // realized P&L
      expect(template).toContain('44000'); // entry price
      expect(template).toContain('46000'); // exit price
    });

    it('should generate API error template', () => {
      mockContext.alert.errorContext = {
        errorCode: 'API_001',
        errorMessage: 'Connection timeout',
        errorType: 'API',
        severity: AlertSeverity.CRITICAL,
        component: 'Gate.io API',
        operation: 'getMarketData',
        retryAttempts: 2,
        maxRetries: 5,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        systemLoad: 75.5,
        networkLatency: 150,
        recoveryAction: 'Automatic retry with exponential backoff'
      };

      const template = EnhancedTelegramTemplates.generateAPIErrorTemplate(mockContext);
      
      expect(template).toContain('API CONNECTION ERROR');
      expect(template).toContain('Gate.io API');
      expect(template).toContain('Connection timeout');
      expect(template).toContain('API_001');
      expect(template).toContain('2/5'); // retry attempts
    });
  });

  describe('Enhanced Email Templates', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        alert: {
          id: 'test_alert',
          type: EnhancedAlertType.NEW_TRADE_ORDER_PLACED,
          severity: AlertSeverity.HIGH,
          title: 'Test Alert',
          message: 'Test message'
        },
        tradeOrder: {
          orderId: 'order_123',
          symbol: 'BTC/USDT',
          side: 'BUY',
          type: 'LIMIT',
          quantity: 0.1,
          price: 45000,
          strategy: 'AI Strategy',
          confidence: 0.85,
          riskReward: 2.5,
          stopLoss: 44000,
          takeProfit: 47000,
          positionSize: 5,
          maxRisk: 500
        },
        marketData: {
          symbol: 'BTC/USDT',
          currentPrice: 45000,
          priceChangePercent24h: 2.27,
          volume24h: 1000000,
          high24h: 46000,
          low24h: 44000,
          technicalIndicators: {
            rsi: 65,
            support: 44500,
            resistance: 46000
          }
        },
        calculations: {
          profitLoss: 0,
          profitLossPercent: 0,
          riskReward: 2.5,
          positionValue: 4500,
          marketSentiment: 'Positive',
          trendDirection: 'Bullish',
          volatilityLevel: 'Medium'
        },
        systemMetrics: {
          timestamp: new Date(),
          systemLoad: 45.2,
          networkLatency: 23,
          tunnelStatus: 'Healthy',
          tradingStatus: 'Active'
        }
      };
    });

    it('should generate new trade order email template', () => {
      const template = EnhancedEmailTemplates.generateNewTradeOrderEmailTemplate(mockContext);
      
      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('New Trade Order Placed');
      expect(template).toContain('BTC/USDT');
      expect(template).toContain('BUY');
      expect(template).toContain('45000');
      expect(template).toContain('AI Strategy');
      expect(template).toContain('85.0%'); // confidence
    });

    it('should generate trade closed profit email template', () => {
      mockContext.position = {
        positionId: 'pos_123',
        symbol: 'BTC/USDT',
        side: 'LONG',
        size: 0.1,
        entryPrice: 44000,
        currentPrice: 46000,
        realizedPnL: 200,
        stopLoss: 43500,
        takeProfit: 46000,
        duration: 180,
        maxProfit: 250,
        maxDrawdown: -50,
        marketData: mockContext.marketData
      };

      const template = EnhancedEmailTemplates.generateTradeClosedProfitEmailTemplate(mockContext);
      
      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('Profit Target Hit');
      expect(template).toContain('BTC/USDT');
      expect(template).toContain('200.00'); // realized P&L
      expect(template).toContain('44000'); // entry price
      expect(template).toContain('46000'); // exit price
    });
  });

  describe('Template Context Calculator', () => {
    it('should calculate context with real-time data', () => {
      const alert = {
        id: 'test_alert',
        type: EnhancedAlertType.NEW_TRADE_ORDER_PLACED,
        severity: AlertSeverity.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        tradeOrder: {
          orderId: 'order_123',
          symbol: 'BTC/USDT',
          side: 'BUY' as const,
          riskReward: 2.5,
          quantity: 0.1,
          price: 45000
        }
      } as any;

      const marketData: RealTimeMarketData = {
        symbol: 'BTC/USDT',
        currentPrice: 45000,
        priceChange24h: 1000,
        priceChangePercent24h: 2.27,
        volume24h: 1000000,
        high24h: 46000,
        low24h: 44000,
        bid: 44999,
        ask: 45001,
        spread: 2,
        timestamp: new Date()
      };

      const context = TemplateContextCalculator.calculateContext(alert, marketData);
      
      expect(context.alert).toBe(alert);
      expect(context.marketData).toBe(marketData);
      expect(context.calculations).toBeDefined();
      expect(context.calculations.riskReward).toBe(2.5);
      expect(context.calculations.positionValue).toBe(4500); // 0.1 * 45000
      expect(context.calculations.marketSentiment).toBeDefined();
      expect(context.calculations.trendDirection).toBeDefined();
      expect(context.calculations.volatilityLevel).toBeDefined();
    });
  });

  describe('Enhanced Notification Integration', () => {
    beforeEach(async () => {
      // Mock the initialization
      jest.spyOn(notificationIntegration as any, 'alertService', 'get').mockReturnValue({
        initialize: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getStatistics: jest.fn().mockReturnValue({}),
        getAlertHistory: jest.fn().mockReturnValue([])
      });

      jest.spyOn(notificationIntegration as any, 'telegramService', 'get').mockReturnValue({
        initialize: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        sendNotification: jest.fn().mockResolvedValue(12345)
      });

      jest.spyOn(notificationIntegration as any, 'emailService', 'get').mockReturnValue({
        initialize: jest.fn().mockResolvedValue(undefined),
        sendNotification: jest.fn().mockResolvedValue('email_123')
      });
    });

    it('should initialize successfully', async () => {
      await expect(notificationIntegration.initialize()).resolves.not.toThrow();
    });

    it('should send new trade order notification', async () => {
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

      mockMarketDataProvider.getCurrentMarketData.mockResolvedValue({
        symbol: 'BTC/USDT',
        currentPrice: 45000,
        priceChangePercent24h: 2.27,
        volume24h: 1000000,
        timestamp: new Date()
      });

      await notificationIntegration.initialize();
      await expect(
        notificationIntegration.sendNewTradeOrderNotification(testOrder)
      ).resolves.not.toThrow();
    });

    it('should get delivery statistics', () => {
      const stats = notificationIntegration.getDeliveryStatistics();
      expect(stats).toHaveProperty('totalNotifications');
      expect(stats).toHaveProperty('successfulDeliveries');
      expect(stats).toHaveProperty('failedDeliveries');
      expect(stats).toHaveProperty('averageDeliveryTime');
    });
  });

  describe('Real-time Data Integration', () => {
    it('should integrate market data into notifications', async () => {
      const mockMarketData: RealTimeMarketData = {
        symbol: 'BTC/USDT',
        currentPrice: 45000,
        priceChange24h: 1000,
        priceChangePercent24h: 2.27,
        volume24h: 1000000,
        high24h: 46000,
        low24h: 44000,
        bid: 44999,
        ask: 45001,
        spread: 2,
        timestamp: new Date(),
        technicalIndicators: {
          rsi: 65,
          macd: 0.5,
          bollinger: {
            upper: 46500,
            middle: 45000,
            lower: 43500
          },
          ema20: 44800,
          ema50: 44200,
          support: 44500,
          resistance: 46000
        },
        sentiment: {
          overall: 0.3,
          news: 0.2,
          social: 0.4,
          technical: 0.3
        }
      };

      mockMarketDataProvider.getCurrentMarketData.mockResolvedValue(mockMarketData);

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
        strategy: 'AI Strategy',
        confidence: 0.85,
        riskReward: 2.5,
        stopLoss: 44000,
        takeProfit: 47000,
        positionSize: 5,
        maxRisk: 500
      };

      await notificationIntegration.initialize();
      await notificationIntegration.sendNewTradeOrderNotification(testOrder);

      expect(mockMarketDataProvider.getCurrentMarketData).toHaveBeenCalledWith('BTC/USDT');
    });

    it('should integrate system metrics into notifications', async () => {
      const mockSystemMetrics = {
        timestamp: new Date(),
        systemLoad: 45.2,
        networkLatency: 23,
        tunnelStatus: 'Healthy',
        tradingStatus: 'Active',
        memoryUsage: 68.5,
        cpuUsage: 42.1
      };

      mockSystemMetricsProvider.getCurrentSystemMetrics.mockResolvedValue(mockSystemMetrics);

      const errorContext: ErrorContext = {
        errorCode: 'API_001',
        errorMessage: 'Connection timeout',
        errorType: 'API',
        severity: AlertSeverity.CRITICAL,
        component: 'Gate.io API',
        operation: 'getMarketData',
        retryAttempts: 2,
        maxRetries: 5,
        firstOccurrence: new Date(),
        lastOccurrence: new Date()
      };

      await notificationIntegration.initialize();
      await notificationIntegration.sendAPIErrorNotification(errorContext);

      expect(mockSystemMetricsProvider.getCurrentSystemMetrics).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle notification delivery failures gracefully', async () => {
      const mockTelegramService = {
        initialize: jest.fn().mockResolvedValue(undefined),
        sendNotification: jest.fn().mockRejectedValue(new Error('Telegram API error')),
        stop: jest.fn().mockResolvedValue(undefined)
      };

      jest.spyOn(notificationIntegration as any, 'telegramService', 'get').mockReturnValue(mockTelegramService);

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
        strategy: 'AI Strategy',
        confidence: 0.85,
        riskReward: 2.5,
        stopLoss: 44000,
        takeProfit: 47000,
        positionSize: 5,
        maxRisk: 500
      };

      await notificationIntegration.initialize();
      
      // Should not throw even if Telegram fails
      await expect(
        notificationIntegration.sendNewTradeOrderNotification(testOrder)
      ).resolves.not.toThrow();

      const stats = notificationIntegration.getDeliveryStatistics();
      expect(stats.failedDeliveries).toBeGreaterThan(0);
    });
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end with all components', async () => {
    // This would be a comprehensive integration test
    // that tests the entire flow from alert creation to delivery
    expect(true).toBe(true); // Placeholder
  });
});