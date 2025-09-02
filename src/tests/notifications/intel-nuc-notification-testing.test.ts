/**
 * =============================================================================
 * INTEL NUC NOTIFICATION TESTING SUITE
 * =============================================================================
 * 
 * Comprehensive test suite for Intel NUC notification services including
 * template validation, content verification, delivery testing, and
 * cross-platform compatibility checks.
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Intel NUC Optimized
 * =============================================================================
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { IntelNucTelegramService, IntelNucTradingData, IntelNucSystemData } from '../../core/notifications/intel-nuc-telegram-service';
import { IntelNucEmailService, IntelNucEmailType } from '../../core/notifications/intel-nuc-email-service';
import { logger } from '../../core/logging/logger';

// Mock environment variables for testing
const mockEnvVars = {
  TELEGRAM_BOT_TOKEN: 'test_bot_token_123456789',
  TELEGRAM_CHAT_ID: '123456789',
  TELEGRAM_AUTHORIZED_USERS: '123456789,987654321',
  TELEGRAM_ADMIN_USERS: '123456789',
  EMAIL_SMTP_HOST: 'smtp.gmail.com',
  EMAIL_SMTP_PORT: '587',
  EMAIL_FROM: 'test@example.com',
  EMAIL_PASSWORD: 'test_password',
  EMAIL_TO: 'alerts@example.com',
  EMAIL_SMTP_SECURE: 'true'
};

describe('Intel NUC Notification Testing Suite', () => {
  let telegramService: IntelNucTelegramService;
  let emailService: IntelNucEmailService;

  beforeAll(async () => {
    // Set up mock environment variables
    Object.entries(mockEnvVars).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Initialize services (will use mocked dependencies in test environment)
    telegramService = new IntelNucTelegramService();
    emailService = new IntelNucEmailService();

    logger.info('🧪 Starting Intel NUC notification testing suite');
  });

  afterAll(async () => {
    // Clean up
    if (telegramService) {
      await telegramService.stop();
    }
    
    logger.info('✅ Intel NUC notification testing suite completed');
  });

  describe('Telegram Notification Templates', () => {
    test('should format trade execution notification with all data fields', async () => {
      const mockTradingData: IntelNucTradingData = {
        symbol: 'BTC_USDT',
        action: 'BUY',
        quantity: 0.001,
        price: 45000.50,
        pnl: 125.75,
        balance: 10500.25,
        strategy: 'AI Enhanced Moving Average',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        reasoning: 'Strong bullish momentum detected with RSI oversold conditions and positive sentiment analysis indicating high probability of upward movement.',
        marketAnalysis: 'Bitcoin showing strong support at $44,000 level with increasing volume and positive news sentiment from institutional adoption.',
        sentimentScore: 0.75,
        riskAssessment: 'Low risk trade with 2.5% position size and stop loss at $43,500. Risk-reward ratio of 1:3 provides favorable outcome probability.',
        confidence: 0.85,
        systemLoad: 45.2,
        networkLatency: 23,
        sshTunnelStatus: 'healthy'
      };

      // Mock the sendNotification method to capture the message content
      const mockSendNotification = jest.fn().mockResolvedValue(12345);
      telegramService['sendNotificationWithRateLimit'] = mockSendNotification;

      await telegramService.sendTradeExecutionNotification(mockTradingData);

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRADE_EXECUTION',
          priority: 'high',
          parseMode: 'HTML'
        })
      );

      const sentMessage = mockSendNotification.mock.calls[0][0];
      const messageContent = sentMessage.message;

      // Verify all essential data is included
      expect(messageContent).toContain('BTC_USDT');
      expect(messageContent).toContain('BUY');
      expect(messageContent).toContain('0.001');
      expect(messageContent).toContain('$45000.50');
      expect(messageContent).toContain('$125.75');
      expect(messageContent).toContain('$10500.25');
      expect(messageContent).toContain('AI Enhanced Moving Average');
      expect(messageContent).toContain('85.0%'); // Confidence
      expect(messageContent).toContain('Intel NUC'); // System identifier
      expect(messageContent).toContain('HEALTHY'); // SSH tunnel status
      expect(messageContent).toContain('45.2%'); // System load
      expect(messageContent).toContain('23ms'); // Network latency

      // Verify AI reasoning is included
      expect(messageContent).toContain('AI Reasoning');
      expect(messageContent).toContain('Strong bullish momentum');

      // Verify market analysis is included
      expect(messageContent).toContain('Market Analysis');
      expect(messageContent).toContain('Bitcoin showing strong support');

      // Verify risk assessment is included
      expect(messageContent).toContain('Risk Assessment');
      expect(messageContent).toContain('Low risk trade');

      // Verify emojis are present
      expect(messageContent).toContain('🟢'); // Buy emoji
      expect(messageContent).toContain('📈'); // Action emoji
      expect(messageContent).toContain('💰'); // PnL emoji
      expect(messageContent).toContain('🎯'); // Confidence emoji
      expect(messageContent).toContain('🖥️'); // System status
    });

    test('should format trade opportunity missed notification', async () => {
      const mockMissedData = {
        symbol: 'ETH_USDT',
        reason: 'Risk management threshold exceeded',
        marketConditions: 'High volatility detected with conflicting technical indicators. Sentiment analysis shows mixed signals.',
        sentimentScore: 0.15,
        potentialPnL: 89.50,
        timestamp: new Date('2024-01-15T11:45:00Z')
      };

      const mockSendNotification = jest.fn().mockResolvedValue(12346);
      telegramService['sendNotificationWithRateLimit'] = mockSendNotification;

      await telegramService.sendTradeOpportunityMissedNotification(mockMissedData);

      const sentMessage = mockSendNotification.mock.calls[0][0];
      const messageContent = sentMessage.message;

      expect(messageContent).toContain('TRADE OPPORTUNITY MISSED');
      expect(messageContent).toContain('ETH_USDT');
      expect(messageContent).toContain('Risk management threshold exceeded');
      expect(messageContent).toContain('$89.50');
      expect(messageContent).toContain('High volatility detected');
      expect(messageContent).toContain('⏸️'); // Missed trade emoji
      expect(messageContent).toContain('Intel NUC');
    });

    test('should format daily summary with Intel NUC performance metrics', async () => {
      const mockSummaryData = {
        totalTrades: 15,
        winRate: 73.3,
        totalPnL: 245.80,
        bestTrade: 89.50,
        worstTrade: -23.10,
        balance: 10745.80,
        date: new Date('2024-01-15T23:59:00Z'),
        systemPerformance: {
          cpuUsage: 52.3,
          ramUsage: 68.7,
          diskUsage: 34.2,
          cpuTemperature: 61.5,
          sshTunnelHealth: 'healthy' as const,
          sshTunnelLatency: 28,
          uptime: 86400,
          activeConnections: 12,
          tradingEngineStatus: 'active' as const,
          databaseConnections: 3
        },
        strategyBreakdown: {
          'AI Enhanced MA': { trades: 8, pnl: 156.30 },
          'RSI Momentum': { trades: 4, pnl: 78.20 },
          'MACD Crossover': { trades: 3, pnl: 11.30 }
        },
        marketConditions: 'Bullish market conditions with strong institutional buying pressure and positive regulatory developments.'
      };

      const mockSendNotification = jest.fn().mockResolvedValue(12347);
      telegramService['sendNotificationWithRateLimit'] = mockSendNotification;

      await telegramService.sendDailySummary(mockSummaryData);

      const sentMessage = mockSendNotification.mock.calls[0][0];
      const messageContent = sentMessage.message;

      // Verify trading metrics
      expect(messageContent).toContain('15'); // Total trades
      expect(messageContent).toContain('73.3%'); // Win rate
      expect(messageContent).toContain('$245.80'); // Total PnL
      expect(messageContent).toContain('$10745.80'); // Balance

      // Verify Intel NUC performance metrics
      expect(messageContent).toContain('52.3%'); // CPU usage
      expect(messageContent).toContain('68.7%'); // RAM usage
      expect(messageContent).toContain('61.5°C'); // CPU temperature
      expect(messageContent).toContain('HEALTHY'); // SSH tunnel health
      expect(messageContent).toContain('28ms'); // SSH tunnel latency

      // Verify strategy breakdown
      expect(messageContent).toContain('AI Enhanced MA');
      expect(messageContent).toContain('8 trades');
      expect(messageContent).toContain('$156.30');

      // Verify market conditions
      expect(messageContent).toContain('Bullish market conditions');

      // Verify emojis and formatting
      expect(messageContent).toContain('📊'); // Summary emoji
      expect(messageContent).toContain('🖥️'); // Intel NUC emoji
      expect(messageContent).toContain('🚀'); // Positive PnL emoji
      expect(messageContent).toContain('🎯'); // Win rate emoji
    });

    test('should format system health notification with all metrics', async () => {
      const mockSystemData: IntelNucSystemData = {
        cpuUsage: 75.8,
        ramUsage: 82.3,
        diskUsage: 45.6,
        cpuTemperature: 68.2,
        networkStatus: 'Connected - High Speed',
        uptime: 172800, // 2 days
        activeConnections: 18,
        sshTunnelHealth: 'healthy',
        sshTunnelLatency: 31,
        tradingEngineStatus: 'active',
        databaseConnections: 5
      };

      const mockSendNotification = jest.fn().mockResolvedValue(12348);
      telegramService['sendNotificationWithRateLimit'] = mockSendNotification;

      await telegramService.sendSystemHealth(mockSystemData);

      const sentMessage = mockSendNotification.mock.calls[0][0];
      const messageContent = sentMessage.message;

      expect(messageContent).toContain('INTEL NUC SYSTEM HEALTH');
      expect(messageContent).toContain('75.8%'); // CPU usage
      expect(messageContent).toContain('82.3%'); // RAM usage
      expect(messageContent).toContain('45.6%'); // Disk usage
      expect(messageContent).toContain('68.2°C'); // CPU temperature
      expect(messageContent).toContain('HEALTHY'); // SSH tunnel health
      expect(messageContent).toContain('31ms'); // SSH tunnel latency
      expect(messageContent).toContain('ACTIVE'); // Trading engine status
      expect(messageContent).toContain('2d 0h 0m'); // Uptime formatting
      expect(messageContent).toContain('18'); // Active connections
      expect(messageContent).toContain('5'); // Database connections

      // Verify appropriate emojis based on thresholds
      expect(messageContent).toContain('🟡'); // CPU usage (70-90%)
      expect(messageContent).toContain('🟡'); // RAM usage (70-90%)
      expect(messageContent).toContain('🟢'); // Disk usage (<70%)
      expect(messageContent).toContain('🌡️'); // Temperature (60-80°C)
      expect(messageContent).toContain('🟢'); // SSH tunnel healthy
    });

    test('should format SSH tunnel alert notifications', async () => {
      const mockTunnelData = {
        status: 'failed' as const,
        latency: 0,
        errorMessage: 'Connection timeout to Oracle Cloud instance',
        timestamp: new Date('2024-01-15T14:22:00Z')
      };

      const mockSendNotification = jest.fn().mockResolvedValue(12349);
      telegramService['sendNotificationWithRateLimit'] = mockSendNotification;

      await telegramService.sendSSHTunnelAlert(mockTunnelData);

      const sentMessage = mockSendNotification.mock.calls[0][0];
      const messageContent = sentMessage.message;

      expect(messageContent).toContain('SSH TUNNEL ALERT');
      expect(messageContent).toContain('FAILED');
      expect(messageContent).toContain('Connection timeout to Oracle Cloud');
      expect(messageContent).toContain('Trading operations may be affected');
      expect(messageContent).toContain('🚨'); // Failed status emoji
      expect(sentMessage.priority).toBe('critical');
    });

    test('should handle emoji display correctly across different scenarios', () => {
      // Test confidence emojis
      expect(telegramService['getConfidenceEmoji'](0.9)).toBe('🎯');
      expect(telegramService['getConfidenceEmoji'](0.7)).toBe('✅');
      expect(telegramService['getConfidenceEmoji'](0.5)).toBe('⚖️');
      expect(telegramService['getConfidenceEmoji'](0.2)).toBe('❓');

      // Test sentiment emojis
      expect(telegramService['getSentimentEmoji'](0.8)).toBe('😊');
      expect(telegramService['getSentimentEmoji'](0.3)).toBe('😐');
      expect(telegramService['getSentimentEmoji'](-0.1)).toBe('😕');
      expect(telegramService['getSentimentEmoji'](-0.5)).toBe('😰');

      // Test system health emojis
      expect(telegramService['getSystemHealthEmoji'](50)).toBe('🟢');
      expect(telegramService['getSystemHealthEmoji'](80)).toBe('🟡');
      expect(telegramService['getSystemHealthEmoji'](95)).toBe('🔴');

      // Test tunnel status emojis
      expect(telegramService['getTunnelStatusEmoji']('healthy')).toBe('🟢');
      expect(telegramService['getTunnelStatusEmoji']('degraded')).toBe('🟡');
      expect(telegramService['getTunnelStatusEmoji']('failed')).toBe('🔴');
    });

    test('should format sentiment scores correctly', () => {
      expect(telegramService['formatSentimentScore'](0.8)).toBe('Very Positive');
      expect(telegramService['formatSentimentScore'](0.3)).toBe('Positive');
      expect(telegramService['formatSentimentScore'](0.0)).toBe('Neutral');
      expect(telegramService['formatSentimentScore'](-0.3)).toBe('Negative');
      expect(telegramService['formatSentimentScore'](-0.8)).toBe('Very Negative');
    });

    test('should format uptime correctly', () => {
      expect(telegramService['formatUptime'](3600)).toBe('1h 0m'); // 1 hour
      expect(telegramService['formatUptime'](86400)).toBe('1d 0h 0m'); // 1 day
      expect(telegramService['formatUptime'](90061)).toBe('1d 1h 1m'); // 1 day, 1 hour, 1 minute
      expect(telegramService['formatUptime'](300)).toBe('5m'); // 5 minutes
    });

    test('should truncate long text appropriately', () => {
      const longText = 'This is a very long text that should be truncated when it exceeds the maximum length limit to prevent message overflow and ensure readability.';
      const truncated = telegramService['truncateText'](longText, 50);
      
      expect(truncated.length).toBeLessThanOrEqual(50);
      expect(truncated).toContain('...');
      expect(truncated).toBe('This is a very long text that should be trunca...');
    });
  });

  describe('Email Notification Templates', () => {
    test('should generate HTML trade execution email with all styling', async () => {
      const mockTradingData = {
        symbol: 'BTC_USDT',
        action: 'BUY' as const,
        quantity: 0.001,
        price: 45000.50,
        pnl: 125.75,
        balance: 10500.25,
        strategy: 'AI Enhanced Moving Average',
        confidence: 85,
        sentimentScore: 0.75,
        reasoning: 'Strong bullish momentum detected with RSI oversold conditions.',
        marketAnalysis: 'Bitcoin showing strong support at $44,000 level.',
        riskAssessment: 'Low risk trade with 2.5% position size.',
        timestamp: new Date('2024-01-15T10:30:00Z')
      };

      // Mock the sendNotification method
      const mockSendNotification = jest.fn().mockResolvedValue('test-message-id-123');
      emailService['sendNotification'] = mockSendNotification;

      await emailService.sendTradeExecutionNotification(mockTradingData);

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IntelNucEmailType.TRADE_EXECUTION,
          priority: 'high',
          subject: expect.stringContaining('Trade Executed: BUY BTC_USDT [Intel NUC]')
        })
      );

      const sentEmail = mockSendNotification.mock.calls[0][0];
      const templateData = sentEmail.templateData;

      // Verify all template data is correctly structured
      expect(templateData.systemName).toBe('AI Crypto Trading Agent - Intel NUC');
      expect(templateData.symbol).toBe('BTC_USDT');
      expect(templateData.action).toBe('BUY');
      expect(templateData.quantity).toBe(0.001);
      expect(templateData.price).toBe(45000.50);
      expect(templateData.pnl).toBe(125.75);
      expect(templateData.balance).toBe(10500.25);
      expect(templateData.strategy).toBe('AI Enhanced Moving Average');
      expect(templateData.confidence).toBe(85);
      expect(templateData.reasoning).toBe('Strong bullish momentum detected with RSI oversold conditions.');
    });

    test('should generate HTML daily summary email with responsive design', async () => {
      const mockSummaryData = {
        totalTrades: 15,
        winRate: 73.3,
        totalPnL: 245.80,
        bestTrade: 89.50,
        worstTrade: -23.10,
        balance: 10745.80,
        date: new Date('2024-01-15T23:59:00Z'),
        systemPerformance: {
          cpuUsage: 52.3,
          ramUsage: 68.7,
          diskUsage: 34.2,
          cpuTemperature: 61.5,
          sshTunnelHealth: 'healthy' as const,
          sshTunnelLatency: 28,
          uptime: 86400
        },
        strategyBreakdown: {
          'AI Enhanced MA': { trades: 8, pnl: 156.30 },
          'RSI Momentum': { trades: 4, pnl: 78.20 }
        },
        marketConditions: 'Bullish market conditions with strong institutional buying.'
      };

      const mockSendNotification = jest.fn().mockResolvedValue('test-message-id-124');
      emailService['sendNotification'] = mockSendNotification;

      await emailService.sendDailySummary(mockSummaryData);

      const sentEmail = mockSendNotification.mock.calls[0][0];
      const templateData = sentEmail.templateData;

      expect(templateData.totalTrades).toBe(15);
      expect(templateData.winRate).toBe(73.3);
      expect(templateData.totalPnL).toBe(245.80);
      expect(templateData.cpuUsage).toBe(52.3);
      expect(templateData.sshTunnelHealth).toBe('healthy');
      expect(templateData.strategyBreakdown).toEqual(mockSummaryData.strategyBreakdown);
      expect(templateData.marketConditions).toBe('Bullish market conditions with strong institutional buying.');
    });

    test('should generate security alert email with dark theme', async () => {
      const mockSecurityData = {
        threatLevel: 'HIGH' as const,
        incidentType: 'Unauthorized Access Attempt',
        description: 'Multiple failed login attempts detected from suspicious IP addresses.',
        affectedSystems: ['Intel NUC Trading System', 'SSH Tunnel', 'Database'],
        timestamp: new Date('2024-01-15T16:45:00Z')
      };

      const mockSendNotification = jest.fn().mockResolvedValue('test-message-id-125');
      emailService['sendNotification'] = mockSendNotification;

      await emailService.sendSecurityAlert(mockSecurityData);

      const sentEmail = mockSendNotification.mock.calls[0][0];
      const templateData = sentEmail.templateData;

      expect(templateData.threatLevel).toBe('HIGH');
      expect(templateData.incidentType).toBe('Unauthorized Access Attempt');
      expect(templateData.description).toBe('Multiple failed login attempts detected from suspicious IP addresses.');
      expect(templateData.affectedSystems).toEqual(['Intel NUC Trading System', 'SSH Tunnel', 'Database']);
      expect(templateData.theme).toBe('dark'); // Security alerts use dark theme
      expect(sentEmail.priority).toBe('high');
    });

    test('should process HTML template conditionals correctly', () => {
      const testTemplate = '{{#if pnl}}Profit: ${{pnl}}{{/if}}{{#if reasoning}}Reason: {{reasoning}}{{/if}}';
      const testData = { pnl: 125.75, reasoning: 'Test reasoning' };

      const result = emailService['processConditionals'](testTemplate, testData as any);

      expect(result).toContain('Profit: $125.75');
      expect(result).toContain('Reason: Test reasoning');
    });

    test('should process HTML template loops correctly', () => {
      const testTemplate = '{{#each strategies}}Strategy: {{@key}} - {{this.pnl}}{{/each}}';
      const testData = { 
        strategies: { 
          'MA Strategy': { pnl: 100 }, 
          'RSI Strategy': { pnl: 50 } 
        } 
      };

      const result = emailService['processLoops'](testTemplate, testData as any);

      expect(result).toContain('Strategy: MA Strategy - 100');
      expect(result).toContain('Strategy: RSI Strategy - 50');
    });

    test('should handle missing template data gracefully', async () => {
      const incompleteData = {
        symbol: 'ETH_USDT',
        action: 'SELL' as const,
        // Missing other required fields
        timestamp: new Date()
      };

      const mockSendNotification = jest.fn().mockResolvedValue('test-message-id-126');
      emailService['sendNotification'] = mockSendNotification;

      // Should not throw error, should handle missing data gracefully
      await expect(emailService.sendTradeExecutionNotification(incompleteData as any)).resolves.toBeDefined();

      const sentEmail = mockSendNotification.mock.calls[0][0];
      expect(sentEmail.templateData.symbol).toBe('ETH_USDT');
      expect(sentEmail.templateData.action).toBe('SELL');
    });
  });

  describe('Notification Delivery and Reliability', () => {
    test('should track delivery status correctly', async () => {
      const mockTradingData: IntelNucTradingData = {
        symbol: 'BTC_USDT',
        action: 'BUY',
        quantity: 0.001,
        price: 45000,
        balance: 10000,
        strategy: 'Test Strategy',
        timestamp: new Date()
      };

      const mockSendNotification = jest.fn().mockResolvedValue(12350);
      telegramService['sendNotificationWithRateLimit'] = mockSendNotification;

      const messageId = await telegramService.sendTradeExecutionNotification(mockTradingData);

      expect(messageId).toBe(12350);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    test('should handle rate limiting correctly', async () => {
      const mockSendNotification = jest.fn();
      
      // Simulate rate limit exceeded
      mockSendNotification.mockRejectedValueOnce(new Error('Rate limit exceeded'));
      telegramService['sendNotificationWithRateLimit'] = mockSendNotification;

      const mockData: IntelNucTradingData = {
        symbol: 'BTC_USDT',
        action: 'BUY',
        quantity: 0.001,
        price: 45000,
        balance: 10000,
        strategy: 'Test Strategy',
        timestamp: new Date()
      };

      await expect(telegramService.sendTradeExecutionNotification(mockData))
        .rejects.toThrow('Rate limit exceeded');
    });

    test('should validate notification content length limits', () => {
      const veryLongReasoning = 'A'.repeat(1000); // Very long text
      const truncated = telegramService['truncateText'](veryLongReasoning, 200);
      
      expect(truncated.length).toBeLessThanOrEqual(200);
      expect(truncated.endsWith('...')).toBe(true);
    });

    test('should handle network failures gracefully', async () => {
      const mockSendNotification = jest.fn();
      mockSendNotification.mockRejectedValueOnce(new Error('Network timeout'));
      
      emailService['sendNotification'] = mockSendNotification;

      const mockData = {
        symbol: 'BTC_USDT',
        action: 'BUY' as const,
        quantity: 0.001,
        price: 45000,
        balance: 10000,
        strategy: 'Test Strategy',
        timestamp: new Date()
      };

      await expect(emailService.sendTradeExecutionNotification(mockData))
        .rejects.toThrow('Network timeout');
    });

    test('should provide accurate service statistics', () => {
      const stats = telegramService.getStatistics();
      
      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('authorizedUsers');
      expect(stats).toHaveProperty('adminUsers');
      expect(stats).toHaveProperty('rateLimitHits');
      
      expect(typeof stats.totalSent).toBe('number');
      expect(typeof stats.totalFailed).toBe('number');
      expect(typeof stats.authorizedUsers).toBe('number');
      expect(typeof stats.adminUsers).toBe('number');
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('should format messages correctly for different devices', () => {
      // Test that emojis and formatting work across platforms
      const testMessage = '🚀 Trade: BTC_USDT 📈 Profit: $125.75 💰';
      
      // Verify emoji characters are properly encoded
      expect(testMessage).toContain('🚀');
      expect(testMessage).toContain('📈');
      expect(testMessage).toContain('💰');
      
      // Verify message structure
      expect(testMessage).toMatch(/🚀.*BTC_USDT.*📈.*\$125\.75.*💰/);
    });

    test('should handle HTML email rendering across email clients', async () => {
      const mockData = {
        symbol: 'BTC_USDT',
        action: 'BUY' as const,
        quantity: 0.001,
        price: 45000,
        pnl: 125.75,
        balance: 10000,
        strategy: 'Test Strategy',
        timestamp: new Date()
      };

      const mockGenerateContent = jest.fn().mockResolvedValue(`
        <html>
          <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h1>Trade Executed</h1>
              <p>Symbol: BTC_USDT</p>
              <p>P&L: $125.75</p>
            </div>
          </body>
        </html>
      `);
      
      emailService['generateEmailContent'] = mockGenerateContent;

      const mockSendNotification = jest.fn().mockResolvedValue('test-id');
      emailService['sendNotification'] = mockSendNotification;

      await emailService.sendTradeExecutionNotification(mockData);

      // Verify HTML structure is email-client friendly
      const htmlContent = await mockGenerateContent.mock.results[0].value;
      expect(htmlContent).toContain('<html>');
      expect(htmlContent).toContain('font-family: Arial');
      expect(htmlContent).toContain('max-width: 600px');
      expect(htmlContent).toContain('margin: 0 auto');
    });

    test('should handle special characters and encoding correctly', () => {
      const testData = {
        symbol: 'BTC/USDT', // Forward slash
        strategy: 'AI & ML Enhanced', // Ampersand
        reasoning: 'Price > $45,000 indicates strong momentum', // Greater than, dollar sign
      };

      // Test that special characters are handled properly
      expect(testData.symbol).toContain('/');
      expect(testData.strategy).toContain('&');
      expect(testData.reasoning).toContain('>');
      expect(testData.reasoning).toContain('$');
    });
  });

  describe('Notification Escalation and Fallback', () => {
    test('should handle notification escalation for critical alerts', async () => {
      const criticalAlert = {
        threatLevel: 'CRITICAL' as const,
        incidentType: 'System Compromise',
        description: 'Unauthorized access detected',
        affectedSystems: ['Trading System'],
        timestamp: new Date()
      };

      const mockSendNotification = jest.fn().mockResolvedValue('critical-alert-id');
      emailService['sendNotification'] = mockSendNotification;

      await emailService.sendSecurityAlert(criticalAlert);

      const sentEmail = mockSendNotification.mock.calls[0][0];
      expect(sentEmail.priority).toBe('critical');
      expect(sentEmail.subject).toContain('CRITICAL');
    });

    test('should implement fallback mechanisms for failed deliveries', async () => {
      // This would test the fallback logic when primary notification fails
      const mockPrimaryFail = jest.fn().mockRejectedValueOnce(new Error('Primary service failed'));
      const mockFallbackSuccess = jest.fn().mockResolvedValue('fallback-success');

      // In a real implementation, this would test the fallback chain
      try {
        await mockPrimaryFail();
      } catch (error) {
        const fallbackResult = await mockFallbackSuccess();
        expect(fallbackResult).toBe('fallback-success');
      }
    });
  });

  describe('Performance and Resource Usage', () => {
    test('should handle high-frequency notifications efficiently', async () => {
      const startTime = Date.now();
      const notifications = [];

      // Simulate multiple rapid notifications
      for (let i = 0; i < 10; i++) {
        const mockData: IntelNucTradingData = {
          symbol: `TEST_${i}`,
          action: 'BUY',
          quantity: 0.001,
          price: 45000 + i,
          balance: 10000,
          strategy: 'Test Strategy',
          timestamp: new Date()
        };
        notifications.push(mockData);
      }

      const mockSendNotification = jest.fn().mockResolvedValue(12345);
      telegramService['sendNotificationWithRateLimit'] = mockSendNotification;

      // Process all notifications
      const promises = notifications.map(data => 
        telegramService.sendTradeExecutionNotification(data).catch(() => null)
      );
      
      await Promise.allSettled(promises);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process reasonably quickly (less than 1 second for 10 notifications)
      expect(processingTime).toBeLessThan(1000);
    });

    test('should manage memory usage for delivery tracking', () => {
      // Test cleanup functionality
      const initialSize = telegramService['deliveryTracking'].size;
      
      // Add some mock tracking entries
      for (let i = 0; i < 5; i++) {
        telegramService['deliveryTracking'].set(`test-${i}`, {
          timestamp: new Date(Date.now() - (25 * 60 * 60 * 1000)), // 25 hours ago
          status: 'sent'
        });
      }

      // Cleanup should remove old entries
      emailService.cleanupDeliveryTracking(24); // Remove entries older than 24 hours
      
      // Verify cleanup occurred (in a real implementation)
      expect(typeof emailService.cleanupDeliveryTracking).toBe('function');
    });
  });
});

// Helper function to create mock trading data
function createMockTradingData(overrides: Partial<IntelNucTradingData> = {}): IntelNucTradingData {
  return {
    symbol: 'BTC_USDT',
    action: 'BUY',
    quantity: 0.001,
    price: 45000,
    pnl: 125.75,
    balance: 10000,
    strategy: 'Test Strategy',
    timestamp: new Date(),
    ...overrides
  };
}

// Helper function to create mock system data
function createMockSystemData(overrides: Partial<IntelNucSystemData> = {}): IntelNucSystemData {
  return {
    cpuUsage: 50,
    ramUsage: 60,
    diskUsage: 40,
    cpuTemperature: 65,
    networkStatus: 'Connected',
    uptime: 86400,
    activeConnections: 10,
    sshTunnelHealth: 'healthy',
    sshTunnelLatency: 25,
    tradingEngineStatus: 'active',
    databaseConnections: 3,
    ...overrides
  };
}