/**
 * =============================================================================
 * ENHANCED TRADING DECISION NOTIFICATIONS
 * =============================================================================
 * 
 * Advanced notification service for detailed trading decision explanations,
 * market analysis summaries, sentiment analysis results, and AI reasoning
 * specifically optimized for Intel NUC deployment.
 * 
 * Features:
 * - Detailed trade decision explanations with AI reasoning
 * - Market analysis summaries with sentiment indicators
 * - "Why trade was not placed" explanations with market conditions
 * - Profit/loss projections and risk assessments
 * - Strategy performance updates and recommendations
 * - Real-time market sentiment analysis integration
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Intel NUC Enhanced Trading Decisions
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { IntelNucTelegramService } from './intel-nuc-telegram-service';
import { IntelNucEmailService } from './intel-nuc-email-service';

/**
 * Trading decision types for enhanced notifications
 */
export enum TradingDecisionType {
  TRADE_EXECUTED = 'TRADE_EXECUTED',
  TRADE_REJECTED = 'TRADE_REJECTED',
  TRADE_DELAYED = 'TRADE_DELAYED',
  POSITION_ADJUSTED = 'POSITION_ADJUSTED',
  STOP_LOSS_UPDATED = 'STOP_LOSS_UPDATED',
  TAKE_PROFIT_UPDATED = 'TAKE_PROFIT_UPDATED',
  STRATEGY_SWITCHED = 'STRATEGY_SWITCHED',
  MARKET_CONDITION_ALERT = 'MARKET_CONDITION_ALERT',
  SENTIMENT_SHIFT = 'SENTIMENT_SHIFT',
  RISK_THRESHOLD_EXCEEDED = 'RISK_THRESHOLD_EXCEEDED'
}

/**
 * Market sentiment analysis data
 */
export interface MarketSentimentData {
  overall: number; // -1 to 1
  twitter: number;
  reddit: number;
  news: number;
  technicalIndicators: number;
  institutionalFlow: number;
  fearGreedIndex: number;
  volatilityIndex: number;
  trendStrength: number;
  supportResistance: {
    support: number;
    resistance: number;
    currentPrice: number;
  };
}

/**
 * AI reasoning data structure
 */
export interface AIReasoningData {
  confidence: number; // 0 to 1
  primaryFactors: string[];
  secondaryFactors: string[];
  riskFactors: string[];
  opportunityFactors: string[];
  technicalAnalysis: {
    trend: 'bullish' | 'bearish' | 'neutral';
    momentum: 'strong' | 'moderate' | 'weak';
    volatility: 'high' | 'medium' | 'low';
    volume: 'high' | 'normal' | 'low';
  };
  fundamentalAnalysis: {
    newsImpact: 'positive' | 'negative' | 'neutral';
    marketEvents: string[];
    economicIndicators: string[];
  };
  reasoning: string;
  alternativeScenarios: Array<{
    scenario: string;
    probability: number;
    impact: string;
  }>;
}

/**
 * Risk assessment data
 */
export interface RiskAssessmentData {
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  riskScore: number; // 0 to 100
  positionSize: number;
  stopLossDistance: number;
  takeProfitDistance: number;
  riskRewardRatio: number;
  maxDrawdown: number;
  portfolioImpact: number;
  correlationRisk: number;
  liquidityRisk: number;
  volatilityRisk: number;
  timeHorizon: string;
  exitStrategy: string;
  contingencyPlans: string[];
}

/**
 * Profit/Loss projection data
 */
export interface PnLProjectionData {
  expectedReturn: number;
  bestCase: number;
  worstCase: number;
  probability: {
    profit: number;
    loss: number;
    breakeven: number;
  };
  timeframe: string;
  keyLevels: {
    entry: number;
    stopLoss: number;
    takeProfit: number[];
  };
  scenarios: Array<{
    name: string;
    probability: number;
    expectedPnL: number;
    description: string;
  }>;
}

/**
 * Strategy performance data
 */
