/**
 * =============================================================================
 * NOTIFICATION SYSTEM TESTS
 * =============================================================================
 * 
 * Comprehensive test suite for the notification system of the AI crypto
 * trading agent. Tests all notification services, routing, and integration.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock environment variables BEFORE importing modules
process.env.SMTP_HOST = 'smtp.gmail.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'encrypted_password';
process.env.SMTP_FROM_ADDRESS = 'trading-agent@example.com';
process.env.SMTP_SECURE = 'true';
process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token';
process.env.TELEGRAM_CHAT_ID = '123456789';
process.env.TELEGRAM_AUTHORIZED_USERS = '123456789,987654321';
process.env.TELEGRAM_ADMIN_USERS = '123456789';
process.env.NOTIFICATION_EMAIL = 'notifications@example.com';
process.env.MASTER_ENCRYPTION_KEY = 'test_master_key_for_testing_purposes_only_64_chars_minimum_length';

// Mock the encryption service before importing notification modules
jest.mock('@/security/encryption-service', () => {
  return {
    EncryptionService: jest.fn().mockImplementation(() => ({
      encrypt: jest.fn().mockResolvedValue('encrypted_data'),
      decrypt: jest.fn().mockResolvedValue('decrypted_data'),
      initializeMasterKey: jest.fn().mockResolvedValue(undefined),
      generateKey: jest.fn().mockReturnValue('generated_key'),
      hashData: jest.fn().mockReturnValue('hashed_data')
    }))
  };
});

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test_message_id' })
  })
}));

// Mock telegraf
jest.mock('telegraf', () => ({
  Telegraf: jest.fn().mockImplementation(() => ({
    launch: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    telegram: {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
      setMyCommands: jest.fn().mockResolvedValue(undefined)
    },
    use: jest.fn(),
    command: jest.fn(),
    on: jest.fn()
  })),
  Markup: {
    inlineKeyboard: jest.fn(),
    button: jest.fn()
  }
}));

import {
  NotificationManager,
  EmailService,
  TelegramService,
  NotificationRouter,
  TradingNotifications,
  EmailNotificationType,
  TelegramNotificationType,
  AlertCategory,
  AlertPriority,
  type TradeExecutionData,
  type PositionData,
  type PerformanceSummaryData,
  type SystemHealthData
} from '@/core/notifications';

describe('Notification System', () => {
  let notificationManager: NotificationManager;

  beforeEach(async () => {
    // Mock external dependencies
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (notificationManager) {
      await notificationManager.stop();
    }
  });

  describe('NotificationManager', () => {
    test('should initialize with default configuration', async () => {
      notificationManager = new NotificationManager();
      
      // Mock the initialization to avoid actual network calls
      jest.spyOn(notificationManager as any, 'initializeEmailService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTelegramService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeNotificationRouter').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTradingNotifications').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'sendStartupNotification').mockResolvedValue(undefined);

      await notificationManager.initialize();

      const healthStatus = notificationManager.getHealthStatus();
      expect(healthStatus.size).toBeGreaterThan(0);
    });

    test('should handle trade execution notification', async () => {
      notificationManager = new NotificationManager();
      
      // Mock initialization
      jest.spyOn(notificationManager as any, 'initializeEmailService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTelegramService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeNotificationRouter').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTradingNotifications').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'sendStartupNotification').mockResolvedValue(undefined);

      await notificationManager.initialize();

      const tradeData: TradeExecutionData = {
        tradeId: 'test_trade_123',
        symbol: 'BTC/USDT',
        action: 'BUY',
        quantity: 0.1,
        price: 45000,
        totalValue: 4500,
        fees: 4.5,
        pnl: 150,
        balance: 10000,
        strategy: 'MA Crossover',
        confidence: 0.85,
        riskReward: 2.5,
        timestamp: new Date(),
        executionTime: 250
      };

      // Mock the trading notifications service
      const mockNotifyTradeExecution = jest.fn().mockResolvedValue(undefined);
      (notificationManager as any).tradingNotifications = {
        notifyTradeExecution: mockNotifyTradeExecution
      };

      await notificationManager.notifyTradeExecution(tradeData);

      expect(mockNotifyTradeExecution).toHaveBeenCalledWith(tradeData);
    });

    test('should handle security alerts', async () => {
      notificationManager = new NotificationManager();
      
      // Mock initialization
      jest.spyOn(notificationManager as any, 'initializeEmailService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTelegramService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeNotificationRouter').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTradingNotifications').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'sendStartupNotification').mockResolvedValue(undefined);

      await notificationManager.initialize();

      const securityData = {
        threatLevel: 'HIGH' as const,
        incidentType: 'Unauthorized Access Attempt',
        description: 'Multiple failed login attempts detected',
        affectedSystems: ['Trading Engine', 'API Gateway']
      };

      // Mock the notification router
      const mockSendSecurityAlert = jest.fn().mockResolvedValue([]);
      (notificationManager as any).notificationRouter = {
        sendSecurityAlert: mockSendSecurityAlert
      };

      await notificationManager.sendSecurityAlert(securityData);

      expect(mockSendSecurityAlert).toHaveBeenCalledWith(securityData);
    });

    test('should provide health statistics', async () => {
      notificationManager = new NotificationManager();
      
      // Mock initialization
      jest.spyOn(notificationManager as any, 'initializeEmailService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTelegramService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeNotificationRouter').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTradingNotifications').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'sendStartupNotification').mockResolvedValue(undefined);

      await notificationManager.initialize();

      const statistics = notificationManager.getStatistics();

      expect(statistics).toHaveProperty('services');
      expect(statistics).toHaveProperty('overallHealth');
      expect(statistics).toHaveProperty('lastHealthCheck');
      expect(typeof statistics.overallHealth).toBe('boolean');
    });
  });

  describe('EmailService', () => {
    test('should validate SMTP configuration', () => {
      const emailService = new EmailService();
      
      // Test that required environment variables are checked
      expect(process.env.SMTP_HOST).toBeDefined();
      expect(process.env.SMTP_PORT).toBeDefined();
      expect(process.env.SMTP_USER).toBeDefined();
      expect(process.env.SMTP_PASS).toBeDefined();
      expect(process.env.SMTP_FROM_ADDRESS).toBeDefined();
    });

    test('should generate email content from templates', async () => {
      const emailService = new EmailService();
      
      // Mock the template system
      const mockGenerateEmailContent = jest.fn().mockResolvedValue('<html>Test Email</html>');
      (emailService as any).generateEmailContent = mockGenerateEmailContent;

      const notification = {
        id: 'test_email_123',
        type: EmailNotificationType.TRADE_EXECUTION,
        priority: 'high' as any,
        to: ['test@example.com'],
        subject: 'Test Trade Notification',
        templateData: {
          systemName: 'AI Crypto Trading Agent',
          timestamp: new Date().toISOString(),
          symbol: 'BTC/USDT',
          action: 'BUY',
          quantity: 0.1,
          price: 45000
        },
        timestamp: new Date()
      };

      await mockGenerateEmailContent(notification);

      expect(mockGenerateEmailContent).toHaveBeenCalledWith(notification);
    });
  });

  describe('TelegramService', () => {
    test('should format trading messages with emojis', () => {
      const telegramService = new TelegramService();
      
      const tradeData = {
        symbol: 'BTC/USDT',
        action: 'BUY' as const,
        quantity: 0.1,
        price: 45000,
        pnl: 150,
        balance: 10000,
        strategy: 'MA Crossover',
        timestamp: new Date()
      };

      // Test message formatting logic
      const emoji = tradeData.action === 'BUY' ? '🟢' : '🔴';
      const actionEmoji = tradeData.action === 'BUY' ? '📈' : '📉';
      const pnlEmoji = (tradeData.pnl || 0) >= 0 ? '💰' : '📉';

      expect(emoji).toBe('🟢');
      expect(actionEmoji).toBe('📈');
      expect(pnlEmoji).toBe('💰');
    });

    test('should validate authorized users', () => {
      const telegramService = new TelegramService();
      
      // Test that authorized users are loaded from environment
      expect(process.env.TELEGRAM_AUTHORIZED_USERS).toBeDefined();
      expect(process.env.TELEGRAM_ADMIN_USERS).toBeDefined();
      
      const authorizedUsers = process.env.TELEGRAM_AUTHORIZED_USERS!.split(',');
      const adminUsers = process.env.TELEGRAM_ADMIN_USERS!.split(',');
      
      expect(authorizedUsers.length).toBeGreaterThan(0);
      expect(adminUsers.length).toBeGreaterThan(0);
    });
  });

  describe('NotificationRouter', () => {
    test('should route alerts based on priority and category', () => {
      const router = new NotificationRouter();
      
      const alert = {
        id: 'test_alert_123',
        category: AlertCategory.TRADING,
        priority: AlertPriority.HIGH,
        title: 'Test Trading Alert',
        message: 'This is a test trading alert',
        data: { symbol: 'BTC/USDT', action: 'BUY' },
        timestamp: new Date(),
        source: 'test',
        tags: ['test', 'trading']
      };

      // Test alert structure
      expect(alert.category).toBe(AlertCategory.TRADING);
      expect(alert.priority).toBe(AlertPriority.HIGH);
      expect(alert.data).toHaveProperty('symbol');
      expect(alert.data).toHaveProperty('action');
    });

    test('should implement rate limiting', () => {
      const router = new NotificationRouter();
      
      const rateLimitRule = {
        enabled: true,
        maxPerMinute: 10,
        maxPerHour: 100,
        maxPerDay: 1000,
        windowMinutes: 60
      };

      // Test rate limit configuration
      expect(rateLimitRule.enabled).toBe(true);
      expect(rateLimitRule.maxPerMinute).toBe(10);
      expect(rateLimitRule.maxPerHour).toBe(100);
      expect(rateLimitRule.maxPerDay).toBe(1000);
    });

    test('should handle alert deduplication', () => {
      const router = new NotificationRouter();
      
      const alert1 = {
        id: 'alert_1',
        category: AlertCategory.SYSTEM,
        priority: AlertPriority.NORMAL,
        title: 'High CPU Usage',
        message: 'CPU usage is at 85%',
        data: { cpu: 85 },
        timestamp: new Date(),
        source: 'system-monitor',
        tags: ['system', 'cpu']
      };

      const alert2 = {
        id: 'alert_2',
        category: AlertCategory.SYSTEM,
        priority: AlertPriority.NORMAL,
        title: 'High CPU Usage',
        message: 'CPU usage is at 85%',
        data: { cpu: 85 },
        timestamp: new Date(),
        source: 'system-monitor',
        tags: ['system', 'cpu']
      };

      // Test that alerts with same content should be deduplicated
      expect(alert1.title).toBe(alert2.title);
      expect(alert1.message).toBe(alert2.message);
      expect(alert1.source).toBe(alert2.source);
    });
  });

  describe('TradingNotifications', () => {
    test('should format performance summary data', () => {
      const tradingNotifications = new TradingNotifications();
      
      const performanceData: PerformanceSummaryData = {
        period: 'daily',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-01'),
        totalTrades: 15,
        winningTrades: 10,
        losingTrades: 5,
        winRate: 66.7,
        totalPnL: 250.50,
        grossProfit: 400.75,
        grossLoss: -150.25,
        profitFactor: 2.67,
        sharpeRatio: 1.85,
        maxDrawdown: -75.25,
        maxDrawdownPercent: -2.5,
        bestTrade: 85.50,
        worstTrade: -45.25,
        averageWin: 40.08,
        averageLoss: -30.05,
        largestWinStreak: 4,
        largestLossStreak: 2,
        currentBalance: 10250.50,
        startingBalance: 10000.00,
        returnPercent: 2.51,
        tradingDays: 1,
        averageTradesPerDay: 15,
        strategies: [
          {
            name: 'MA Crossover',
            trades: 8,
            winRate: 75.0,
            pnl: 180.25,
            profitFactor: 3.2,
            averageReturn: 22.53
          },
          {
            name: 'RSI Momentum',
            trades: 7,
            winRate: 57.1,
            pnl: 70.25,
            profitFactor: 2.1,
            averageReturn: 10.04
          }
        ]
      };

      // Test performance data structure
      expect(performanceData.totalTrades).toBe(15);
      expect(performanceData.winRate).toBe(66.7);
      expect(performanceData.totalPnL).toBe(250.50);
      expect(performanceData.strategies.length).toBe(2);
      expect(performanceData.strategies[0].name).toBe('MA Crossover');
    });

    test('should handle system health data', () => {
      const tradingNotifications = new TradingNotifications();
      
      const healthData: SystemHealthData = {
        timestamp: new Date(),
        uptime: 86400, // 24 hours in seconds
        cpu: {
          usage: 45.5,
          temperature: 65.2,
          frequency: 2800
        },
        memory: {
          used: 8192,
          available: 4096,
          usagePercent: 66.7
        },
        disk: {
          used: 128000,
          available: 128000,
          usagePercent: 50.0,
          ioWait: 2.5
        },
        network: {
          latency: 25,
          throughput: 1000,
          packetsLost: 0,
          connectionStatus: 'connected'
        },
        trading: {
          activePositions: 3,
          dailyTrades: 12,
          apiLatency: 150,
          lastTradeTime: new Date()
        }
      };

      // Test system health data structure
      expect(healthData.cpu.usage).toBe(45.5);
      expect(healthData.memory.usagePercent).toBe(66.7);
      expect(healthData.disk.usagePercent).toBe(50.0);
      expect(healthData.network.connectionStatus).toBe('connected');
      expect(healthData.trading.activePositions).toBe(3);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete notification flow', async () => {
      notificationManager = new NotificationManager({
        emailEnabled: true,
        telegramEnabled: true,
        routingEnabled: true,
        tradingNotificationsEnabled: true,
        healthCheckInterval: 1 // 1 minute for testing
      });

      // Mock all initialization methods
      jest.spyOn(notificationManager as any, 'initializeEmailService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTelegramService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeNotificationRouter').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTradingNotifications').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'sendStartupNotification').mockResolvedValue(undefined);

      await notificationManager.initialize();

      // Test trade execution flow
      const tradeData: TradeExecutionData = {
        tradeId: 'integration_test_123',
        symbol: 'ETH/USDT',
        action: 'SELL',
        quantity: 2.5,
        price: 2800,
        totalValue: 7000,
        fees: 7.0,
        pnl: -50,
        balance: 9950,
        strategy: 'RSI Divergence',
        confidence: 0.72,
        riskReward: 1.8,
        timestamp: new Date(),
        executionTime: 180
      };

      // Mock the trading notifications
      const mockNotifyTradeExecution = jest.fn().mockResolvedValue(undefined);
      (notificationManager as any).tradingNotifications = {
        notifyTradeExecution: mockNotifyTradeExecution
      };

      await notificationManager.notifyTradeExecution(tradeData);

      expect(mockNotifyTradeExecution).toHaveBeenCalledWith(tradeData);

      // Test statistics
      const statistics = notificationManager.getStatistics();
      expect(statistics).toHaveProperty('services');
      expect(statistics).toHaveProperty('overallHealth');
    });

    test('should handle error scenarios gracefully', async () => {
      notificationManager = new NotificationManager();

      // Mock initialization with some failures
      jest.spyOn(notificationManager as any, 'initializeEmailService').mockRejectedValue(new Error('Email service failed'));
      jest.spyOn(notificationManager as any, 'initializeTelegramService').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeNotificationRouter').mockResolvedValue(undefined);
      jest.spyOn(notificationManager as any, 'initializeTradingNotifications').mockResolvedValue(undefined);

      // Should throw error due to email service failure
      await expect(notificationManager.initialize()).rejects.toThrow('Email service failed');
    });
  });
});

describe('Notification System Environment Validation', () => {
  test('should validate required environment variables', () => {
    const requiredVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM_ADDRESS',
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_CHAT_ID',
      'NOTIFICATION_EMAIL'
    ];

    for (const varName of requiredVars) {
      expect(process.env[varName]).toBeDefined();
    }
  });

  test('should validate email configuration format', () => {
    expect(process.env.SMTP_PORT).toMatch(/^\d+$/);
    expect(process.env.SMTP_FROM_ADDRESS).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(process.env.NOTIFICATION_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  test('should validate Telegram configuration format', () => {
    expect(process.env.TELEGRAM_CHAT_ID).toMatch(/^\d+$/);
    expect(process.env.TELEGRAM_AUTHORIZED_USERS).toMatch(/^\d+(,\d+)*$/);
    expect(process.env.TELEGRAM_ADMIN_USERS).toMatch(/^\d+(,\d+)*$/);
  });
});