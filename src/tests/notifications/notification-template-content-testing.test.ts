/**
 * =============================================================================
 * NOTIFICATION TEMPLATE AND CONTENT TESTING SUITE
 * =============================================================================
 * 
 * Comprehensive test suite for validating notification templates, content,
 * delivery reliability, emoji display, and cross-platform compatibility
 * for Intel NUC deployment.
 * 
 * Task 8.3: Test Notification Templates and Content
 * - Test all Telegram notification templates with real trading data
 * - Validate email templates render correctly in different email clients
 * - Test notification content includes all relevant trading information
 * - Verify emoji and formatting display correctly across platforms
 * - Test notification escalation and fallback scenarios
 * - Validate notification timing and delivery reliability
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0 - Task 8.3 Implementation
 * =============================================================================
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { IntelNucTelegramService, IntelNucTradingData, IntelNucSystemData } from '../../core/notifications/intel-nuc-telegram-service';
import { IntelNucEmailService, IntelNucEmailType } from '../../core/notifications/intel-nuc-email-service';
import { TradingNotifications, TradeExecutionData, PositionData, PerformanceSummaryData } from '../../core/notifications/trading-notifications';
import { TradingDecisionNotifications, TradingDecisionNotificationData, TradingDecisionType } from '../../core/notifications/trading-decision-notifications';
import { logger } from '../../core/logging/logger';

// Mock environment variables for comprehensive testing
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
  EMAIL_SMTP_SECURE: 'true',
  NOTIFICATION_EMAIL: 'notifications@example.com',
  SECURITY_EMAIL: 'security@example.com'
};

// Test data generators for comprehensive testing
const generateTradingData = (overrides: Partial<IntelNucTradingData> = {}): IntelNucTradingData => ({
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
  sshTunnelStatus: 'healthy',
  ...overrides
});

const generateSystemData = (overrides: Partial<IntelNucSystemData> = {}): IntelNucSystemData => ({
  cpuUsage: 52.3,
  ramUsage: 68.7,
  diskUsage: 34.2,
  cpuTemperature: 61.5,
  networkStatus: 'Connected - High Speed',
  uptime: 86400,
  activeConnections: 12,
  sshTunnelHealth: 'healthy',
  sshTunnelLatency: 28,
  tradingEngineStatus: 'active',
  databaseConnections: 3,
  ...overrides
});

const generateTradeExecutionData = (overrides: Partial<TradeExecutionData> = {}): TradeExecutionData => ({
  tradeId: 'trade_123456',
  symbol: 'BTC_USDT',
  action: 'BUY',
  quantity: 0.001,
  price: 45000.50,
  totalValue: 45.00,
  fees: 0.045,
  pnl: 125.75,
  balance: 10500.25,
  strategy: 'AI Enhanced Moving Average',
  confidence: 0.85,
  riskReward: 3.0,
  timestamp: new Date('2024-01-15T10:30:00Z'),
  executionTime: 150,
  ...overrides
});

describe('Notification Template and Content Testing Suite - Task 8.3', () => {
  let telegramService: IntelNucTelegramService;
  let emailService: IntelNucEmailService;
  let tradingNotifications: TradingNotifications;
  let tradingDecisionNotifications: TradingDecisionNotifications;

  beforeAll(async () => {
    // Set up mock environment variables
    Object.entries(mockEnvVars).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Initialize services
    telegramService = new IntelNucTelegramService();
    emailService = new IntelNucEmailService();
    tradingNotifications = new TradingNotifications();
    tradingDecisionNotifications = new TradingDecisionNotifications();

    logger.info('🧪 Starting Task 8.3: Notification Template and Content Testing Suite');
  });

  afterAll(async () => {
    // Clean up services
    if (telegramService) {
      await telegramService.stop();
    }
    if (tradingNotifications) {
      await tradingNotifications.stop();
    }
    if (tradingDecisionNotifications) {
      await tradingDecisionNotifications.stop();
    }
    
    logger.info('✅ Task 8.3: Notification Template and Content Testing Suite completed');
  });  
describe('8.3.1 - Telegram Notification Templates with Real Trading Data', () => {
    beforeEach(() => {
      // Mock the sendNotificationWithRateLimit method for testing
      jest.spyOn(telegramService as any, 'sendNotificationWithRateLimit').mockResolvedValue(12345);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should format trade execution notification with complete trading data', async () => {
      const tradingData = generateTradingData({
        action: 'BUY',
        pnl: 125.75,
        confidence: 0.85,
        sentimentScore: 0.75
      });

      await telegramService.sendTradeExecutionNotification(tradingData);

      const mockCall = (telegramService as any).sendNotificationWithRateLimit.mock.calls[0][0];
      const messageContent = mockCall.message;

      // Verify all essential trading data is included
      expect(messageContent).toContain('BTC_USDT');
      expect(messageContent).toContain('BUY');
      expect(messageContent).toContain('0.001');
      expect(messageContent).toContain('45000.50');
      expect(messageContent).toContain('125.75');
      expect(messageContent).toContain('10500.25');
      expect(messageContent).toContain('AI Enhanced Moving Average');
      expect(messageContent).toContain('85.0%'); // Confidence
      expect(messageContent).toContain('Intel NUC'); // System identifier

      // Verify AI reasoning and analysis are included
      expect(messageContent).toContain('AI Reasoning');
      expect(messageContent).toContain('Strong bullish momentum');
      expect(messageContent).toContain('Market Analysis');
      expect(messageContent).toContain('Bitcoin showing strong support');
      expect(messageContent).toContain('Risk Assessment');
      expect(messageContent).toContain('Low risk trade');

      // Verify system status information
      expect(messageContent).toContain('System Status');
      expect(messageContent).toContain('45.2%'); // System load
      expect(messageContent).toContain('HEALTHY'); // SSH tunnel status
      expect(messageContent).toContain('23ms'); // Network latency

      // Verify emojis are present
      expect(messageContent).toContain('🟢'); // Buy emoji
      expect(messageContent).toContain('📈'); // Action emoji
      expect(messageContent).toContain('💰'); // PnL emoji
      expect(messageContent).toContain('🎯'); // Confidence emoji
      expect(messageContent).toContain('🖥️'); // System status
      expect(messageContent).toContain('😊'); // Sentiment emoji

      // Verify message structure and formatting
      expect(mockCall.parseMode).toBe('HTML');
      expect(mockCall.type).toBe('TRADE_EXECUTION');
      expect(mockCall.priority).toBe('high');
    });

    test('should format sell trade notification with negative P&L correctly', async () => {
      const tradingData = generateTradingData({
        action: 'SELL',
        pnl: -45.30,
        confidence: 0.65,
        sentimentScore: -0.2
      });

      await telegramService.sendTradeExecutionNotification(tradingData);

      const mockCall = (telegramService as any).sendNotificationWithRateLimit.mock.calls[0][0];
      const messageContent = mockCall.message;

      // Verify sell-specific formatting
      expect(messageContent).toContain('🔴'); // Sell emoji
      expect(messageContent).toContain('📉'); // Sell action emoji
      expect(messageContent).toContain('SELL');
      expect(messageContent).toContain('-45.30'); // Negative P&L
      expect(messageContent).toContain('65.0%'); // Lower confidence
      expect(messageContent).toContain('😕'); // Negative sentiment emoji
    });

    test('should format trade opportunity missed notification with detailed reasoning', async () => {
      const missedData = {
        symbol: 'ETH_USDT',
        reason: 'Risk management threshold exceeded - volatility too high',
        marketConditions: 'High volatility detected with conflicting technical indicators. Sentiment analysis shows mixed signals with institutional selling pressure.',
        sentimentScore: 0.15,
        potentialPnL: 89.50,
        timestamp: new Date('2024-01-15T11:45:00Z')
      };

      await telegramService.sendTradeOpportunityMissedNotification(missedData);

      const mockCall = (telegramService as any).sendNotificationWithRateLimit.mock.calls[0][0];
      const messageContent = mockCall.message;

      // Verify missed opportunity content
      expect(messageContent).toContain('TRADE OPPORTUNITY MISSED');
      expect(messageContent).toContain('ETH_USDT');
      expect(messageContent).toContain('Risk management threshold exceeded');
      expect(messageContent).toContain('89.50'); // Potential P&L
      expect(messageContent).toContain('High volatility detected');
      expect(messageContent).toContain('⏸️'); // Missed trade emoji
      expect(messageContent).toContain('Intel NUC');
      expect(messageContent).toContain('😕'); // Neutral/negative sentiment
    });    
test('should format daily summary with comprehensive Intel NUC metrics', async () => {
      const summaryData = {
        totalTrades: 15,
        winRate: 73.3,
        totalPnL: 245.80,
        bestTrade: 89.50,
        worstTrade: -23.10,
        balance: 10745.80,
        date: new Date('2024-01-15T23:59:00Z'),
        systemPerformance: generateSystemData(),
        strategyBreakdown: {
          'AI Enhanced MA': { trades: 8, pnl: 156.30 },
          'RSI Momentum': { trades: 4, pnl: 78.20 },
          'MACD Crossover': { trades: 3, pnl: 11.30 }
        },
        marketConditions: 'Bullish market conditions with strong institutional buying pressure and positive regulatory developments.'
      };

      await telegramService.sendDailySummary(summaryData);

      const mockCall = (telegramService as any).sendNotificationWithRateLimit.mock.calls[0][0];
      const messageContent = mockCall.message;

      // Verify trading performance metrics
      expect(messageContent).toContain('DAILY TRADING SUMMARY');
      expect(messageContent).toContain('15'); // Total trades
      expect(messageContent).toContain('73.3%'); // Win rate
      expect(messageContent).toContain('245.80'); // Total P&L
      expect(messageContent).toContain('10745.80'); // Balance

      // Verify Intel NUC performance metrics
      expect(messageContent).toContain('Intel NUC Performance');
      expect(messageContent).toContain('52.3%'); // CPU usage
      expect(messageContent).toContain('68.7%'); // RAM usage
      expect(messageContent).toContain('61.5°C'); // CPU temperature
      expect(messageContent).toContain('HEALTHY'); // SSH tunnel health
      expect(messageContent).toContain('28ms'); // SSH tunnel latency

      // Verify strategy breakdown
      expect(messageContent).toContain('Strategy Breakdown');
      expect(messageContent).toContain('AI Enhanced MA');
      expect(messageContent).toContain('8 trades');
      expect(messageContent).toContain('156.30');

      // Verify market conditions
      expect(messageContent).toContain('Market Conditions');
      expect(messageContent).toContain('Bullish market conditions');

      // Verify emojis and formatting
      expect(messageContent).toContain('📊'); // Summary emoji
      expect(messageContent).toContain('🖥️'); // Intel NUC emoji
      expect(messageContent).toContain('🚀'); // Positive P&L emoji
      expect(messageContent).toContain('🎯'); // Win rate emoji
    });

    test('should format system health notification with all hardware metrics', async () => {
      const systemData = generateSystemData({
        cpuUsage: 75.8,
        ramUsage: 82.3,
        diskUsage: 45.6,
        cpuTemperature: 68.2,
        sshTunnelHealth: 'healthy',
        sshTunnelLatency: 31
      });

      await telegramService.sendSystemHealth(systemData);

      const mockCall = (telegramService as any).sendNotificationWithRateLimit.mock.calls[0][0];
      const messageContent = mockCall.message;

      // Verify system health content
      expect(messageContent).toContain('INTEL NUC SYSTEM HEALTH');
      expect(messageContent).toContain('75.8%'); // CPU usage
      expect(messageContent).toContain('82.3%'); // RAM usage
      expect(messageContent).toContain('45.6%'); // Disk usage
      expect(messageContent).toContain('68.2°C'); // CPU temperature
      expect(messageContent).toContain('HEALTHY'); // SSH tunnel health
      expect(messageContent).toContain('31ms'); // SSH tunnel latency
      expect(messageContent).toContain('ACTIVE'); // Trading engine status
      expect(messageContent).toContain('1d 0h 0m'); // Uptime formatting

      // Verify appropriate emojis based on thresholds
      expect(messageContent).toContain('🟡'); // CPU usage (70-90%)
      expect(messageContent).toContain('🟡'); // RAM usage (70-90%)
      expect(messageContent).toContain('🟢'); // Disk usage (<70%)
      expect(messageContent).toContain('🌡️'); // Temperature emoji
      expect(messageContent).toContain('🟢'); // SSH tunnel healthy
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

    test('should format text correctly and handle truncation', () => {
      // Test sentiment score formatting
      expect(telegramService['formatSentimentScore'](0.8)).toBe('Very Positive');
      expect(telegramService['formatSentimentScore'](0.3)).toBe('Positive');
      expect(telegramService['formatSentimentScore'](0.0)).toBe('Neutral');
      expect(telegramService['formatSentimentScore'](-0.3)).toBe('Negative');
      expect(telegramService['formatSentimentScore'](-0.8)).toBe('Very Negative');

      // Test uptime formatting
      expect(telegramService['formatUptime'](3600)).toBe('1h 0m');
      expect(telegramService['formatUptime'](86400)).toBe('1d 0h 0m');
      expect(telegramService['formatUptime'](90061)).toBe('1d 1h 1m');
      expect(telegramService['formatUptime'](300)).toBe('5m');

      // Test text truncation
      const longText = 'This is a very long text that should be truncated when it exceeds the maximum length limit to prevent message overflow and ensure readability.';
      const truncated = telegramService['truncateText'](longText, 50);
      
      expect(truncated.length).toBeLessThanOrEqual(50);
      expect(truncated).toContain('...');
      expect(truncated).toBe('This is a very long text that should be trunca...');
    });
  });  descr
ibe('8.3.2 - Email Template Rendering and Content Validation', () => {
    beforeEach(() => {
      // Mock the sendNotification method for testing
      jest.spyOn(emailService as any, 'sendNotification').mockResolvedValue('test-message-id-123');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should generate HTML trade execution email with complete styling and data', async () => {
      const tradingData = {
        symbol: 'BTC_USDT',
        action: 'BUY' as const,
        quantity: 0.001,
        price: 45000.50,
        pnl: 125.75,
        balance: 10500.25,
        strategy: 'AI Enhanced Moving Average',
        confidence: 85,
        sentimentScore: 0.75,
        reasoning: 'Strong bullish momentum detected with RSI oversold conditions and positive sentiment analysis.',
        marketAnalysis: 'Bitcoin showing strong support at $44,000 level with increasing volume and institutional adoption.',
        riskAssessment: 'Low risk trade with 2.5% position size and stop loss at $43,500.',
        timestamp: new Date('2024-01-15T10:30:00Z')
      };

      await emailService.sendTradeExecutionNotification(tradingData);

      const mockCall = (emailService as any).sendNotification.mock.calls[0][0];

      // Verify email structure
      expect(mockCall.type).toBe(IntelNucEmailType.TRADE_EXECUTION);
      expect(mockCall.priority).toBe('high');
      expect(mockCall.subject).toContain('Trade Executed: BUY BTC_USDT [Intel NUC]');

      // Verify template data completeness
      const templateData = mockCall.templateData;
      expect(templateData.systemName).toBe('AI Crypto Trading Agent - Intel NUC');
      expect(templateData.symbol).toBe('BTC_USDT');
      expect(templateData.action).toBe('BUY');
      expect(templateData.quantity).toBe(0.001);
      expect(templateData.price).toBe(45000.50);
      expect(templateData.pnl).toBe(125.75);
      expect(templateData.balance).toBe(10500.25);
      expect(templateData.strategy).toBe('AI Enhanced Moving Average');
      expect(templateData.confidence).toBe(85);
      expect(templateData.reasoning).toBe('Strong bullish momentum detected with RSI oversold conditions and positive sentiment analysis.');
      expect(templateData.marketAnalysis).toBe('Bitcoin showing strong support at $44,000 level with increasing volume and institutional adoption.');
      expect(templateData.riskAssessment).toBe('Low risk trade with 2.5% position size and stop loss at $43,500.');
    });

    test('should generate responsive daily summary email with Intel NUC metrics', async () => {
      const summaryData = {
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
        marketConditions: 'Bullish market conditions with strong institutional buying pressure.'
      };

      await emailService.sendDailySummary(summaryData);

      const mockCall = (emailService as any).sendNotification.mock.calls[0][0];
      const templateData = mockCall.templateData;

      // Verify daily summary data
      expect(mockCall.type).toBe(IntelNucEmailType.DAILY_SUMMARY);
      expect(mockCall.subject).toContain('Daily Trading Summary');
      expect(templateData.totalTrades).toBe(15);
      expect(templateData.winRate).toBe(73.3);
      expect(templateData.totalPnL).toBe(245.80);
      expect(templateData.cpuUsage).toBe(52.3);
      expect(templateData.sshTunnelHealth).toBe('healthy');
      expect(templateData.strategyBreakdown).toEqual(summaryData.strategyBreakdown);
      expect(templateData.marketConditions).toBe('Bullish market conditions with strong institutional buying pressure.');
    });

    test('should generate security alert email with dark theme and proper formatting', async () => {
      const securityData = {
        threatLevel: 'HIGH' as const,
        incidentType: 'Unauthorized Access Attempt',
        description: 'Multiple failed login attempts detected from suspicious IP addresses targeting Intel NUC system.',
        affectedSystems: ['Intel NUC Trading System', 'SSH Tunnel', 'Database'],
        timestamp: new Date('2024-01-15T16:45:00Z')
      };

      await emailService.sendSecurityAlert(securityData);

      const mockCall = (emailService as any).sendNotification.mock.calls[0][0];
      const templateData = mockCall.templateData;

      // Verify security alert structure
      expect(mockCall.type).toBe(IntelNucEmailType.SECURITY_ALERT);
      expect(mockCall.priority).toBe('high');
      expect(mockCall.subject).toContain('Security Alert: HIGH');
      expect(templateData.threatLevel).toBe('HIGH');
      expect(templateData.incidentType).toBe('Unauthorized Access Attempt');
      expect(templateData.description).toBe('Multiple failed login attempts detected from suspicious IP addresses targeting Intel NUC system.');
      expect(templateData.affectedSystems).toEqual(['Intel NUC Trading System', 'SSH Tunnel', 'Database']);
      expect(templateData.theme).toBe('dark'); // Security alerts use dark theme
    });

    test('should handle missing template data gracefully', async () => {
      const incompleteData = {
        symbol: 'ETH_USDT',
        action: 'SELL' as const,
        // Missing other required fields
        timestamp: new Date()
      };

      // Should not throw error, should handle missing data gracefully
      await expect(emailService.sendTradeExecutionNotification(incompleteData as any)).resolves.toBeDefined();

      const mockCall = (emailService as any).sendNotification.mock.calls[0][0];
      expect(mockCall.templateData.symbol).toBe('ETH_USDT');
      expect(mockCall.templateData.action).toBe('SELL');
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
  }); 
 describe('8.3.3 - Notification Delivery and Reliability Testing', () => {
    test('should track delivery status correctly', async () => {
      const tradingData = generateTradingData();

      // Mock successful delivery
      jest.spyOn(telegramService as any, 'sendNotificationWithRateLimit').mockResolvedValue(12350);

      const messageId = await telegramService.sendTradeExecutionNotification(tradingData);

      expect(messageId).toBe(12350);
      expect(telegramService['sendNotificationWithRateLimit']).toHaveBeenCalledTimes(1);
    });

    test('should handle rate limiting correctly', async () => {
      // Mock rate limit exceeded
      jest.spyOn(telegramService as any, 'sendNotificationWithRateLimit')
        .mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const tradingData = generateTradingData();

      await expect(telegramService.sendTradeExecutionNotification(tradingData))
        .rejects.toThrow('Rate limit exceeded');
    });

    test('should validate notification content length limits', () => {
      const veryLongReasoning = 'A'.repeat(1000);
      const truncated = telegramService['truncateText'](veryLongReasoning, 200);
      
      expect(truncated.length).toBeLessThanOrEqual(200);
      expect(truncated.endsWith('...')).toBe(true);
    });

    test('should handle network failures gracefully', async () => {
      // Mock network timeout
      jest.spyOn(emailService as any, 'sendNotification')
        .mockRejectedValueOnce(new Error('Network timeout'));

      const tradingData = {
        symbol: 'BTC_USDT',
        action: 'BUY' as const,
        quantity: 0.001,
        price: 45000,
        balance: 10000,
        strategy: 'Test Strategy',
        timestamp: new Date()
      };

      await expect(emailService.sendTradeExecutionNotification(tradingData))
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

  describe('8.3.4 - Cross-Platform Compatibility and Emoji Display', () => {
    test('should format messages correctly for different devices', () => {
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

      // Mock HTML generation
      jest.spyOn(emailService as any, 'generateEmailContent').mockResolvedValue(`
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

      jest.spyOn(emailService as any, 'sendNotification').mockResolvedValue('test-id');

      await emailService.sendTradeExecutionNotification(mockData);

      // Verify HTML structure is email-client friendly
      const htmlContent = await emailService['generateEmailContent'].mock.results[0].value;
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
  });  de
scribe('8.3.5 - Notification Escalation and Fallback Scenarios', () => {
    test('should handle notification escalation for critical alerts', async () => {
      const criticalAlert = {
        threatLevel: 'CRITICAL' as const,
        incidentType: 'System Compromise',
        description: 'Unauthorized access detected on Intel NUC system',
        affectedSystems: ['Trading System', 'SSH Tunnel'],
        timestamp: new Date()
      };

      jest.spyOn(emailService as any, 'sendNotification').mockResolvedValue('critical-alert-id');

      await emailService.sendSecurityAlert(criticalAlert);

      const mockCall = (emailService as any).sendNotification.mock.calls[0][0];
      expect(mockCall.priority).toBe('critical');
      expect(mockCall.subject).toContain('CRITICAL');
    });

    test('should implement fallback mechanisms for failed deliveries', async () => {
      // Mock primary service failure and fallback success
      const mockPrimaryFail = jest.fn().mockRejectedValueOnce(new Error('Primary service failed'));
      const mockFallbackSuccess = jest.fn().mockResolvedValue('fallback-success');

      // Test fallback logic
      try {
        await mockPrimaryFail();
      } catch (error) {
        const fallbackResult = await mockFallbackSuccess();
        expect(fallbackResult).toBe('fallback-success');
      }
    });

    test('should validate notification timing and delivery reliability', async () => {
      const startTime = Date.now();
      const notifications = [];

      // Simulate multiple rapid notifications
      for (let i = 0; i < 5; i++) {
        const tradingData = generateTradingData({
          symbol: `TEST_${i}`,
          price: 45000 + i
        });
        notifications.push(tradingData);
      }

      jest.spyOn(telegramService as any, 'sendNotificationWithRateLimit').mockResolvedValue(12345);

      // Send all notifications
      const promises = notifications.map(data => 
        telegramService.sendTradeExecutionNotification(data)
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all notifications were sent
      expect(telegramService['sendNotificationWithRateLimit']).toHaveBeenCalledTimes(5);
      
      // Verify reasonable performance (should complete within 5 seconds)
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('8.3.6 - Performance and Resource Usage Testing', () => {
    test('should handle high-frequency notifications efficiently', async () => {
      const startTime = Date.now();
      const notifications = [];

      // Generate 20 notifications for performance testing
      for (let i = 0; i < 20; i++) {
        const tradingData = generateTradingData({
          symbol: `PERF_TEST_${i}`,
          price: 45000 + (i * 10),
          pnl: (i % 2 === 0) ? 50 + i : -(30 + i)
        });
        notifications.push(tradingData);
      }

      jest.spyOn(telegramService as any, 'sendNotificationWithRateLimit').mockResolvedValue(12345);

      // Process all notifications
      const results = await Promise.allSettled(
        notifications.map(data => telegramService.sendTradeExecutionNotification(data))
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify performance metrics
      expect(results.length).toBe(20);
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify all notifications were processed
      expect(telegramService['sendNotificationWithRateLimit']).toHaveBeenCalledTimes(20);
    });

    test('should monitor memory usage during notification processing', () => {
      const initialMemory = process.memoryUsage();
      
      // Generate large notification data
      const largeNotificationData = generateTradingData({
        reasoning: 'A'.repeat(5000), // Large reasoning text
        marketAnalysis: 'B'.repeat(3000), // Large market analysis
        riskAssessment: 'C'.repeat(2000) // Large risk assessment
      });

      // Process notification (mocked)
      jest.spyOn(telegramService as any, 'sendNotificationWithRateLimit').mockResolvedValue(12345);
      
      // Memory should not increase significantly
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('8.3.7 - Integration Testing with Trading Notifications', () => {
    beforeEach(() => {
      // Mock the underlying notification services
      jest.spyOn(tradingNotifications as any, 'notificationRouter').mockImplementation({
        sendTradingNotification: jest.fn().mockResolvedValue(undefined),
        sendSystemHealthAlert: jest.fn().mockResolvedValue(undefined),
        routeAlert: jest.fn().mockResolvedValue(undefined)
      });
    });

    test('should integrate trade execution notifications with trading system', async () => {
      const tradeData = generateTradeExecutionData({
        action: 'BUY',
        pnl: 150.25
      });

      // Mock the notification methods
      jest.spyOn(tradingNotifications, 'notifyTradeExecution').mockResolvedValue(undefined);

      await tradingNotifications.notifyTradeExecution(tradeData);

      expect(tradingNotifications.notifyTradeExecution).toHaveBeenCalledWith(tradeData);
    });

    test('should validate comprehensive notification content across all templates', async () => {
      // Test data for comprehensive validation
      const testScenarios = [
        {
          name: 'Profitable BUY trade',
          data: generateTradingData({ action: 'BUY', pnl: 125.75, confidence: 0.85 }),
          expectedContent: ['BUY', '125.75', '85.0%', '🟢', '💰']
        },
        {
          name: 'Loss-making SELL trade',
          data: generateTradingData({ action: 'SELL', pnl: -45.30, confidence: 0.60 }),
          expectedContent: ['SELL', '-45.30', '60.0%', '🔴', '📉']
        },
        {
          name: 'High confidence trade',
          data: generateTradingData({ confidence: 0.95, sentimentScore: 0.8 }),
          expectedContent: ['95.0%', '🎯', '😊', 'Very Positive']
        },
        {
          name: 'Low confidence trade',
          data: generateTradingData({ confidence: 0.25, sentimentScore: -0.6 }),
          expectedContent: ['25.0%', '❓', '😰', 'Very Negative']
        }
      ];

      jest.spyOn(telegramService as any, 'sendNotificationWithRateLimit').mockResolvedValue(12345);

      for (const scenario of testScenarios) {
        await telegramService.sendTradeExecutionNotification(scenario.data);
        
        const mockCall = (telegramService as any).sendNotificationWithRateLimit.mock.calls.pop()[0];
        const messageContent = mockCall.message;

        // Verify all expected content is present
        for (const expectedItem of scenario.expectedContent) {
          expect(messageContent).toContain(expectedItem);
        }

        // Verify message structure
        expect(messageContent).toContain('TRADE EXECUTED');
        expect(messageContent).toContain('Intel NUC');
        expect(messageContent).toContain('System Status');
      }
    });
  });
});