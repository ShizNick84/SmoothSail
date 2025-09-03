/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - TRADING ENGINE
 * =============================================================================
 * 
 * Core trading engine that manages all trading operations, order execution,
 * position management, and integration with Gate.io through SSH tunnel.
 * 
 * This is the heart of the trading system that coordinates:
 * - Market data processing
 * - Strategy execution
 * - Order management
 * - Risk management
 * - Portfolio tracking
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { GateIOClient } from './api/gate-io-client';
import { OrderManager } from './orders/order-manager';
import { BalanceManager } from './account/balance-manager';
import { PortfolioRiskManager } from './risk/portfolio-risk-manager';
import { MovingAverageStrategy } from './strategies/moving-average';
import { MACDStrategy } from './strategies/macd';
import { RSIStrategy } from './strategies/rsi';
import { TradingErrorHandler, TradingErrorType, ErrorSeverity } from '../core/error-handling/trading-error-handler';
import { SystemErrorManager, SystemComponent } from '../core/error-handling/system-error-manager';

/**
 * Trading engine configuration interface
 */
export interface TradingEngineConfig {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  testnet: boolean;
  baseUrl?: string;
  defaultStrategy: string;
  riskSettings: {
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossPercent: number;
    takeProfitPercent: number;
  };
}

/**
 * Trading engine system health interface
 */
export interface TradingSystemHealth {
  isHealthy: boolean;
  components: {
    apiConnection: boolean;
    orderManager: boolean;
    balanceManager: boolean;
    riskManager: boolean;
    strategies: boolean;
  };
  lastUpdate: Date;
  errors: string[];
  warnings: string[];
}

/**
 * Trading statistics interface
 */
export interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  dailyPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  lastTradeTime: Date | null;
}

/**
 * Main trading engine class
 * Orchestrates all trading operations and system components
 */
export class TradingEngine extends EventEmitter {
  private logger: Logger;
  private config: TradingEngineConfig;
  private gateIOClient: GateIOClient;
  private orderManager: OrderManager;
  private balanceManager: BalanceManager;
  private riskManager: PortfolioRiskManager;
  private strategies: Map<string, any>;
  private isRunning: boolean = false;
  private isInitialized: boolean = false;
  private marketDataInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private tradingErrorHandler: TradingErrorHandler;
  private systemErrorManager: SystemErrorManager;