export interface StrategyPerformanceData {
  strategyName: string;
  currentPerformance: {
    winRate: number;
    avgReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
    profitFactor: number;
  };
  recentChanges: {
    winRateChange: number;
    returnChange: number;
    performanceTrend: 'improving' | 'declining' | 'stable';
  };
  recommendations: string[];
  optimizationSuggestions: string[];
  marketConditionSuitability: string;
}

/**
 * Enhanced trading decision notification data
 */
export interface TradingDecisionNotificationData {
  type: TradingDecisionType;
  symbol: string;
  timestamp: Date;
  
  // Basic trade information
  action?: 'BUY' | 'SELL' | 'HOLD';
  quantity?: number;
  price?: number;
  currentBalance?: number;
  
  // Enhanced analysis data
  aiReasoning: AIReasoningData;
  marketSentiment: MarketSentimentData;
  riskAssessment: RiskAssessmentData;
  pnlProjection: PnLProjectionData;
  strategyPerformance: StrategyPerformanceData;
  
  // Intel NUC system context
  systemLoad?: number;
  networkLatency?: number;
  sshTunnelStatus?: 'healthy' | 'degraded' | 'failed';
  
  // Additional context
  marketConditions: string;
  alternativeActions: Array<{
    action: string;
    reasoning: string;
    probability: number;
  }>;
  
  // Notification preferences
  priority: 'low' | 'normal' | 'high' | 'critical';
  channels: ('telegram' | 'email')[];
}

/**
 * Enhanced trading decision notifications service
 */
export class TradingDecisionNotifications {
  private telegramService: IntelNucTelegramService;
  private emailService: IntelNucEmailService;
  private isInitialized: boolean = false;
  private notificationHistory: Map<string, TradingDecisionNotificationData> = new Map();

  constructor() {
    this.telegramService = new IntelNucTelegramService();
    this.emailService = new IntelNucEmailService();
  }

