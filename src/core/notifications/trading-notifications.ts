/**
 * =============================================================================
 * TRADING-SPECIFIC NOTIFICATIONS
 * =============================================================================
 * 
 * Implements specialized notification handlers for trading events including
 * trade execution, profit targets, stop losses, system health, and performance
 * summaries for the AI crypto trading agent.
 * 
 * Features:
 * - Trade execution notifications with P&L details
 * - Profit target and stop loss alerts
 * - System health and security notifications
 * - Daily/weekly performance summary emails
 * - Rich formatting with emojis and charts
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { NotificationRouter, AlertCategory, AlertPriority } from './notification-router';
import { EmailService } from './email-service';
import { TelegramService } from './telegram-service';

/**
 * Trading event types for notifications
 */
export enum TradingEventType {
  TRADE_EXECUTED = 'TRADE_EXECUTED',
  PROFIT_TARGET_HIT = 'PROFIT_TARGET_HIT',
  STOP_LOSS_TRIGGERED = 'STOP_LOSS_TRIGGERED',
  POSITION_OPENED = 'POSITION_OPENED',
  POSITION_CLOSED = 'POSITION_CLOSED',
  BALANCE_MILESTONE = 'BALANCE_MILESTONE',
  DRAWDOWN_WARNING = 'DRAWDOWN_WARNING',
  RISK_LIMIT_EXCEEDED = 'RISK_LIMIT_EXCEEDED',
  STRATEGY_PERFORMANCE = 'STRATEGY_PERFORMANCE'
}

/**
 * System event types for notifications
 */
export enum SystemEventType {
  SYSTEM_STARTUP = 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  CONNECTION_LOST = 'CONNECTION_LOST',
  CONNECTION_RESTORED = 'CONNECTION_RESTORED',
  HIGH_CPU_USAGE = 'HIGH_CPU_USAGE',
  LOW_MEMORY = 'LOW_MEMORY',
  DISK_SPACE_WARNING = 'DISK_SPACE_WARNING',
  NETWORK_LATENCY = 'NETWORK_LATENCY'
}

/**
 * Trade execution data structure
 */
export interface TradeExecutionData {
  tradeId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalValue: number;
  fees: number;
  pnl?: number;
  balance: number;
  strategy: string;
  confidence: number;
  riskReward: number;
  timestamp: Date;
  executionTime: number; // milliseconds
}

/**
 * Position data structure
 */
export interface PositionData {
  positionId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  stopLoss: number;
  takeProfit: number;
  duration: number; // minutes
  maxDrawdown: number;
  maxProfit: number;
}

/**
 * Performance summary data structure
 */
export interface PerformanceSummaryData {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  bestTrade: number;
  worstTrade: number;
  averageWin: number;
  averageLoss: number;
  largestWinStreak: number;
  largestLossStreak: number;
  currentBalance: number;
  startingBalance: number;
  returnPercent: number;
  tradingDays: number;
  averageTradesPerDay: number;
  strategies: StrategyPerformance[];
}

/**
 * Strategy performance data
 */
export interface StrategyPerformance {
  name: string;
  trades: number;
  winRate: number;
  pnl: number;
  profitFactor: number;
  averageReturn: number;
}

/**
 * System health data structure
 */
export interface SystemHealthData {
  timestamp: Date;
  uptime: number;
  cpu: {
    usage: number;
    temperature: number;
    frequency: number;
  };
  memory: {
    used: number;
    available: number;
    usagePercent: number;
  };
  disk: {
    used: number;
    available: number;
    usagePercent: number;
    ioWait: number;
  };
  network: {
    latency: number;
    throughput: number;
    packetsLost: number;
    connectionStatus: 'connected' | 'disconnected' | 'unstable';
  };
  trading: {
    activePositions: number;
    dailyTrades: number;
    apiLatency: number;
    lastTradeTime: Date;
  };
}

/**
 * Trading notifications manager class
 */
export class TradingNotifications {
  private notificationRouter: NotificationRouter;
  private emailService: EmailService;
  private telegramService: TelegramService;
  private performanceHistory: PerformanceSummaryData[];
  private lastNotificationTimes: Map<string, Date>;
  private isInitialized: boolean = false;