  constructor(config: TradingEngineConfig) {
    super();
    this.logger = new Logger('TradingEngine');
    this.config = config;
    this.strategies = new Map();
    
    // Initialize error handling
    this.tradingErrorHandler = new TradingErrorHandler();
    this.systemErrorManager = new SystemErrorManager();
    
    // Initialize components
    this.gateIOClient = new GateIOClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      passphrase: config.passphrase,
      testnet: config.testnet,
      baseUrl: config.baseUrl || 'http://localhost:8443' // SSH tunnel endpoint
    });

    this.orderManager = new OrderManager(this.gateIOClient);
    this.balanceManager = new BalanceManager(this.gateIOClient);
    this.riskManager = new PortfolioRiskManager({
      maxPositionSize: config.riskSettings.maxPositionSize,
      maxDailyLoss: config.riskSettings.maxDailyLoss,
      stopLossPercent: config.riskSettings.stopLossPercent,
      takeProfitPercent: config.riskSettings.takeProfitPercent
    });

    // Setup error handling listeners
    this.setupErrorHandling();

    this.logger.info('Trading Engine created with comprehensive error handling', {
      exchange: config.exchange,
      testnet: config.testnet,
      defaultStrategy: config.defaultStrategy
    });
  }

  /**
   * Initialize the trading engine
   * Sets up all components and validates connections
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('🔧 Initializing Trading Engine...');

      // Initialize Gate.io API client
      await this.gateIOClient.initialize();
      this.logger.info('✅ Gate.io API client initialized');

      // Initialize order manager
      await this.orderManager.initialize();
      this.logger.info('✅ Order manager initialized');

      // Initialize balance manager
      await this.balanceManager.initialize();
      this.logger.info('✅ Balance manager initialized');

      // Initialize risk manager
      await this.riskManager.initialize();
      this.logger.info('✅ Risk manager initialized');

      // Initialize trading strategies
      await this.initializeStrategies();
      this.logger.info('✅ Trading strategies initialized');

      // Test API connectivity
      await this.testAPIConnectivity();
      this.logger.info('✅ API connectivity verified');

      // Load initial account data
      await this.loadAccountData();
      this.logger.info('✅ Account data loaded');

      this.isInitialized = true;
      this.logger.info('✅ Trading Engine initialization complete');

      this.emit('initialized');

    } catch (error) {
      this.logger.error('❌ Trading Engine initialization failed:', error);
      throw new Error(`Trading Engine initialization failed: ${error}`);
    }
  }

  /**
   * Start trading operations
   * Begins market data processing and strategy execution
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Trading Engine must be initialized before starting');
    }

    if (this.isRunning) {
      this.logger.warn('Trading Engine is already running');
      return;
    }

    try {
      this.logger.info('🚀 Starting Trading Engine...');

      // Start market data processing
      this.startMarketDataProcessing();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start strategy execution
      this.startStrategyExecution();

      this.isRunning = true;
      this.logger.info('✅ Trading Engine started successfully');

      this.emit('started');

    } catch (error) {
      this.logger.error('❌ Failed to start Trading Engine:', error);
      throw error;
    }
  }

  /**
   * Stop trading operations
   * Gracefully shuts down all trading activities
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Trading Engine is not running');
      return;
    }

    try {
      this.logger.info('🛑 Shutting down Trading Engine...');

      // Stop market data processing
      if (this.marketDataInterval) {
        clearInterval(this.marketDataInterval);
        this.marketDataInterval = null;
      }

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Cancel all open orders
      await this.orderManager.cancelAllOrders();

      // Close all positions (if configured)
      // await this.closeAllPositions();

      // Shutdown error handling systems
      this.systemErrorManager.shutdown();

      this.isRunning = false;
      this.logger.info('✅ Trading Engine shutdown complete');

      this.emit('shutdown');

    } catch (error) {
      this.logger.error('❌ Error during Trading Engine shutdown:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<TradingSystemHealth> {
    const health: TradingSystemHealth = {
      isHealthy: true,
      components: {
        apiConnection: false,
        orderManager: false,
        balanceManager: false,
        riskManager: false,
        strategies: false
      },
      lastUpdate: new Date(),
      errors: [],
      warnings: []
    };

    try {
      // Check API connection
      health.components.apiConnection = await this.gateIOClient.isConnected();
      
      // Check order manager
      health.components.orderManager = this.orderManager.isHealthy();
      
      // Check balance manager
      health.components.balanceManager = this.balanceManager.isHealthy();
      
      // Check risk manager
      health.components.riskManager = this.riskManager.isHealthy();
      
      // Check strategies
      health.components.strategies = this.strategies.size > 0;

      // Overall health
      health.isHealthy = Object.values(health.components).every(status => status);

      if (!health.isHealthy) {
        health.errors.push('One or more components are unhealthy');
      }

    } catch (error) {
      health.isHealthy = false;
      health.errors.push(`Health check failed: ${error}`);
    }

    return health;
  }

  /**
   * Get trading statistics
   */
  async getTradingStats(): Promise<TradingStats> {
    try {
      const orderHistory = await this.orderManager.getOrderHistory();
      const balance = await this.balanceManager.getTotalBalance();

      // Calculate statistics from order history
      const completedTrades = orderHistory.filter(order => order.status === 'filled');
      const winningTrades = completedTrades.filter(order => {
        // This would need proper P&L calculation
        return true; // Placeholder
      });

      const stats: TradingStats = {
        totalTrades: completedTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: completedTrades.length - winningTrades.length,
        winRate: completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0,
        totalPnL: 0, // Would calculate from trade history
        dailyPnL: 0, // Would calculate from today's trades
        maxDrawdown: 0, // Would calculate from balance history
        sharpeRatio: 0, // Would calculate from returns
        lastTradeTime: completedTrades.length > 0 ? completedTrades[completedTrades.length - 1].timestamp : null
      };

      return stats;

    } catch (error) {
      this.logger.error('Error getting trading stats:', error);
      throw error;
    }
  }

  /**
   * Execute a manual trade with comprehensive error handling
   */
  async executeTrade(symbol: string, side: 'buy' | 'sell', amount: number, price?: number): Promise<any> {
    return this.tradingErrorHandler.handleError({
      type: TradingErrorType.ORDER_EXECUTION_FAILED,
      severity: ErrorSeverity.HIGH,
      message: 'Manual trade execution',
      component: 'TradingEngine',
      context: { symbol, side, amount, price }
    }, async () => {
      this.logger.info('Executing manual trade', { symbol, side, amount, price });

      // Position safety check
      await this.tradingErrorHandler.validatePositionSafety({
        type: 'order',
        side,
        symbol,
        amount,
        maxPositionSize: this.config.riskSettings.maxPositionSize
      });

      // Risk check
      const riskCheck = await this.riskManager.validateTrade({
        symbol,
        side,
        amount,
        price: price || 0
      });

      if (!riskCheck.approved) {
        throw this.tradingErrorHandler.createError(TradingErrorType.RISK_LIMIT_EXCEEDED, {
          message: `Trade rejected by risk manager: ${riskCheck.reason}`,
          details: { riskCheck, symbol, side, amount }
        });
      }

      // Execute order
      const order = await this.orderManager.createOrder({
        symbol,
        side,
        amount,
        price,
        type: price ? 'limit' : 'market'
      });

      this.logger.info('Manual trade executed', { orderId: order.id });
      this.emit('tradeExecuted', order);

      return order;
    });
  }

  /**
   * Get current portfolio status
   */
  async getPortfolioStatus(): Promise<any> {
    try {
      const balance = await this.balanceManager.getBalance();
      const positions = await this.balanceManager.getPositions();
      const openOrders = await this.orderManager.getOpenOrders();

      return {
        balance,
        positions,
        openOrders,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error getting portfolio status:', error);
      throw error;
    }
  }

  /**
   * Initialize trading strategies
   */
  private async initializeStrategies(): Promise<void> {
    try {
      // Initialize Moving Average strategy
      const maStrategy = new MovingAverageStrategy({
        fastPeriod: 20,
        slowPeriod: 50,
        symbol: 'BTC_USDT'
      });
      this.strategies.set('moving-average', maStrategy);

      // Initialize MACD strategy
      const macdStrategy = new MACDStrategy({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        symbol: 'BTC_USDT'
      });
      this.strategies.set('macd', macdStrategy);

      // Initialize RSI strategy
      const rsiStrategy = new RSIStrategy({
        period: 14,
        overbought: 70,
        oversold: 30,
        symbol: 'BTC_USDT'
      });
      this.strategies.set('rsi', rsiStrategy);

      this.logger.info(`Initialized ${this.strategies.size} trading strategies`);

    } catch (error) {
      this.logger.error('Strategy initialization failed:', error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  private async testAPIConnectivity(): Promise<void> {
    try {
      // Test basic API connectivity
      const serverTime = await this.gateIOClient.getServerTime();
      this.logger.info('API connectivity test passed', { serverTime });

      // Test account access
      const accountInfo = await this.gateIOClient.getAccountInfo();
      this.logger.info('Account access verified', { 
        userId: accountInfo.user_id || 'N/A' 
      });

    } catch (error) {
      this.logger.error('API connectivity test failed:', error);
      throw new Error(`API connectivity test failed: ${error}`);
    }
  }

  /**
   * Load initial account data
   */
  private async loadAccountData(): Promise<void> {
    try {
      // Load account balance
      await this.balanceManager.refreshBalance();
      
      // Load open orders
      await this.orderManager.refreshOpenOrders();

      this.logger.info('Account data loaded successfully');

    } catch (error) {
      this.logger.error('Failed to load account data:', error);
      throw error;
    }
  }

  /**
   * Start market data processing
   */
  private startMarketDataProcessing(): void {
    this.marketDataInterval = setInterval(async () => {
      try {
        // Process market data for each strategy
        for (const [name, strategy] of this.strategies) {
          if (strategy.isActive) {
            await this.processStrategySignals(name, strategy);
          }
        }
      } catch (error) {
        this.logger.error('Market data processing error:', error);
      }
    }, 30000); // Process every 30 seconds

    this.logger.info('Market data processing started');
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        if (!health.isHealthy) {
          this.logger.warn('System health check failed', health.errors);
          this.emit('healthWarning', health);
        }
      } catch (error) {
        this.logger.error('Health monitoring error:', error);
      }
    }, 60000); // Check every minute

    this.logger.info('Health monitoring started');
  }

  /**
   * Start strategy execution
   */
  private startStrategyExecution(): void {
    // Enable the default strategy
    const defaultStrategy = this.strategies.get(this.config.defaultStrategy);
    if (defaultStrategy) {
      defaultStrategy.isActive = true;
      this.logger.info(`Activated default strategy: ${this.config.defaultStrategy}`);
    }
  }

  /**
   * Process signals from a trading strategy
   */
  private async processStrategySignals(strategyName: string, strategy: any): Promise<void> {
    try {
      // Get market data
      const marketData = await this.gateIOClient.getMarketData(strategy.symbol);
      
      // Generate trading signal
      const signal = await strategy.generateSignal(marketData);
      
      if (signal && signal.action !== 'hold') {
        this.logger.info(`Strategy signal generated`, {
          strategy: strategyName,
          signal: signal.action,
          symbol: signal.symbol,
          confidence: signal.confidence
        });

        // Execute trade if confidence is high enough
        if (signal.confidence > 0.7) {
          await this.executeStrategyTrade(signal);
        }
      }

    } catch (error) {
      this.logger.error(`Strategy processing error for ${strategyName}:`, error);
    }
  }

  /**
   * Execute a trade based on strategy signal
   */
  private async executeStrategyTrade(signal: any): Promise<void> {
    try {
      const amount = await this.riskManager.calculatePositionSize(signal);
      
      await this.executeTrade(
        signal.symbol,
        signal.action,
        amount,
        signal.price
      );

    } catch (error) {
      this.logger.error('Strategy trade execution failed:', error);
    }
  }

  /**
   * Setup error handling listeners and recovery mechanisms
   */
  private setupErrorHandling(): void {
    // Listen for system error manager events
    this.systemErrorManager.on('restartComponent', async (component: SystemComponent) => {
      if (component === SystemComponent.TRADING_ENGINE) {
        await this.handleComponentRestart();
      }
    });

    // Listen for trading error escalations
    this.tradingErrorHandler.on('errorEscalated', (error) => {
      this.systemErrorManager.handleComponentError(SystemComponent.TRADING_ENGINE, error);
    });

    // Handle emergency stops
    this.tradingErrorHandler.on('emergencyStop', async (reason, cancelledOrders, totalOrders) => {
      this.logger.warn(`Emergency stop triggered: ${reason}`, {
        cancelledOrders,
        totalOrders
      });
      
      await this.systemErrorManager.handleComponentError(SystemComponent.TRADING_ENGINE, {
        type: 'EMERGENCY_STOP',
        severity: 'CRITICAL',
        message: `Emergency stop: ${reason}`,
        details: { cancelledOrders, totalOrders }
      });
    });
  }

  /**
   * Handle component restart request
   */
  private async handleComponentRestart(): Promise<void> {
    try {
      this.logger.info('Handling trading engine component restart...');
      
      // Stop current operations
      if (this.isRunning) {
        await this.shutdown();
      }
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reinitialize and restart
      await this.initialize();
      await this.start();
      
      this.logger.info('Trading engine component restart completed');
      
    } catch (error) {
      this.logger.error('Component restart failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive trading engine status including error metrics
   */
  getStatus(): {
    isRunning: boolean;
    isInitialized: boolean;
    strategiesCount: number;
    timestamp: number;
    errorStats: any;
    systemHealth: any;
  } {
    return {
      isRunning: this.isRunning,
      isInitialized: this.isInitialized,
      strategiesCount: this.strategies.size,
      timestamp: Date.now(),
      errorStats: this.tradingErrorHandler.getErrorStats(),
      systemHealth: this.systemErrorManager.getErrorDashboard().healthMetrics
    };
  }
}

export default TradingEngine;
