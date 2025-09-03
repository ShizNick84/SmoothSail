/**
 * =============================================================================
 * ENHANCED ALERT SYSTEM - MAIN EXPORT
 * =============================================================================
 * 
 * Main export file for the enhanced alert system providing a unified interface
 * for all alert types, templates, and notification services with real-time data.
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Enhanced Alert System Implementation
 * =============================================================================
 */

// Core alert types and interfaces
export {
  EnhancedAlertType,
  AlertSeverity,
  EnhancedAlert,
  RealTimeMarketData,
  TradeOrderInfo,
  PositionInfo,
  ErrorContext,
  AlertTemplate,
  AlertStatistics,
  EnhancedAlertConfig,
  AlertTemplateRegistry,
  AlertDataValidator
} from './enhanced-alert-types';

// Enhanced alert service
export { EnhancedAlertService } from './enhanced-alert-service';

// Enhanced templates
export {
  EnhancedTelegramTemplates,
  EnhancedEmailTemplates,
  TemplateContextCalculator,
  TemplateContext
} from './enhanced-notification-templates';

// Integration service
export {
  EnhancedNotificationIntegration,
  MarketDataProvider,
  SystemMetricsProvider,
  NotificationDeliveryOptions
} from './enhanced-notification-integration';

/**
 * Enhanced Alert System Factory
 * Provides a simple way to create and configure the enhanced alert system
 */
export class EnhancedAlertSystemFactory {
  /**
   * Create a fully configured enhanced alert system
   */
  public static async createSystem(options: {
    marketDataProvider?: any;
    systemMetricsProvider?: any;
    config?: Partial<any>;
  } = {}): Promise<EnhancedNotificationIntegration> {
    const system = new EnhancedNotificationIntegration(
      options.marketDataProvider,
      options.systemMetricsProvider
    );

    await system.initialize();
    return system;
  }

  /**
   * Create a test system with mock providers
   */
  public static async createTestSystem(): Promise<EnhancedNotificationIntegration> {
    const mockMarketDataProvider = {
      getCurrentMarketData: async (symbol: string) => ({
        symbol,
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
          bollinger: { upper: 46500, middle: 45000, lower: 43500 },
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
      }),
      getMultipleMarketData: async (symbols: string[]) => new Map()
    };

    const mockSystemMetricsProvider = {
      getCurrentSystemMetrics: async () => ({
        timestamp: new Date(),
        systemLoad: 45.2,
        networkLatency: 23,
        tunnelStatus: 'Healthy',
        tradingStatus: 'Active',
        memoryUsage: 68.5,
        cpuUsage: 42.1
      })
    };

    return await this.createSystem({
      marketDataProvider: mockMarketDataProvider,
      systemMetricsProvider: mockSystemMetricsProvider
    });
  }
}

/**
 * Quick start helper functions
 */
export class EnhancedAlertHelpers {
  /**
   * Create a sample trade order for testing
   */
  public static createSampleTradeOrder(): TradeOrderInfo {
    return {
      orderId: `test_order_${Date.now()}`,
      symbol: 'BTC/USDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: 0.1,
      price: 45000,
      stopPrice: undefined,
      timeInForce: 'GTC',
      status: 'NEW',
      executedQuantity: 0,
      executedPrice: undefined,
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
  }

  /**
   * Create a sample position for testing
   */
  public static createSamplePosition(): PositionInfo {
    return {
      positionId: `pos_${Date.now()}`,
      symbol: 'BTC/USDT',
      side: 'LONG',
      size: 0.1,
      entryPrice: 44000,
      currentPrice: 45000,
      unrealizedPnL: 100,
      unrealizedPnLPercent: 2.27,
      realizedPnL: 0,
      totalPnL: 100,
      stopLoss: 43500,
      takeProfit: 46000,
      liquidationPrice: 42000,
      duration: 120,
      maxProfit: 150,
      maxLoss: -50,
      maxDrawdown: -30,
      marketData: this.createSampleMarketData(),
      openTime: new Date(Date.now() - 120 * 60 * 1000),
      lastUpdateTime: new Date()
    };
  }

  /**
   * Create sample market data for testing
   */
  public static createSampleMarketData(): RealTimeMarketData {
    return {
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
      marketCap: 850000000000,
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
  }

  /**
   * Create sample error context for testing
   */
  public static createSampleErrorContext(): ErrorContext {
    return {
      errorCode: 'API_001',
      errorMessage: 'Connection timeout to Gate.io API',
      errorType: 'API',
      severity: AlertSeverity.CRITICAL,
      component: 'Gate.io API',
      operation: 'getMarketData',
      requestId: `req_${Date.now()}`,
      retryAttempts: 2,
      maxRetries: 5,
      nextRetryTime: new Date(Date.now() + 30000),
      recoveryAction: 'Automatic retry with exponential backoff',
      firstOccurrence: new Date(Date.now() - 60000),
      lastOccurrence: new Date(),
      systemLoad: 75.5,
      memoryUsage: 82.3,
      networkLatency: 150
    };
  }
}

// Default export
export default {
  EnhancedAlertSystemFactory,
  EnhancedAlertHelpers,
  EnhancedNotificationIntegration,
  EnhancedAlertService,
  EnhancedTelegramTemplates,
  EnhancedEmailTemplates,
  TemplateContextCalculator,
  AlertTemplateRegistry,
  AlertDataValidator
};