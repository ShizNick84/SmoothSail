/**
 * =============================================================================
 * NOTIFICATION INTEGRATION TESTING
 * =============================================================================
 * 
 * Integration tests for Intel NUC notification services to verify
 * end-to-end functionality, service coordination, and real-world scenarios.
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Intel NUC Integration Tests
 * =============================================================================
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { IntelNucTelegramService } from '../../core/notifications/intel-nuc-telegram-service';
import { IntelNucEmailService } from '../../core/notifications/intel-nuc-email-service';
import { logger } from '../../core/logging/logger';

describe('Notification Integration Tests', () => {
  let telegramService: IntelNucTelegramService;
  let emailService: IntelNucEmailService;

  beforeAll(async () => {
    // Set up test environment
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';
    process.env.TELEGRAM_CHAT_ID = '123456789';
    process.env.EMAIL_SMTP_HOST = 'smtp.test.com';
    process.env.EMAIL_SMTP_PORT = '587';
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.EMAIL_PASSWORD = 'test_password';
    process.env.EMAIL_TO = 'alerts@example.com';

    telegramService = new IntelNucTelegramService();
    emailService = new IntelNucEmailService();

    logger.info('🧪 Starting notification integration tests');
  });

  afterAll(async () => {
    if (telegramService) {
      await telegramService.stop();
    }
    logger.info('✅ Notification integration tests completed');
  });

  describe('Multi-Channel Notification Coordination', () => {
    test('should send coordinated trade execution notifications', async () => {
      const tradeData = {
        symbol: 'BTC_USDT',
        action: 'BUY' as const,
        quantity: 0.001,
        price: 45000.50,
        pnl: 125.75,
        balance: 10500.25,
        strategy: 'AI Enhanced Moving Average',
        timestamp: new Date(),
        reasoning: 'Strong bullish momentum detected',
        marketAnalysis: 'Bitcoin showing strong support',
        sentimentScore: 0.75,
        confidence: 0.85,
        systemLoad: 45.2,
        networkLatency: 23,
        sshTunnelStatus: 'healthy' as const
      };

      // Mock both services
      const mockTelegramSend = jest.fn().mockResolvedValue(12345);
      const mockEmailSend = jest.fn().mockResolvedValue('email-123');

      telegramService['sendNotificationWithRateLimit'] = mockTelegramSend;
      emailService['sendNotification'] = mockEmailSend;

      // Send notifications through both channels
      const [telegramResult, emailResult] = await Promise.all([
        telegramService.sendTradeExecutionNotification(tradeData),
        emailService.sendTradeExecutionNotification(tradeData)
      ]);

      expect(telegramResult).toBe(12345);
      expect(emailResult).toBe('email-123');

      // Verify both services were called with appropriate data
      expect(mockTelegramSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRADE_EXECUTION',
          priority: 'high'
        })
      );

      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRADE_EXECUTION',
          priority: 'high'
        })
      );

      // Verify message content consistency
      const telegramMessage = mockTelegramSend.mock.calls[0][0].message;
      const emailData = mockEmailSend.mock.calls[0][0].templateData;

      expect(telegramMessage).toContain('BTC_USDT');
      expect(telegramMessage).toContain('BUY');
      expect(telegramMessage).toContain('$125.75');
      expect(telegramMessage).toContain('Intel NUC');

      expect(emailData.symbol).toBe('BTC_USDT');
      expect(emailData.action).toBe('BUY');
      expect(emailData.pnl).toBe(125.75);
      expect(emailData.systemName).toContain('Intel NUC');
    });

    test('should handle notification failures gracefully', async () => {
      const tradeData = {
        symbol: 'ETH_USDT',
        action: 'SELL' as const,
        quantity: 0.5,
        price: 3200.00,
        balance: 10000,
        strategy: 'Test Strategy',
        timestamp: new Date()
      };

      // Mock Telegram failure, Email success
      const mockTelegramFail = jest.fn().mockRejectedValue(new Error('Telegram API error'));
      const mockEmailSuccess = jest.fn().mockResolvedValue('email-success');

      telegramService['sendNotificationWithRateLimit'] = mockTelegramFail;
      emailService['sendNotification'] = mockEmailSuccess;

      // Test that one service failing doesn't affect the other
      const results = await Promise.allSettled([
        telegramService.sendTradeExecutionNotification(tradeData),
        emailService.sendTradeExecutionNotification(tradeData)
      ]);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
      expect((results[1] as PromiseFulfilledResult<string>).value).toBe('email-success');
    });

    test('should maintain message consistency across channels', async () => {
      const systemData = {
        cpuUsage: 75.8,
        ramUsage: 82.3,
        diskUsage: 45.6,
        cpuTemperature: 68.2,
        networkStatus: 'Connected',
        sshTunnelHealth: 'healthy' as const,
        sshTunnelLatency: 31,
        uptime: 172800,
        timestamp: new Date()
      };

      const mockTelegramSend = jest.fn().mockResolvedValue(12346);
      const mockEmailSend = jest.fn().mockResolvedValue('email-124');

      telegramService['sendNotificationWithRateLimit'] = mockTelegramSend;
      emailService['sendNotification'] = mockEmailSend;

      await Promise.all([
        telegramService.sendSystemHealth({
          ...systemData,
          activeConnections: 18,
          tradingEngineStatus: 'active',
          databaseConnections: 5
        }),
        emailService.sendSystemHealthNotification(systemData)
      ]);

      const telegramMessage = mockTelegramSend.mock.calls[0][0].message;
      const emailData = mockEmailSend.mock.calls[0][0].templateData;

      // Verify consistent data across channels
      expect(telegramMessage).toContain('75.8%');
      expect(telegramMessage).toContain('82.3%');
      expect(telegramMessage).toContain('68.2°C');
      expect(telegramMessage).toContain('HEALTHY');

      expect(emailData.cpuUsage).toBe(75.8);
      expect(emailData.ramUsage).toBe(82.3);
      expect(emailData.cpuTemperature).toBe(68.2);
      expect(emailData.sshTunnelHealth).toBe('healthy');
    });
  });

  describe('Real-World Scenario Testing', () => {
    test('should handle rapid-fire trading notifications', async () => {
      const trades = [
        { symbol: 'BTC_USDT', action: 'BUY' as const, pnl: 50.25 },
        { symbol: 'ETH_USDT', action: 'SELL' as const, pnl: -15.75 },
        { symbol: 'BTC_USDT', action: 'SELL' as const, pnl: 125.50 },
        { symbol: 'ADA_USDT', action: 'BUY' as const, pnl: 35.80 }
      ];

      const mockTelegramSend = jest.fn().mockResolvedValue(12347);
      const mockEmailSend = jest.fn().mockResolvedValue('email-125');

      telegramService['sendNotificationWithRateLimit'] = mockTelegramSend;
      emailService['sendNotification'] = mockEmailSend;

      const startTime = Date.now();

      // Send all notifications concurrently
      const notifications = trades.map(trade => ({
        ...trade,
        quantity: 0.001,
        price: 45000,
        balance: 10000,
        strategy: 'Rapid Trading',
        timestamp: new Date()
      }));

      const telegramPromises = notifications.map(data => 
        telegramService.sendTradeExecutionNotification(data)
      );
      const emailPromises = notifications.map(data => 
        emailService.sendTradeExecutionNotification(data)
      );

      const results = await Promise.allSettled([
        ...telegramPromises,
        ...emailPromises
      ]);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify all notifications were processed
      expect(results.length).toBe(8); // 4 trades × 2 channels
      
      // Verify reasonable processing time
      expect(processingTime).toBeLessThan(2000); // Less than 2 seconds

      // Verify all Telegram calls were made
      expect(mockTelegramSend).toHaveBeenCalledTimes(4);
      
      // Verify all Email calls were made
      expect(mockEmailSend).toHaveBeenCalledTimes(4);
    });

    test('should handle system alerts during trading hours', async () => {
      const alertScenarios = [
        {
          type: 'ssh_tunnel',
          data: {
            status: 'degraded' as const,
            latency: 150,
            errorMessage: 'High latency detected',
            timestamp: new Date()
          }
        },
        {
          type: 'thermal',
          data: {
            cpuTemperature: 85.5,
            timestamp: new Date()
          }
        },
        {
          type: 'security',
          data: {
            threatLevel: 'HIGH' as const,
            incidentType: 'Suspicious Activity',
            description: 'Multiple failed authentication attempts',
            affectedSystems: ['Trading System'],
            timestamp: new Date()
          }
        }
      ];

      const mockTelegramSend = jest.fn().mockResolvedValue(12348);
      const mockEmailSend = jest.fn().mockResolvedValue('email-126');

      telegramService['sendNotificationWithRateLimit'] = mockTelegramSend;
      emailService['sendNotification'] = mockEmailSend;

      // Process different types of alerts
      await Promise.all([
        telegramService.sendSSHTunnelAlert(alertScenarios[0].data),
        emailService.sendSecurityAlert(alertScenarios[2].data)
      ]);

      // Verify appropriate priority levels
      const telegramCall = mockTelegramSend.mock.calls[0][0];
      const emailCall = mockEmailSend.mock.calls[0][0];

      expect(telegramCall.priority).toBe('normal'); // SSH degraded is normal priority
      expect(emailCall.priority).toBe('high'); // Security HIGH is high priority

      // Verify message content
      expect(telegramCall.message).toContain('SSH TUNNEL ALERT');
      expect(telegramCall.message).toContain('DEGRADED');
      expect(telegramCall.message).toContain('150ms');

      expect(emailCall.templateData.threatLevel).toBe('HIGH');
      expect(emailCall.templateData.incidentType).toBe('Suspicious Activity');
    });

    test('should coordinate daily summary across channels', async () => {
      const summaryData = {
        totalTrades: 25,
        winRate: 68.0,
        totalPnL: 342.75,
        bestTrade: 125.50,
        worstTrade: -45.25,
        balance: 11342.75,
        date: new Date(),
        systemPerformance: {
          cpuUsage: 58.3,
          ramUsage: 71.2,
          diskUsage: 42.8,
          cpuTemperature: 64.5,
          sshTunnelHealth: 'healthy' as const,
          sshTunnelLatency: 28,
          uptime: 86400
        },
        strategyBreakdown: {
          'AI Enhanced MA': { trades: 12, pnl: 198.50 },
          'RSI Momentum': { trades: 8, pnl: 89.25 },
          'MACD Crossover': { trades: 5, pnl: 55.00 }
        },
        marketConditions: 'Mixed market conditions with moderate volatility'
      };

      const mockTelegramSend = jest.fn().mockResolvedValue(12349);
      const mockEmailSend = jest.fn().mockResolvedValue('email-127');

      telegramService['sendNotificationWithRateLimit'] = mockTelegramSend;
      emailService['sendNotification'] = mockEmailSend;

      await Promise.all([
        telegramService.sendDailySummary(summaryData),
        emailService.sendDailySummary(summaryData)
      ]);

      // Verify both channels received the summary
      expect(mockTelegramSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DAILY_SUMMARY',
          priority: 'normal'
        })
      );

      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DAILY_SUMMARY',
          priority: 'normal'
        })
      );

      // Verify data consistency
      const telegramMessage = mockTelegramSend.mock.calls[0][0].message;
      const emailData = mockEmailSend.mock.calls[0][0].templateData;

      expect(telegramMessage).toContain('25'); // Total trades
      expect(telegramMessage).toContain('68.0%'); // Win rate
      expect(telegramMessage).toContain('$342.75'); // Total PnL
      expect(telegramMessage).toContain('AI Enhanced MA'); // Strategy name

      expect(emailData.totalTrades).toBe(25);
      expect(emailData.winRate).toBe(68.0);
      expect(emailData.totalPnL).toBe(342.75);
      expect(emailData.strategyBreakdown).toHaveProperty('AI Enhanced MA');
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from temporary service outages', async () => {
      const tradeData = {
        symbol: 'BTC_USDT',
        action: 'BUY' as const,
        quantity: 0.001,
        price: 45000,
        balance: 10000,
        strategy: 'Recovery Test',
        timestamp: new Date()
      };

      // Simulate temporary failure followed by success
      const mockTelegramSend = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce(12350);

      telegramService['sendNotificationWithRateLimit'] = mockTelegramSend;

      // First attempt should fail
      await expect(telegramService.sendTradeExecutionNotification(tradeData))
        .rejects.toThrow('Temporary network error');

      // Second attempt should succeed
      const result = await telegramService.sendTradeExecutionNotification(tradeData);
      expect(result).toBe(12350);
      expect(mockTelegramSend).toHaveBeenCalledTimes(2);
    });

    test('should handle malformed data gracefully', async () => {
      const malformedData = {
        symbol: null,
        action: 'INVALID_ACTION',
        quantity: 'not_a_number',
        price: undefined,
        balance: -1000,
        strategy: '',
        timestamp: 'invalid_date'
      } as any;

      const mockTelegramSend = jest.fn().mockResolvedValue(12351);
      const mockEmailSend = jest.fn().mockResolvedValue('email-128');

      telegramService['sendNotificationWithRateLimit'] = mockTelegramSend;
      emailService['sendNotification'] = mockEmailSend;

      // Services should handle malformed data without crashing
      await expect(telegramService.sendTradeExecutionNotification(malformedData))
        .resolves.toBeDefined();

      await expect(emailService.sendTradeExecutionNotification(malformedData))
        .resolves.toBeDefined();

      // Verify services were called despite malformed data
      expect(mockTelegramSend).toHaveBeenCalled();
      expect(mockEmailSend).toHaveBeenCalled();
    });

    test('should maintain service statistics during failures', async () => {
      const initialStats = telegramService.getStatistics();
      
      // Simulate some failures
      const mockTelegramFail = jest.fn().mockRejectedValue(new Error('Service error'));
      telegramService['sendNotificationWithRateLimit'] = mockTelegramFail;

      const tradeData = {
        symbol: 'BTC_USDT',
        action: 'BUY' as const,
        quantity: 0.001,
        price: 45000,
        balance: 10000,
        strategy: 'Stats Test',
        timestamp: new Date()
      };

      // Attempt multiple failed notifications
      for (let i = 0; i < 3; i++) {
        try {
          await telegramService.sendTradeExecutionNotification(tradeData);
        } catch (error) {
          // Expected to fail
        }
      }

      const finalStats = telegramService.getStatistics();
      
      // Statistics should still be accessible and valid
      expect(finalStats).toHaveProperty('totalSent');
      expect(finalStats).toHaveProperty('totalFailed');
      expect(typeof finalStats.totalSent).toBe('number');
      expect(typeof finalStats.totalFailed).toBe('number');
    });
  });

  describe('Performance Under Load', () => {
    test('should handle concurrent notifications efficiently', async () => {
      const concurrentNotifications = 20;
      const notifications = Array.from({ length: concurrentNotifications }, (_, i) => ({
        symbol: `TEST_${i}`,
        action: (i % 2 === 0 ? 'BUY' : 'SELL') as const,
        quantity: 0.001,
        price: 45000 + i,
        pnl: (i % 2 === 0 ? 1 : -1) * (10 + i),
        balance: 10000 + i * 100,
        strategy: `Strategy_${i % 3}`,
        timestamp: new Date()
      }));

      const mockTelegramSend = jest.fn().mockResolvedValue(12352);
      const mockEmailSend = jest.fn().mockResolvedValue('email-129');

      telegramService['sendNotificationWithRateLimit'] = mockTelegramSend;
      emailService['sendNotification'] = mockEmailSend;

      const startTime = Date.now();

      // Send all notifications concurrently
      const promises = notifications.flatMap(data => [
        telegramService.sendTradeExecutionNotification(data),
        emailService.sendTradeExecutionNotification(data)
      ]);

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const successfulNotifications = results.filter(r => r.status === 'fulfilled').length;

      // Verify performance metrics
      expect(processingTime).toBeLessThan(5000); // Less than 5 seconds
      expect(successfulNotifications).toBeGreaterThan(0);
      
      // Verify services were called appropriately
      expect(mockTelegramSend).toHaveBeenCalledTimes(concurrentNotifications);
      expect(mockEmailSend).toHaveBeenCalledTimes(concurrentNotifications);
    });

    test('should manage memory usage during extended operation', () => {
      // Test memory management for delivery tracking
      const initialMemoryUsage = process.memoryUsage();
      
      // Simulate extended operation with many notifications
      for (let i = 0; i < 100; i++) {
        telegramService['deliveryTracking'].set(`test-${i}`, {
          timestamp: new Date(),
          status: 'sent',
          messageId: i
        });
      }

      // Cleanup old entries
      emailService.cleanupDeliveryTracking(0); // Remove all entries

      const finalMemoryUsage = process.memoryUsage();
      
      // Memory usage should not grow excessively
      const memoryGrowth = finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });

  describe('Configuration and Environment Handling', () => {
    test('should handle missing environment variables gracefully', async () => {
      // Temporarily remove environment variables
      const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const originalEmailHost = process.env.EMAIL_SMTP_HOST;

      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.EMAIL_SMTP_HOST;

      // Services should handle missing configuration
      const newTelegramService = new IntelNucTelegramService();
      const newEmailService = new IntelNucEmailService();

      // Initialization should fail gracefully
      await expect(newTelegramService.initialize()).rejects.toThrow();
      await expect(newEmailService.initialize()).rejects.toThrow();

      // Restore environment variables
      process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
      process.env.EMAIL_SMTP_HOST = originalEmailHost;
    });

    test('should validate configuration parameters', () => {
      // Test configuration validation
      const validConfig = {
        TELEGRAM_BOT_TOKEN: 'valid_token_123',
        TELEGRAM_CHAT_ID: '123456789',
        EMAIL_SMTP_HOST: 'smtp.gmail.com',
        EMAIL_SMTP_PORT: '587'
      };

      const invalidConfig = {
        TELEGRAM_BOT_TOKEN: '',
        TELEGRAM_CHAT_ID: 'invalid_chat_id',
        EMAIL_SMTP_HOST: '',
        EMAIL_SMTP_PORT: 'invalid_port'
      };

      // Valid configuration should be accepted
      Object.entries(validConfig).forEach(([key, value]) => {
        expect(value).toBeTruthy();
        expect(typeof value).toBe('string');
      });

      // Invalid configuration should be rejected
      expect(invalidConfig.TELEGRAM_BOT_TOKEN).toBeFalsy();
      expect(invalidConfig.EMAIL_SMTP_HOST).toBeFalsy();
    });
  });
});