  /**
   * Initialize the trading decision notifications service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🧠 Initializing enhanced trading decision notifications...');

      // Initialize underlying services
      await Promise.all([
        this.telegramService.initialize(),
        this.emailService.initialize()
      ]);

      this.isInitialized = true;
      logger.info('✅ Enhanced trading decision notifications initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize trading decision notifications:', error);
      throw error;
    }
  }

  /**
   * Send comprehensive trade execution notification with full analysis
   */
  public async notifyTradeExecution(data: TradingDecisionNotificationData): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Trading decision notifications not initialized');
    }

    try {
      logger.info(`🧠 Sending enhanced trade execution notification for ${data.symbol}`);

      // Store notification in history
      const notificationId = `${data.type}_${data.symbol}_${Date.now()}`;
      this.notificationHistory.set(notificationId, data);

      // Send through selected channels
      const promises: Promise<any>[] = [];

      if (data.channels.includes('telegram')) {
        promises.push(this.sendTelegramTradeDecision(data));
      }

      if (data.channels.includes('email')) {
        promises.push(this.sendEmailTradeDecision(data));
      }

      await Promise.allSettled(promises);
      logger.info(`✅ Enhanced trade execution notification sent for ${data.symbol}`);

    } catch (error) {
      logger.error(`❌ Failed to send enhanced trade execution notification:`, error);
      throw error;
    }
  }

  /**
   * Send notification when trade is rejected with detailed explanation
   */
  public async notifyTradeRejected(data: TradingDecisionNotificationData): Promise<void> {
    if (!this.isInitialized) return;

    try {
      logger.info(`🚫 Sending trade rejection notification for ${data.symbol}`);

      const rejectionData = {
        ...data,
        type: TradingDecisionType.TRADE_REJECTED
      };

      // Store in history
      const notificationId = `REJECTED_${data.symbol}_${Date.now()}`;
      this.notificationHistory.set(notificationId, rejectionData);

      // Send through selected channels
      const promises: Promise<any>[] = [];

      if (data.channels.includes('telegram')) {
        promises.push(this.sendTelegramTradeRejection(rejectionData));
      }

      if (data.channels.includes('email')) {
        promises.push(this.sendEmailTradeRejection(rejectionData));
      }

      await Promise.allSettled(promises);
      logger.info(`✅ Trade rejection notification sent for ${data.symbol}`);

    } catch (error) {
      logger.error(`❌ Failed to send trade rejection notification:`, error);
    }
  }

  /**
   * Send market sentiment shift notification
   */
  public async notifySentimentShift(data: {
    symbol: string;
    previousSentiment: MarketSentimentData;
    currentSentiment: MarketSentimentData;
    impact: string;
    recommendations: string[];
    timestamp: Date;
  }): Promise<void> {
    if (!this.isInitialized) return;

    try {
      logger.info(`📊 Sending sentiment shift notification for ${data.symbol}`);

      const sentimentChange = data.currentSentiment.overall - data.previousSentiment.overall;
      const changeDirection = sentimentChange > 0 ? 'positive' : 'negative';
      const changeMagnitude = Math.abs(sentimentChange);

      // Send Telegram notification
      const telegramMessage = this.formatSentimentShiftTelegram(data, changeDirection, changeMagnitude);
      await this.telegramService['sendNotificationWithRateLimit']({
        id: `sentiment_${data.symbol}_${Date.now()}`,
        type: 'SENTIMENT_SHIFT',
        priority: changeMagnitude > 0.3 ? 'high' : 'normal',
        chatId: process.env.TELEGRAM_CHAT_ID!,
        message: telegramMessage,
        parseMode: 'HTML',
        timestamp: new Date()
      });

      // Send Email notification
      await this.emailService.sendNotification({
        id: `sentiment_email_${data.symbol}_${Date.now()}`,
        type: 'MARKET_SENTIMENT_UPDATE' as any,
        priority: changeMagnitude > 0.3 ? 'high' : 'normal',
        to: [process.env.EMAIL_TO!],
        subject: `📊 Market Sentiment Shift: ${data.symbol} [Intel NUC]`,
        templateData: {
          systemName: 'AI Crypto Trading Agent - Intel NUC',
          timestamp: data.timestamp.toISOString(),
          theme: 'light',
          symbol: data.symbol,
          sentimentScore: data.currentSentiment.overall,
          description: data.impact
        },
        timestamp: new Date()
      });

      logger.info(`✅ Sentiment shift notification sent for ${data.symbol}`);

    } catch (error) {
      logger.error(`❌ Failed to send sentiment shift notification:`, error);
    }
  }

  /**
   * Send strategy performance update notification
   */
  public async notifyStrategyPerformance(data: {
    strategy: StrategyPerformanceData;
    comparison: {
      previousPeriod: StrategyPerformanceData;
      benchmark: StrategyPerformanceData;
    };
    recommendations: string[];
    timestamp: Date;
  }): Promise<void> {
    if (!this.isInitialized) return;

    try {
      logger.info(`📈 Sending strategy performance notification for ${data.strategy.strategyName}`);

      // Calculate performance changes
      const winRateChange = data.strategy.currentPerformance.winRate - data.comparison.previousPeriod.currentPerformance.winRate;
      const returnChange = data.strategy.currentPerformance.avgReturn - data.comparison.previousPeriod.currentPerformance.avgReturn;

      // Send Telegram notification
      const telegramMessage = this.formatStrategyPerformanceTelegram(data, winRateChange, returnChange);
      await this.telegramService['sendNotificationWithRateLimit']({
        id: `strategy_${data.strategy.strategyName}_${Date.now()}`,
        type: 'STRATEGY_OPTIMIZATION',
        priority: 'normal',
        chatId: process.env.TELEGRAM_CHAT_ID!,
        message: telegramMessage,
        parseMode: 'HTML',
        timestamp: new Date()
      });

      logger.info(`✅ Strategy performance notification sent for ${data.strategy.strategyName}`);

    } catch (error) {
      logger.error(`❌ Failed to send strategy performance notification:`, error);
    }
  }

  /**
   * Send Telegram trade decision notification
   */
  private async sendTelegramTradeDecision(data: TradingDecisionNotificationData): Promise<void> {
    const emoji = data.action === 'BUY' ? '🟢' : data.action === 'SELL' ? '🔴' : '⚪';
    const actionEmoji = data.action === 'BUY' ? '📈' : data.action === 'SELL' ? '📉' : '⏸️';
    const confidenceEmoji = this.getConfidenceEmoji(data.aiReasoning.confidence);
    const sentimentEmoji = this.getSentimentEmoji(data.marketSentiment.overall);
    const riskEmoji = this.getRiskEmoji(data.riskAssessment.riskLevel);

    let message = `
${emoji} <b>ENHANCED TRADE DECISION</b> ${actionEmoji} <i>[Intel NUC]</i>

🎯 <b>Symbol:</b> ${data.symbol}
⚡ <b>Action:</b> ${data.action || 'ANALYSIS'}
📊 <b>Quantity:</b> ${data.quantity || 'N/A'}
💵 <b>Price:</b> $${data.price?.toFixed(4) || 'N/A'}
💎 <b>Balance:</b> $${data.currentBalance?.toFixed(2) || 'N/A'}

🧠 <b>AI Analysis:</b>
${confidenceEmoji} <b>Confidence:</b> ${(data.aiReasoning.confidence * 100).toFixed(1)}%
${sentimentEmoji} <b>Market Sentiment:</b> ${this.formatSentimentScore(data.marketSentiment.overall)}
${riskEmoji} <b>Risk Level:</b> ${data.riskAssessment.riskLevel.toUpperCase()}
📈 <b>Expected Return:</b> ${data.pnlProjection.expectedReturn > 0 ? '+' : ''}${data.pnlProjection.expectedReturn.toFixed(2)}%

🔍 <b>Primary Factors:</b>
${data.aiReasoning.primaryFactors.map(factor => `• ${factor}`).join('\n')}

📊 <b>Technical Analysis:</b>
• 📈 <b>Trend:</b> ${data.aiReasoning.technicalAnalysis.trend.toUpperCase()}
• ⚡ <b>Momentum:</b> ${data.aiReasoning.technicalAnalysis.momentum.toUpperCase()}
• 📊 <b>Volatility:</b> ${data.aiReasoning.technicalAnalysis.volatility.toUpperCase()}
• 📈 <b>Volume:</b> ${data.aiReasoning.technicalAnalysis.volume.toUpperCase()}

💰 <b>P&L Projection:</b>
• 🎯 <b>Expected:</b> $${data.pnlProjection.expectedReturn.toFixed(2)}
• 🚀 <b>Best Case:</b> $${data.pnlProjection.bestCase.toFixed(2)}
• 📉 <b>Worst Case:</b> $${data.pnlProjection.worstCase.toFixed(2)}
• 🎲 <b>Win Probability:</b> ${(data.pnlProjection.probability.profit * 100).toFixed(1)}%

⚠️ <b>Risk Management:</b>
• 🛡️ <b>Position Size:</b> ${data.riskAssessment.positionSize.toFixed(2)}%
• 🚫 <b>Stop Loss:</b> ${data.riskAssessment.stopLossDistance.toFixed(2)}%
• 🎯 <b>Take Profit:</b> ${data.riskAssessment.takeProfitDistance.toFixed(2)}%
• ⚖️ <b>Risk/Reward:</b> 1:${data.riskAssessment.riskRewardRatio.toFixed(2)}
    `.trim();

    // Add AI reasoning
    if (data.aiReasoning.reasoning) {
      message += `\n\n🤖 <b>AI Reasoning:</b>\n<i>${this.truncateText(data.aiReasoning.reasoning, 300)}</i>`;
    }

    // Add market conditions
    if (data.marketConditions) {
      message += `\n\n🌍 <b>Market Conditions:</b>\n<i>${this.truncateText(data.marketConditions, 200)}</i>`;
    }

    // Add alternative scenarios
    if (data.aiReasoning.alternativeScenarios.length > 0) {
      message += `\n\n🔮 <b>Alternative Scenarios:</b>`;
      data.aiReasoning.alternativeScenarios.slice(0, 2).forEach(scenario => {
        message += `\n• <b>${scenario.scenario}</b> (${(scenario.probability * 100).toFixed(1)}%): ${scenario.impact}`;
      });
    }

    // Add system status
    if (data.systemLoad !== undefined) {
      const systemEmoji = this.getSystemHealthEmoji(data.systemLoad);
      const tunnelEmoji = this.getTunnelStatusEmoji(data.sshTunnelStatus || 'healthy');
      message += `\n\n🖥️ <b>System Status:</b>`;
      message += `\n${systemEmoji} <b>Load:</b> ${data.systemLoad.toFixed(1)}%`;
      message += `\n${tunnelEmoji} <b>SSH Tunnel:</b> ${(data.sshTunnelStatus || 'healthy').toUpperCase()}`;
      message += `\n🌐 <b>Latency:</b> ${data.networkLatency || 0}ms`;
    }

    message += `\n\n⏰ <i>${data.timestamp.toLocaleString()}</i>`;

    await this.telegramService['sendNotificationWithRateLimit']({
      id: `enhanced_trade_${data.symbol}_${Date.now()}`,
      type: data.type,
      priority: data.priority,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      timestamp: new Date()
    });
  }

  /**
   * Send Telegram trade rejection notification
   */
  private async sendTelegramTradeRejection(data: TradingDecisionNotificationData): Promise<void> {
    const reasonEmoji = this.getReasonEmoji(data.aiReasoning.riskFactors[0] || 'risk');
    const sentimentEmoji = this.getSentimentEmoji(data.marketSentiment.overall);

    const message = `
⏸️ <b>TRADE REJECTED</b> 🚫 <i>[Intel NUC]</i>

🎯 <b>Symbol:</b> ${data.symbol}
${reasonEmoji} <b>Primary Reason:</b> ${data.aiReasoning.riskFactors[0] || 'Risk threshold exceeded'}
${sentimentEmoji} <b>Market Sentiment:</b> ${this.formatSentimentScore(data.marketSentiment.overall)}
💸 <b>Potential P&L:</b> $${data.pnlProjection.expectedReturn.toFixed(2)}

🚫 <b>Risk Factors:</b>
${data.aiReasoning.riskFactors.map(factor => `• ${factor}`).join('\n')}

📊 <b>Market Analysis:</b>
<i>${data.marketConditions}</i>

🔮 <b>Alternative Actions:</b>
${data.alternativeActions.map(alt => `• <b>${alt.action}</b> (${(alt.probability * 100).toFixed(1)}%): ${alt.reasoning}`).join('\n')}

💡 <i>This rejection helps optimize future trading decisions and risk management.</i>

⏰ <i>${data.timestamp.toLocaleString()}</i>
    `.trim();

    await this.telegramService['sendNotificationWithRateLimit']({
      id: `rejected_trade_${data.symbol}_${Date.now()}`,
      type: data.type,
      priority: data.priority,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      timestamp: new Date()
    });
  }

  /**
   * Send email trade decision notification
   */
  private async sendEmailTradeDecision(data: TradingDecisionNotificationData): Promise<void> {
    await this.emailService.sendNotification({
      id: `enhanced_trade_email_${data.symbol}_${Date.now()}`,
      type: 'TRADE_EXECUTION' as any,
      priority: data.priority,
      to: [process.env.EMAIL_TO!],
      subject: `🧠 Enhanced Trade Decision: ${data.action} ${data.symbol} [Intel NUC]`,
      templateData: {
        systemName: 'AI Crypto Trading Agent - Intel NUC',
        timestamp: data.timestamp.toISOString(),
        theme: 'light',
        symbol: data.symbol,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        balance: data.currentBalance,
        confidence: data.aiReasoning.confidence * 100,
        sentimentScore: data.marketSentiment.overall,
        reasoning: data.aiReasoning.reasoning,
        marketAnalysis: data.marketConditions,
        riskAssessment: `Risk Level: ${data.riskAssessment.riskLevel} | Position Size: ${data.riskAssessment.positionSize}% | R/R: 1:${data.riskAssessment.riskRewardRatio}`
      },
      timestamp: new Date()
    });
  }

  /**
   * Send email trade rejection notification
   */
  private async sendEmailTradeRejection(data: TradingDecisionNotificationData): Promise<void> {
    await this.emailService.sendNotification({
      id: `rejected_trade_email_${data.symbol}_${Date.now()}`,
      type: 'TRADE_OPPORTUNITY_MISSED' as any,
      priority: data.priority,
      to: [process.env.EMAIL_TO!],
      subject: `🚫 Trade Rejected: ${data.symbol} - Risk Management [Intel NUC]`,
      templateData: {
        systemName: 'AI Crypto Trading Agent - Intel NUC',
        timestamp: data.timestamp.toISOString(),
        theme: 'light',
        symbol: data.symbol,
        reasoning: data.aiReasoning.riskFactors.join('; '),
        marketAnalysis: data.marketConditions,
        sentimentScore: data.marketSentiment.overall,
        description: `Trade rejected due to risk management protocols. Primary factors: ${data.aiReasoning.riskFactors.slice(0, 3).join(', ')}`
      },
      timestamp: new Date()
    });
  }

  /**
   * Format sentiment shift Telegram message
   */
  private formatSentimentShiftTelegram(data: any, direction: string, magnitude: number): string {
    const directionEmoji = direction === 'positive' ? '📈' : '📉';
    const magnitudeEmoji = magnitude > 0.5 ? '🚨' : magnitude > 0.3 ? '⚠️' : '📊';

    return `
${magnitudeEmoji} <b>MARKET SENTIMENT SHIFT</b> ${directionEmoji} <i>[Intel NUC]</i>

🎯 <b>Symbol:</b> ${data.symbol}
📊 <b>Sentiment Change:</b> ${direction.toUpperCase()}
📈 <b>Magnitude:</b> ${(magnitude * 100).toFixed(1)}%
🔄 <b>Previous:</b> ${this.formatSentimentScore(data.previousSentiment.overall)}
🆕 <b>Current:</b> ${this.formatSentimentScore(data.currentSentiment.overall)}

📊 <b>Breakdown:</b>
• 🐦 <b>Twitter:</b> ${this.formatSentimentScore(data.currentSentiment.twitter)}
• 📰 <b>News:</b> ${this.formatSentimentScore(data.currentSentiment.news)}
• 📈 <b>Technical:</b> ${this.formatSentimentScore(data.currentSentiment.technicalIndicators)}
• 😨 <b>Fear/Greed:</b> ${data.currentSentiment.fearGreedIndex.toFixed(0)}

💡 <b>Impact:</b>
<i>${data.impact}</i>

🎯 <b>Recommendations:</b>
${data.recommendations.map((rec: string) => `• ${rec}`).join('\n')}

⏰ <i>${data.timestamp.toLocaleString()}</i>
    `.trim();
  }

  /**
   * Format strategy performance Telegram message
   */
  private formatStrategyPerformanceTelegram(data: any, winRateChange: number, returnChange: number): string {
    const performanceEmoji = data.strategy.recentChanges.performanceTrend === 'improving' ? '📈' : 
                           data.strategy.recentChanges.performanceTrend === 'declining' ? '📉' : '⚖️';
    const winRateEmoji = winRateChange > 0 ? '📈' : winRateChange < 0 ? '📉' : '⚖️';
    const returnEmoji = returnChange > 0 ? '💰' : returnChange < 0 ? '📉' : '⚖️';

    return `
🧠 <b>STRATEGY PERFORMANCE UPDATE</b> ${performanceEmoji} <i>[Intel NUC]</i>

🎯 <b>Strategy:</b> ${data.strategy.strategyName}
📊 <b>Trend:</b> ${data.strategy.recentChanges.performanceTrend.toUpperCase()}

📈 <b>Current Performance:</b>
• ${winRateEmoji} <b>Win Rate:</b> ${data.strategy.currentPerformance.winRate.toFixed(1)}% (${winRateChange >= 0 ? '+' : ''}${winRateChange.toFixed(1)}%)
• ${returnEmoji} <b>Avg Return:</b> ${data.strategy.currentPerformance.avgReturn.toFixed(2)}% (${returnChange >= 0 ? '+' : ''}${returnChange.toFixed(2)}%)
• 📊 <b>Sharpe Ratio:</b> ${data.strategy.currentPerformance.sharpeRatio.toFixed(2)}
• 📉 <b>Max Drawdown:</b> ${data.strategy.currentPerformance.maxDrawdown.toFixed(2)}%
• 🎯 <b>Total Trades:</b> ${data.strategy.currentPerformance.totalTrades}
• 💰 <b>Profit Factor:</b> ${data.strategy.currentPerformance.profitFactor.toFixed(2)}

🎯 <b>Recommendations:</b>
${data.strategy.recommendations.map((rec: string) => `• ${rec}`).join('\n')}

🔧 <b>Optimization Suggestions:</b>
${data.strategy.optimizationSuggestions.map((sug: string) => `• ${sug}`).join('\n')}

🌍 <b>Market Suitability:</b>
<i>${data.strategy.marketConditionSuitability}</i>

⏰ <i>${data.timestamp.toLocaleString()}</i>
    `.trim();
  }

  // Helper methods
  private getConfidenceEmoji(confidence: number): string {
    if (confidence >= 0.8) return '🎯';
    if (confidence >= 0.6) return '✅';
    if (confidence >= 0.4) return '⚖️';
    return '❓';
  }

  private getSentimentEmoji(score: number): string {
    if (score >= 0.6) return '😊';
    if (score >= 0.2) return '😐';
    if (score >= -0.2) return '😕';
    return '😰';
  }

  private getRiskEmoji(riskLevel: string): string {
    switch (riskLevel) {
      case 'very_low': return '🟢';
      case 'low': return '🟡';
      case 'medium': return '🟠';
      case 'high': return '🔴';
      case 'very_high': return '🚨';
      default: return '❓';
    }
  }

  private getSystemHealthEmoji(usage: number): string {
    if (usage < 70) return '🟢';
    if (usage < 90) return '🟡';
    return '🔴';
  }

  private getTunnelStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'failed': return '🔴';
      default: return '❓';
    }
  }

  private getReasonEmoji(reason: string): string {
    if (reason.toLowerCase().includes('risk')) return '⚠️';
    if (reason.toLowerCase().includes('sentiment')) return '📊';
    if (reason.toLowerCase().includes('technical')) return '📈';
    if (reason.toLowerCase().includes('system')) return '🖥️';
    return '❓';
  }

  private formatSentimentScore(score: number): string {
    if (score >= 0.6) return 'Very Positive';
    if (score >= 0.2) return 'Positive';
    if (score >= -0.2) return 'Neutral';
    if (score >= -0.6) return 'Negative';
    return 'Very Negative';
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get notification history
   */
  public getNotificationHistory(): Map<string, TradingDecisionNotificationData> {
    return new Map(this.notificationHistory);
  }

  /**
   * Clear old notification history
   */
  public clearOldHistory(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    for (const [id, notification] of this.notificationHistory.entries()) {
      if (notification.timestamp < cutoffTime) {
        this.notificationHistory.delete(id);
      }
    }
  }

  /**
   * Get service statistics
   */
  public getStatistics(): {
    totalNotifications: number;
    notificationsByType: Record<string, number>;
    averageConfidence: number;
    riskDistribution: Record<string, number>;
  } {
    const notifications = Array.from(this.notificationHistory.values());
    const totalNotifications = notifications.length;
    
    const notificationsByType: Record<string, number> = {};
    const riskDistribution: Record<string, number> = {};
    let totalConfidence = 0;

    for (const notification of notifications) {
      // Count by type
      notificationsByType[notification.type] = (notificationsByType[notification.type] || 0) + 1;
      
      // Count by risk level
      const riskLevel = notification.riskAssessment.riskLevel;
      riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;
      
      // Sum confidence
      totalConfidence += notification.aiReasoning.confidence;
    }

    return {
      totalNotifications,
      notificationsByType,
      averageConfidence: totalNotifications > 0 ? totalConfidence / totalNotifications : 0,
      riskDistribution
    };
  }

  /**
   * Stop the service
   */
  public async stop(): Promise<void> {
    try {
      await Promise.all([
        this.telegramService.stop(),
        // Email service doesn't need explicit stop
      ]);
      
      this.isInitialized = false;
      logger.info('🛑 Trading decision notifications service stopped');
    } catch (error) {
      logger.error('❌ Error stopping trading decision notifications service:', error);
    }
  }
}

export default TradingDecisionNotifications;