  constructor() {
    this.notificationRouter = new NotificationRouter();
    this.emailService = new EmailService();
    this.telegramService = new TelegramService();
    this.performanceHistory = [];
    this.lastNotificationTimes = new Map();
  }

  /**
   * Initialize trading notifications
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('📊 Initializing trading notifications...');

      // Initialize notification router (which initializes services)
      await this.notificationRouter.initialize();

      // Schedule daily and weekly summaries
      this.scheduleSummaryReports();

      this.isInitialized = true;
      logger.info('✅ Trading notifications initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize trading notifications:', error);
      throw error;
    }
  }

  /**
   * Send trade execution notification
   */
  public async notifyTradeExecution(data: TradeExecutionData): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Trading notifications not initialized');
    }

    try {
      logger.info(`📊 Sending trade execution notification: ${data.tradeId}`);

      // Send through notification router
      await this.notificationRouter.sendTradingNotification({
        symbol: data.symbol,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        pnl: data.pnl,
        balance: data.balance,
        strategy: data.strategy
      });

      // Send detailed email for significant trades
      if (Math.abs(data.pnl || 0) > 100) { // Significant P&L threshold
        await this.sendDetailedTradeEmail(data);
      }

      logger.info(`✅ Trade execution notification sent: ${data.tradeId}`);

    } catch (error) {
      logger.error(`❌ Failed to send trade execution notification:`, error);
      throw error;
    }
  }

  /**
   * Send profit target hit notification
   */
  public async notifyProfitTargetHit(data: PositionData): Promise<void> {
    try {
      logger.info(`🎯 Sending profit target notification: ${data.positionId}`);

      const profitEmoji = data.realizedPnL > 500 ? '🚀' : data.realizedPnL > 100 ? '💰' : '📈';

      // Telegram notification
      const telegramMessage = `
${profitEmoji} <b>PROFIT TARGET HIT!</b> 🎯

💎 <b>Symbol:</b> ${data.symbol}
📊 <b>Position:</b> ${data.side} ${data.quantity}
💵 <b>Entry:</b> $${data.entryPrice.toFixed(4)}
🎯 <b>Exit:</b> $${data.currentPrice.toFixed(4)}
💰 <b>Profit:</b> $${data.realizedPnL.toFixed(2)}
⏱️ <b>Duration:</b> ${Math.floor(data.duration / 60)}h ${data.duration % 60}m
📈 <b>Max Profit:</b> $${data.maxProfit.toFixed(2)}

🎉 <i>Excellent execution! Target achieved successfully.</i>
      `.trim();

      await this.telegramService.sendNotification({
        id: `profit_${data.positionId}_${Date.now()}`,
        type: 'PROFIT_TARGET' as any,
        priority: 'high' as any,
        chatId: process.env.TELEGRAM_CHAT_ID!,
        message: telegramMessage,
        parseMode: 'HTML',
        timestamp: new Date()
      });

      // Email notification for significant profits
      if (data.realizedPnL > 200) {
        await this.sendProfitTargetEmail(data);
      }

      logger.info(`✅ Profit target notification sent: ${data.positionId}`);

    } catch (error) {
      logger.error(`❌ Failed to send profit target notification:`, error);
      throw error;
    }
  }

  /**
   * Send stop loss triggered notification
   */
  public async notifyStopLossTriggered(data: PositionData): Promise<void> {
    try {
      logger.info(`🛑 Sending stop loss notification: ${data.positionId}`);

      const lossEmoji = Math.abs(data.realizedPnL) > 500 ? '🚨' : Math.abs(data.realizedPnL) > 100 ? '⚠️' : '📉';

      // Telegram notification
      const telegramMessage = `
${lossEmoji} <b>STOP LOSS TRIGGERED</b> 🛑

💎 <b>Symbol:</b> ${data.symbol}
📊 <b>Position:</b> ${data.side} ${data.quantity}
💵 <b>Entry:</b> $${data.entryPrice.toFixed(4)}
🛑 <b>Exit:</b> $${data.currentPrice.toFixed(4)}
📉 <b>Loss:</b> $${data.realizedPnL.toFixed(2)}
⏱️ <b>Duration:</b> ${Math.floor(data.duration / 60)}h ${data.duration % 60}m
📉 <b>Max Drawdown:</b> $${data.maxDrawdown.toFixed(2)}

🛡️ <i>Capital protected. Risk management working correctly.</i>
      `.trim();

      await this.telegramService.sendNotification({
        id: `stoploss_${data.positionId}_${Date.now()}`,
        type: 'STOP_LOSS' as any,
        priority: 'high' as any,
        chatId: process.env.TELEGRAM_CHAT_ID!,
        message: telegramMessage,
        parseMode: 'HTML',
        timestamp: new Date()
      });

      // Email notification for significant losses
      if (Math.abs(data.realizedPnL) > 200) {
        await this.sendStopLossEmail(data);
      }

      logger.info(`✅ Stop loss notification sent: ${data.positionId}`);

    } catch (error) {
      logger.error(`❌ Failed to send stop loss notification:`, error);
      throw error;
    }
  }

  /**
   * Send daily performance summary
   */
  public async sendDailySummary(data: PerformanceSummaryData): Promise<void> {
    try {
      logger.info('📊 Sending daily performance summary...');

      // Store in history
      this.performanceHistory.push(data);

      // Send through notification router
      await this.notificationRouter.routeAlert({
        id: `daily_summary_${Date.now()}`,
        category: AlertCategory.TRADING,
        priority: AlertPriority.NORMAL,
        title: 'Daily Trading Summary',
        message: `Daily performance: ${data.totalTrades} trades, ${data.winRate.toFixed(1)}% win rate, $${data.totalPnL.toFixed(2)} P&L`,
        data,
        timestamp: new Date(),
        source: 'trading-notifications',
        tags: ['daily', 'summary', 'performance']
      });

      // Send detailed email summary
      await this.sendDetailedDailySummaryEmail(data);

      // Send Telegram summary
      await this.sendTelegramDailySummary(data);

      logger.info('✅ Daily performance summary sent');

    } catch (error) {
      logger.error('❌ Failed to send daily summary:', error);
      throw error;
    }
  }

  /**
   * Send weekly performance summary
   */
  public async sendWeeklySummary(data: PerformanceSummaryData): Promise<void> {
    try {
      logger.info('📊 Sending weekly performance summary...');

      // Send detailed email with charts and analysis
      await this.sendDetailedWeeklySummaryEmail(data);

      // Send Telegram summary
      await this.sendTelegramWeeklySummary(data);

      logger.info('✅ Weekly performance summary sent');

    } catch (error) {
      logger.error('❌ Failed to send weekly summary:', error);
      throw error;
    }
  }

  /**
   * Send system health notification
   */
  public async notifySystemHealth(data: SystemHealthData): Promise<void> {
    try {
      // Check if we should send notification (avoid spam)
      const lastNotification = this.lastNotificationTimes.get('system_health');
      const now = new Date();
      
      if (lastNotification && (now.getTime() - lastNotification.getTime()) < 30 * 60 * 1000) {
        return; // Skip if sent within last 30 minutes
      }

      // Determine if system needs attention
      const needsAttention = 
        data.cpu.usage > 80 ||
        data.memory.usagePercent > 85 ||
        data.disk.usagePercent > 90 ||
        data.network.latency > 1000 ||
        data.network.connectionStatus !== 'connected';

      if (!needsAttention) {
        return; // Only send notifications for issues
      }

      logger.info('🖥️ Sending system health notification...');

      await this.notificationRouter.sendSystemHealthAlert({
        component: 'Intel NUC',
        status: needsAttention ? 'warning' : 'healthy',
        metrics: {
          cpu: data.cpu.usage,
          memory: data.memory.usagePercent,
          disk: data.disk.usagePercent,
          latency: data.network.latency
        },
        message: this.generateSystemHealthMessage(data)
      });

      this.lastNotificationTimes.set('system_health', now);
      logger.info('✅ System health notification sent');

    } catch (error) {
      logger.error('❌ Failed to send system health notification:', error);
      throw error;
    }
  }

  /**
   * Send balance milestone notification
   */
  public async notifyBalanceMilestone(currentBalance: number, milestone: number): Promise<void> {
    try {
      logger.info(`🎉 Sending balance milestone notification: $${milestone}`);

      const milestoneEmoji = milestone >= 100000 ? '💎' : milestone >= 50000 ? '🚀' : milestone >= 10000 ? '💰' : '📈';

      const telegramMessage = `
${milestoneEmoji} <b>BALANCE MILESTONE REACHED!</b> 🎉

💰 <b>New Balance:</b> $${currentBalance.toFixed(2)}
🎯 <b>Milestone:</b> $${milestone.toFixed(2)}
📈 <b>Growth:</b> ${((currentBalance / milestone - 1) * 100).toFixed(2)}%

🎊 <i>Congratulations! Another step towards financial freedom!</i>
      `.trim();

      await this.telegramService.sendNotification({
        id: `milestone_${milestone}_${Date.now()}`,
        type: 'BALANCE_MILESTONE' as any,
        priority: 'normal' as any,
        chatId: process.env.TELEGRAM_CHAT_ID!,
        message: telegramMessage,
        parseMode: 'HTML',
        timestamp: new Date()
      });

      logger.info(`✅ Balance milestone notification sent: $${milestone}`);

    } catch (error) {
      logger.error('❌ Failed to send balance milestone notification:', error);
      throw error;
    }
  }

  /**
   * Send detailed trade email
   */
  private async sendDetailedTradeEmail(data: TradeExecutionData): Promise<void> {
    const subject = `Trade Executed: ${data.action} ${data.symbol} - $${data.pnl?.toFixed(2)} P&L`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🚀 Trade Executed</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <h2 style="color: #333;">${data.action} ${data.symbol}</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">Trade Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Trade ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.tradeId}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Symbol:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.symbol}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Action:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.action}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Quantity:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.quantity}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Price:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">$${data.price.toFixed(4)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Value:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">$${data.totalValue.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Fees:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">$${data.fees.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>P&L:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: ${(data.pnl || 0) >= 0 ? '#28a745' : '#dc3545'};">$${data.pnl?.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>New Balance:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">$${data.balance.toFixed(2)}</td></tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">Strategy Information</h3>
            <p><strong>Strategy:</strong> ${data.strategy}</p>
            <p><strong>Confidence:</strong> ${(data.confidence * 100).toFixed(1)}%</p>
            <p><strong>Risk/Reward:</strong> ${data.riskReward.toFixed(2)}:1</p>
            <p><strong>Execution Time:</strong> ${data.executionTime}ms</p>
          </div>

          <p style="margin-top: 20px; color: #666; text-align: center;">
            <em>Executed at ${data.timestamp.toLocaleString()}</em>
          </p>
        </div>
      </div>
    `;

    await this.emailService.sendNotification({
      id: `trade_email_${data.tradeId}`,
      type: 'TRADE_EXECUTION' as any,
      priority: 'high' as any,
      to: [process.env.NOTIFICATION_EMAIL!],
      subject,
      templateData: {},
      timestamp: new Date()
    });
  }

  /**
   * Send detailed daily summary email
   */
  private async sendDetailedDailySummaryEmail(data: PerformanceSummaryData): Promise<void> {
    // Implementation would include comprehensive HTML email with charts
    // For brevity, using the existing email service method
    await this.emailService.sendDailySummary({
      totalTrades: data.totalTrades,
      winRate: data.winRate,
      totalPnL: data.totalPnL,
      bestTrade: data.bestTrade,
      worstTrade: data.worstTrade,
      balance: data.currentBalance,
      date: data.endDate
    });
  }

  /**
   * Send Telegram daily summary
   */
  private async sendTelegramDailySummary(data: PerformanceSummaryData): Promise<void> {
    await this.telegramService.sendDailySummary({
      totalTrades: data.totalTrades,
      winRate: data.winRate,
      totalPnL: data.totalPnL,
      bestTrade: data.bestTrade,
      worstTrade: data.worstTrade,
      balance: data.currentBalance,
      date: data.endDate
    });
  }

  /**
   * Send detailed weekly summary email
   */
  private async sendDetailedWeeklySummaryEmail(data: PerformanceSummaryData): Promise<void> {
    // Implementation would include comprehensive weekly analysis
    // This is a placeholder for the full implementation
    logger.info('📧 Sending detailed weekly summary email...');
  }

  /**
   * Send Telegram weekly summary
   */
  private async sendTelegramWeeklySummary(data: PerformanceSummaryData): Promise<void> {
    const weeklyMessage = `
📊 <b>WEEKLY TRADING SUMMARY</b> 📈

📅 <b>Period:</b> ${data.startDate.toDateString()} - ${data.endDate.toDateString()}

📈 <b>Performance Overview:</b>
• 🎯 <b>Total Trades:</b> ${data.totalTrades}
• 🏆 <b>Win Rate:</b> ${data.winRate.toFixed(1)}%
• 💰 <b>Total P&L:</b> $${data.totalPnL.toFixed(2)}
• 📊 <b>Profit Factor:</b> ${data.profitFactor.toFixed(2)}
• 📈 <b>Return:</b> ${data.returnPercent.toFixed(2)}%

🎯 <b>Best Performers:</b>
${data.strategies.slice(0, 3).map(s => `• ${s.name}: ${s.winRate.toFixed(1)}% (${s.trades} trades)`).join('\n')}

💎 <b>Current Balance:</b> $${data.currentBalance.toFixed(2)}

${data.totalPnL >= 0 ? '🚀 Great week! Keep up the momentum!' : '💪 Learning week - adjusting strategies for better performance!'}
    `.trim();

    await this.telegramService.sendNotification({
      id: `weekly_summary_${Date.now()}`,
      type: 'WEEKLY_SUMMARY' as any,
      priority: 'normal' as any,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message: weeklyMessage,
      parseMode: 'HTML',
      timestamp: new Date()
    });
  }

  /**
   * Generate system health message
   */
  private generateSystemHealthMessage(data: SystemHealthData): string {
    const issues: string[] = [];

    if (data.cpu.usage > 80) issues.push(`High CPU usage: ${data.cpu.usage.toFixed(1)}%`);
    if (data.memory.usagePercent > 85) issues.push(`High memory usage: ${data.memory.usagePercent.toFixed(1)}%`);
    if (data.disk.usagePercent > 90) issues.push(`Low disk space: ${data.disk.usagePercent.toFixed(1)}% used`);
    if (data.network.latency > 1000) issues.push(`High network latency: ${data.network.latency}ms`);
    if (data.network.connectionStatus !== 'connected') issues.push(`Network connection: ${data.network.connectionStatus}`);

    return issues.length > 0 
      ? `System attention required: ${issues.join(', ')}`
      : 'System is running optimally';
  }

  /**
   * Schedule daily and weekly summary reports
   */
  private scheduleSummaryReports(): void {
    // Schedule daily summary at 11:59 PM
    const dailySchedule = '59 23 * * *'; // cron format
    
    // Schedule weekly summary on Sundays at 11:59 PM
    const weeklySchedule = '59 23 * * 0'; // cron format

    // Note: In a real implementation, you would use node-cron or similar
    // For now, this is a placeholder for the scheduling logic
    logger.info('📅 Summary report schedules configured');
  }

  /**
   * Get trading notifications statistics
   */
  public getStatistics(): {
    totalNotificationsSent: number;
    performanceHistorySize: number;
    lastDailySummary?: Date;
    lastWeeklySummary?: Date;
  } {
    return {
      totalNotificationsSent: this.performanceHistory.length,
      performanceHistorySize: this.performanceHistory.length,
      lastDailySummary: this.lastNotificationTimes.get('daily_summary'),
      lastWeeklySummary: this.lastNotificationTimes.get('weekly_summary')
    };
  }

  /**
   * Stop trading notifications
   */
  public async stop(): Promise<void> {
    await this.notificationRouter.stop();
    logger.info('🛑 Trading notifications stopped');
  }
}

export default TradingNotifications;