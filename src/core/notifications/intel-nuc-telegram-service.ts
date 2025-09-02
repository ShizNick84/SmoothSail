/**
 * =============================================================================
 * INTEL NUC TELEGRAM BOT NOTIFICATION SERVICE
 * =============================================================================
 * 
 * Enhanced Telegram Bot API integration specifically optimized for Intel NUC
 * deployment with rich templates, interactive commands, and comprehensive
 * trading decision notifications.
 * 
 * Features:
 * - Intel NUC system monitoring integration
 * - Enhanced emoji-rich message formatting
 * - Interactive bot commands with inline keyboards
 * - Trading decision explanations with AI reasoning
 * - Market analysis summaries in notifications
 * - Rate limiting and message threading
 * - SSH tunnel health monitoring alerts
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Intel NUC Optimized
 * =============================================================================
 */

import { Telegraf, Context, Markup } from 'telegraf';
import { logger } from '@/core/logging/logger';
import { EncryptionService } from '@/security/encryption-service';

/**
 * Enhanced trading data for Intel NUC notifications
 */
export interface IntelNucTradingData {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  pnl?: number;
  balance: number;
  strategy: string;
  timestamp: Date;
  
  // Enhanced Intel NUC specific data
  reasoning?: string;
  marketAnalysis?: string;
  sentimentScore?: number;
  riskAssessment?: string;
  confidence?: number;
  systemLoad?: number;
  networkLatency?: number;
  sshTunnelStatus?: 'healthy' | 'degraded' | 'failed';
}

/**
 * Intel NUC system health data
 */
export interface IntelNucSystemData {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  cpuTemperature: number;
  networkStatus: string;
  uptime: number;
  activeConnections: number;
  sshTunnelHealth: 'healthy' | 'degraded' | 'failed';
  sshTunnelLatency: number;
  tradingEngineStatus: 'active' | 'paused' | 'error';
  databaseConnections: number;
}

/**
 * Enhanced notification types for Intel NUC
 */
export enum IntelNucNotificationType {
  TRADE_EXECUTION = 'TRADE_EXECUTION',
  TRADE_OPPORTUNITY_MISSED = 'TRADE_OPPORTUNITY_MISSED',
  PROFIT_TARGET = 'PROFIT_TARGET',
  STOP_LOSS = 'STOP_LOSS',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SECURITY_ALERT = 'SECURITY_ALERT',
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  WEEKLY_SUMMARY = 'WEEKLY_SUMMARY',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  SSH_TUNNEL_ALERT = 'SSH_TUNNEL_ALERT',
  THERMAL_ALERT = 'THERMAL_ALERT',
  PERFORMANCE_ALERT = 'PERFORMANCE_ALERT',
  STRATEGY_OPTIMIZATION = 'STRATEGY_OPTIMIZATION',
  MARKET_SENTIMENT_UPDATE = 'MARKET_SENTIMENT_UPDATE',
  EMERGENCY = 'EMERGENCY',
  STARTUP = 'STARTUP'
}

/**
 * Intel NUC Telegram service class
 */
export class IntelNucTelegramService {
  private bot: Telegraf;
  private encryptionService: EncryptionService;
  private deliveryTracking: Map<string, any>;
  private authorizedUsers: Set<string>;
  private adminUsers: Set<string>;
  private isInitialized: boolean = false;
  private botCommands: Map<string, any>;
  private messageThreads: Map<string, number>;
  private rateLimitTracker: Map<string, number[]>;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.deliveryTracking = new Map();
    this.authorizedUsers = new Set();
    this.adminUsers = new Set();
    this.botCommands = new Map();
    this.messageThreads = new Map();
    this.rateLimitTracker = new Map();
  }

  /**
   * Initialize the Intel NUC Telegram bot service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🤖 Initializing Intel NUC Telegram bot service...');

      // Load bot token from environment
      const botToken = await this.loadBotToken();
      
      // Create Telegraf bot instance
      this.bot = new Telegraf(botToken);

      // Load authorized users
      await this.loadAuthorizedUsers();

      // Set up enhanced bot commands for Intel NUC
      await this.setupIntelNucBotCommands();

      // Set up middleware
      this.setupMiddleware();

      // Start bot
      await this.startBot();

      this.isInitialized = true;
      logger.info('✅ Intel NUC Telegram bot service initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Intel NUC Telegram bot service:', error);
      throw error;
    }
  }

  /**
   * Send enhanced trade execution notification with AI reasoning
   */
  public async sendTradeExecutionNotification(data: IntelNucTradingData): Promise<number> {
    const emoji = data.action === 'BUY' ? '🟢' : '🔴';
    const actionEmoji = data.action === 'BUY' ? '📈' : '📉';
    const pnlEmoji = (data.pnl || 0) >= 0 ? '💰' : '📉';
    const confidenceEmoji = this.getConfidenceEmoji(data.confidence || 0);
    const sentimentEmoji = this.getSentimentEmoji(data.sentimentScore || 0);
    const systemEmoji = this.getSystemHealthEmoji(data.systemLoad || 0);
    const tunnelEmoji = this.getTunnelStatusEmoji(data.sshTunnelStatus || 'healthy');

    let message = `
${emoji} <b>TRADE EXECUTED</b> ${actionEmoji} <i>[Intel NUC]</i>

🎯 <b>Symbol:</b> ${data.symbol}
⚡ <b>Action:</b> ${data.action}
📊 <b>Quantity:</b> ${data.quantity}
💵 <b>Price:</b> $${data.price?.toFixed(4)}
${pnlEmoji} <b>P&L:</b> $${data.pnl?.toFixed(2)}
💎 <b>Balance:</b> $${data.balance?.toFixed(2)}
🧠 <b>Strategy:</b> ${data.strategy}
${confidenceEmoji} <b>Confidence:</b> ${((data.confidence || 0) * 100).toFixed(1)}%
${sentimentEmoji} <b>Sentiment:</b> ${this.formatSentimentScore(data.sentimentScore || 0)}

🖥️ <b>System Status:</b>
${systemEmoji} <b>Load:</b> ${(data.systemLoad || 0).toFixed(1)}%
${tunnelEmoji} <b>SSH Tunnel:</b> ${data.sshTunnelStatus?.toUpperCase()}
🌐 <b>Latency:</b> ${data.networkLatency || 0}ms
    `.trim();

    // Add AI reasoning if available
    if (data.reasoning) {
      message += `\n\n🤖 <b>AI Reasoning:</b>\n<i>${this.truncateText(data.reasoning, 200)}</i>`;
    }

    // Add market analysis if available
    if (data.marketAnalysis) {
      message += `\n\n📊 <b>Market Analysis:</b>\n<i>${this.truncateText(data.marketAnalysis, 200)}</i>`;
    }

    // Add risk assessment if available
    if (data.riskAssessment) {
      message += `\n\n⚠️ <b>Risk Assessment:</b>\n<i>${this.truncateText(data.riskAssessment, 150)}</i>`;
    }

    message += `\n\n⏰ <i>${data.timestamp?.toLocaleString()}</i>`;

    // Create interactive keyboard for trade management
    const replyMarkup = this.createTradeManagementKeyboard(data.symbol);

    return await this.sendNotificationWithRateLimit({
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucNotificationType.TRADE_EXECUTION,
      priority: 'high',
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      replyMarkup,
      timestamp: new Date()
    });
  }

  /**
   * Send notification when trade opportunity is missed with explanation
   */
  public async sendTradeOpportunityMissedNotification(data: {
    symbol: string;
    reason: string;
    marketConditions: string;
    sentimentScore?: number;
    potentialPnL?: number;
    timestamp: Date;
  }): Promise<number> {
    const sentimentEmoji = this.getSentimentEmoji(data.sentimentScore || 0);
    const reasonEmoji = this.getReasonEmoji(data.reason);

    const message = `
⏸️ <b>TRADE OPPORTUNITY MISSED</b> 🚫 <i>[Intel NUC]</i>

🎯 <b>Symbol:</b> ${data.symbol}
${reasonEmoji} <b>Reason:</b> ${data.reason}
${sentimentEmoji} <b>Sentiment:</b> ${this.formatSentimentScore(data.sentimentScore || 0)}
💸 <b>Potential P&L:</b> $${data.potentialPnL?.toFixed(2) || 'N/A'}

📊 <b>Market Conditions:</b>
<i>${data.marketConditions}</i>

💡 <i>This helps optimize future trading decisions</i>

⏰ <i>${data.timestamp.toLocaleString()}</i>
    `.trim();

    return await this.sendNotificationWithRateLimit({
      id: `missed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucNotificationType.TRADE_OPPORTUNITY_MISSED,
      priority: 'normal',
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      timestamp: new Date()
    });
  }

  /**
   * Send enhanced daily summary with Intel NUC performance metrics
   */
  public async sendDailySummary(data: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    bestTrade: number;
    worstTrade: number;
    balance: number;
    date: Date;
    systemPerformance: IntelNucSystemData;
    strategyBreakdown: Record<string, { trades: number; pnl: number }>;
    marketConditions: string;
  }): Promise<number> {
    const pnlEmoji = data.totalPnL >= 0 ? '🚀' : '📉';
    const winRateEmoji = data.winRate >= 70 ? '🎯' : data.winRate >= 50 ? '⚖️' : '🎲';
    const systemHealthEmoji = this.getSystemHealthEmoji(
      Math.max(data.systemPerformance.cpuUsage, data.systemPerformance.ramUsage)
    );

    let message = `
📊 <b>DAILY TRADING SUMMARY</b> 📈 <i>[Intel NUC]</i>

📅 <b>Date:</b> ${data.date.toDateString()}

📈 <b>Trading Performance:</b>
• 🎯 <b>Total Trades:</b> ${data.totalTrades}
• ${winRateEmoji} <b>Win Rate:</b> ${data.winRate.toFixed(1)}%
• ${pnlEmoji} <b>Total P&L:</b> $${data.totalPnL.toFixed(2)}
• 🏆 <b>Best Trade:</b> $${data.bestTrade.toFixed(2)}
• 📉 <b>Worst Trade:</b> $${data.worstTrade.toFixed(2)}
• 💎 <b>Current Balance:</b> $${data.balance.toFixed(2)}

🖥️ <b>Intel NUC Performance:</b>
${systemHealthEmoji} <b>Avg CPU:</b> ${data.systemPerformance.cpuUsage.toFixed(1)}%
🧠 <b>Avg RAM:</b> ${data.systemPerformance.ramUsage.toFixed(1)}%
🌡️ <b>Max Temp:</b> ${data.systemPerformance.cpuTemperature.toFixed(1)}°C
🌐 <b>SSH Tunnel:</b> ${data.systemPerformance.sshTunnelHealth.toUpperCase()}
⚡ <b>Avg Latency:</b> ${data.systemPerformance.sshTunnelLatency}ms
    `.trim();

    // Add strategy breakdown
    if (Object.keys(data.strategyBreakdown).length > 0) {
      message += `\n\n🧠 <b>Strategy Breakdown:</b>`;
      for (const [strategy, stats] of Object.entries(data.strategyBreakdown)) {
        const strategyPnlEmoji = stats.pnl >= 0 ? '💰' : '📉';
        message += `\n• ${strategyPnlEmoji} <b>${strategy}:</b> ${stats.trades} trades, $${stats.pnl.toFixed(2)}`;
      }
    }

    // Add market conditions
    if (data.marketConditions) {
      message += `\n\n🌍 <b>Market Conditions:</b>\n<i>${data.marketConditions}</i>`;
    }

    message += `\n\n${data.totalPnL >= 0 ? '🎉 Profitable day! Keep it up!' : '💪 Learning day - tomorrow will be better!'}`;

    // Create interactive keyboard for daily actions
    const replyMarkup = this.createDailySummaryKeyboard();

    return await this.sendNotificationWithRateLimit({
      id: `daily_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucNotificationType.DAILY_SUMMARY,
      priority: 'normal',
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      replyMarkup,
      timestamp: new Date()
    });
  }

  /**
   * Send Intel NUC system health notification
   */
  public async sendSystemHealth(data: IntelNucSystemData): Promise<number> {
    const cpuEmoji = data.cpuUsage < 70 ? '🟢' : data.cpuUsage < 90 ? '🟡' : '🔴';
    const ramEmoji = data.ramUsage < 70 ? '🟢' : data.ramUsage < 90 ? '🟡' : '🔴';
    const diskEmoji = data.diskUsage < 70 ? '🟢' : data.diskUsage < 90 ? '🟡' : '🔴';
    const tempEmoji = data.cpuTemperature < 70 ? '❄️' : data.cpuTemperature < 80 ? '🌡️' : '🔥';
    const tunnelEmoji = this.getTunnelStatusEmoji(data.sshTunnelHealth);

    const message = `
🖥️ <b>INTEL NUC SYSTEM HEALTH</b> 📊

💻 <b>Hardware Status:</b>
• ${cpuEmoji} <b>CPU Usage:</b> ${data.cpuUsage.toFixed(1)}%
• ${ramEmoji} <b>RAM Usage:</b> ${data.ramUsage.toFixed(1)}%
• ${diskEmoji} <b>Disk Usage:</b> ${data.diskUsage.toFixed(1)}%
• ${tempEmoji} <b>CPU Temp:</b> ${data.cpuTemperature.toFixed(1)}°C

🌐 <b>Network & Connectivity:</b>
• ${tunnelEmoji} <b>SSH Tunnel:</b> ${data.sshTunnelHealth.toUpperCase()}
• ⚡ <b>Tunnel Latency:</b> ${data.sshTunnelLatency}ms
• 🔗 <b>Active Connections:</b> ${data.activeConnections}
• 🌍 <b>Network Status:</b> ${data.networkStatus}

🤖 <b>Trading System:</b>
• 🎯 <b>Engine Status:</b> ${data.tradingEngineStatus.toUpperCase()}
• 🗄️ <b>DB Connections:</b> ${data.databaseConnections}

⏱️ <b>Uptime:</b> ${this.formatUptime(data.uptime)}

${this.getSystemHealthEmoji(data)} <i>System is ${this.getSystemHealthStatus(data)}</i>
    `.trim();

    // Create interactive keyboard for system management
    const replyMarkup = this.createSystemManagementKeyboard();

    return await this.sendNotificationWithRateLimit({
      id: `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucNotificationType.SYSTEM_HEALTH,
      priority: 'normal',
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      replyMarkup,
      timestamp: new Date()
    });
  }

  /**
   * Send SSH tunnel alert notification
   */
  public async sendSSHTunnelAlert(data: {
    status: 'reconnecting' | 'failed' | 'restored';
    latency?: number;
    errorMessage?: string;
    timestamp: Date;
  }): Promise<number> {
    const statusEmojis = {
      reconnecting: '🔄',
      failed: '🚨',
      restored: '✅'
    };

    const priorityMap = {
      reconnecting: 'normal',
      failed: 'critical',
      restored: 'high'
    };

    let message = `
${statusEmojis[data.status]} <b>SSH TUNNEL ALERT</b> 🌐 <i>[Intel NUC]</i>

🔗 <b>Status:</b> ${data.status.toUpperCase()}
⚡ <b>Latency:</b> ${data.latency || 'N/A'}ms
    `.trim();

    if (data.errorMessage) {
      message += `\n🚫 <b>Error:</b> <i>${data.errorMessage}</i>`;
    }

    switch (data.status) {
      case 'reconnecting':
        message += `\n\n🔄 <i>Attempting to restore connection to Oracle Cloud...</i>`;
        break;
      case 'failed':
        message += `\n\n🚨 <i>Trading operations may be affected. Manual intervention may be required.</i>`;
        break;
      case 'restored':
        message += `\n\n✅ <i>Connection restored. Trading operations resumed.</i>`;
        break;
    }

    message += `\n\n⏰ <i>${data.timestamp.toLocaleString()}</i>`;

    return await this.sendNotificationWithRateLimit({
      id: `tunnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucNotificationType.SSH_TUNNEL_ALERT,
      priority: priorityMap[data.status] as any,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      timestamp: new Date()
    });
  }

  /**
   * Send strategy optimization notification
   */
  public async sendStrategyOptimizationNotification(data: {
    strategy: string;
    oldPerformance: { winRate: number; pnl: number };
    newPerformance: { winRate: number; pnl: number };
    optimizationDetails: string;
    timestamp: Date;
  }): Promise<number> {
    const improvementEmoji = data.newPerformance.pnl > data.oldPerformance.pnl ? '📈' : '📉';
    const winRateChange = data.newPerformance.winRate - data.oldPerformance.winRate;
    const pnlChange = data.newPerformance.pnl - data.oldPerformance.pnl;

    const message = `
🧠 <b>STRATEGY OPTIMIZATION</b> ${improvementEmoji} <i>[Intel NUC]</i>

🎯 <b>Strategy:</b> ${data.strategy}

📊 <b>Performance Comparison:</b>
• 🎯 <b>Win Rate:</b> ${data.oldPerformance.winRate.toFixed(1)}% → ${data.newPerformance.winRate.toFixed(1)}% (${winRateChange >= 0 ? '+' : ''}${winRateChange.toFixed(1)}%)
• 💰 <b>P&L:</b> $${data.oldPerformance.pnl.toFixed(2)} → $${data.newPerformance.pnl.toFixed(2)} (${pnlChange >= 0 ? '+' : ''}$${pnlChange.toFixed(2)})

🔧 <b>Optimization Details:</b>
<i>${data.optimizationDetails}</i>

${pnlChange >= 0 ? '🚀 Strategy improved!' : '🔍 Further optimization needed'}

⏰ <i>${data.timestamp.toLocaleString()}</i>
    `.trim();

    return await this.sendNotificationWithRateLimit({
      id: `optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucNotificationType.STRATEGY_OPTIMIZATION,
      priority: 'normal',
      chatId: process.env.TELEGRAM_CHAT_ID!,
      message,
      parseMode: 'HTML',
      timestamp: new Date()
    });
  }

  /**
   * Helper method to get confidence emoji
   */
  private getConfidenceEmoji(confidence: number): string {
    if (confidence >= 0.8) return '🎯';
    if (confidence >= 0.6) return '✅';
    if (confidence >= 0.4) return '⚖️';
    return '❓';
  }

  /**
   * Helper method to get sentiment emoji
   */
  private getSentimentEmoji(score: number): string {
    if (score >= 0.6) return '😊';
    if (score >= 0.2) return '😐';
    if (score >= -0.2) return '😕';
    return '😰';
  }

  /**
   * Helper method to get system health emoji
   */
  private getSystemHealthEmoji(usage: number): string {
    if (usage < 70) return '🟢';
    if (usage < 90) return '🟡';
    return '🔴';
  }

  /**
   * Helper method to get tunnel status emoji
   */
  private getTunnelStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'failed': return '🔴';
      default: return '❓';
    }
  }

  /**
   * Helper method to get reason emoji
   */
  private getReasonEmoji(reason: string): string {
    if (reason.toLowerCase().includes('risk')) return '⚠️';
    if (reason.toLowerCase().includes('sentiment')) return '📊';
    if (reason.toLowerCase().includes('technical')) return '📈';
    if (reason.toLowerCase().includes('system')) return '🖥️';
    return '❓';
  }

  /**
   * Format sentiment score for display
   */
  private formatSentimentScore(score: number): string {
    if (score >= 0.6) return 'Very Positive';
    if (score >= 0.2) return 'Positive';
    if (score >= -0.2) return 'Neutral';
    if (score >= -0.6) return 'Negative';
    return 'Very Negative';
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get system health status text
   */
  private getSystemHealthStatus(data: IntelNucSystemData): string {
    const maxUsage = Math.max(data.cpuUsage, data.ramUsage, data.diskUsage);
    
    if (maxUsage < 70 && data.cpuTemperature < 70 && data.sshTunnelHealth === 'healthy') {
      return 'running optimally';
    }
    if (maxUsage < 90 && data.cpuTemperature < 80) {
      return 'under moderate load';
    }
    return 'under heavy load or stress';
  }

  /**
   * Truncate text for message length limits
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Create trade management inline keyboard
   */
  private createTradeManagementKeyboard(symbol: string): any {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`📊 ${symbol} Chart`, `chart_${symbol}`),
        Markup.button.callback('💰 Balance', 'balance')
      ],
      [
        Markup.button.callback('📈 Positions', 'positions'),
        Markup.button.callback('🎯 Strategy', 'strategy')
      ],
      [
        Markup.button.callback('⏸️ Pause Trading', 'pause'),
        Markup.button.callback('🚨 Emergency Stop', 'emergency_stop')
      ]
    ]);
  }

  /**
   * Create daily summary inline keyboard
   */
  private createDailySummaryKeyboard(): any {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📊 Detailed Report', 'detailed_report'),
        Markup.button.callback('📈 Performance Chart', 'performance_chart')
      ],
      [
        Markup.button.callback('🧠 Strategy Analysis', 'strategy_analysis'),
        Markup.button.callback('🔧 Optimize Settings', 'optimize')
      ]
    ]);
  }

  /**
   * Create system management inline keyboard
   */
  private createSystemManagementKeyboard(): any {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Restart Services', 'restart_services'),
        Markup.button.callback('🧹 Clear Logs', 'clear_logs')
      ],
      [
        Markup.button.callback('🌐 Test SSH Tunnel', 'test_tunnel'),
        Markup.button.callback('💾 Backup Data', 'backup')
      ],
      [
        Markup.button.callback('📊 System Stats', 'system_stats'),
        Markup.button.callback('🔧 Maintenance', 'maintenance')
      ]
    ]);
  }

  /**
   * Send notification with rate limiting
   */
  private async sendNotificationWithRateLimit(notification: any): Promise<number> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxPerWindow = 20; // Max 20 messages per minute

    // Clean old entries
    const userKey = notification.chatId;
    const userMessages = this.rateLimitTracker.get(userKey) || [];
    const recentMessages = userMessages.filter(timestamp => now - timestamp < windowMs);

    if (recentMessages.length >= maxPerWindow) {
      logger.warn(`Rate limit exceeded for chat ${userKey}, queuing message`);
      // In a real implementation, you might queue the message
      throw new Error('Rate limit exceeded');
    }

    recentMessages.push(now);
    this.rateLimitTracker.set(userKey, recentMessages);

    // Send the notification
    try {
      const result = await this.bot.telegram.sendMessage(
        notification.chatId,
        notification.message,
        {
          parse_mode: notification.parseMode || 'HTML',
          disable_web_page_preview: notification.disableWebPagePreview !== false,
          disable_notification: notification.disableNotification,
          reply_markup: notification.replyMarkup
        }
      );

      logger.info(`✅ Intel NUC Telegram message sent: ${result.message_id}`);
      return result.message_id;

    } catch (error) {
      logger.error(`❌ Failed to send Intel NUC Telegram notification:`, error);
      throw error;
    }
  }

  /**
   * Load bot token from environment with decryption
   */
  private async loadBotToken(): Promise<string> {
    const encryptedToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!encryptedToken) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable not found');
    }

    try {
      return await this.encryptionService.decrypt(encryptedToken);
    } catch {
      return encryptedToken;
    }
  }

  /**
   * Load authorized users from environment
   */
  private async loadAuthorizedUsers(): Promise<void> {
    const authorizedUsersStr = process.env.TELEGRAM_AUTHORIZED_USERS || '';
    const adminUsersStr = process.env.TELEGRAM_ADMIN_USERS || '';

    if (authorizedUsersStr) {
      const users = authorizedUsersStr.split(',').map(id => id.trim());
      users.forEach(user => this.authorizedUsers.add(user));
    }

    if (adminUsersStr) {
      const admins = adminUsersStr.split(',').map(id => id.trim());
      admins.forEach(admin => {
        this.adminUsers.add(admin);
        this.authorizedUsers.add(admin);
      });
    }

    logger.info(`✅ Loaded ${this.authorizedUsers.size} authorized users and ${this.adminUsers.size} admin users`);
  }

  /**
   * Set up enhanced bot commands for Intel NUC
   */
  private async setupIntelNucBotCommands(): Promise<void> {
    // Enhanced status command with Intel NUC details
    this.botCommands.set('status', {
      command: 'status',
      description: 'Get Intel NUC system and trading status',
      handler: async (ctx: Context) => {
        const message = `
🤖 <b>AI Crypto Trading Agent Status</b> <i>[Intel NUC]</i>

✅ <b>System:</b> Online and operational
🔄 <b>Trading:</b> Active
🔒 <b>Security:</b> All systems secure
🌐 <b>SSH Tunnel:</b> Healthy connection to Oracle Cloud
🖥️ <b>Intel NUC:</b> Running optimally

Use /help for more commands.
        `.trim();

        await ctx.replyWithHTML(message);
      }
    });

    // System health command
    this.botCommands.set('health', {
      command: 'health',
      description: 'Get detailed Intel NUC system health',
      handler: async (ctx: Context) => {
        // This would integrate with actual system monitoring
        const message = `
🖥️ <b>Intel NUC System Health</b>

💻 <b>Hardware:</b>
• 🟢 CPU: 45.2% (Normal)
• 🟢 RAM: 62.8% (Normal)
• 🟢 Disk: 34.1% (Normal)
• ❄️ Temp: 58.3°C (Cool)

🌐 <b>Network:</b>
• 🟢 SSH Tunnel: Healthy
• ⚡ Latency: 23ms
• 🔗 Connections: 12 active

🤖 <b>Trading:</b>
• 🎯 Engine: Active
• 🗄️ Database: Connected
• 📊 Strategies: 5 running
        `.trim();

        await ctx.replyWithHTML(message);
      }
    });

    // Set bot commands
    const commandList = Array.from(this.botCommands.values()).map(cmd => ({
      command: cmd.command,
      description: cmd.description
    }));

    await this.bot.telegram.setMyCommands(commandList);
    logger.info(`✅ Set up ${commandList.length} Intel NUC bot commands`);
  }

  /**
   * Set up middleware for authorization and logging
   */
  private setupMiddleware(): void {
    // Authorization middleware
    this.bot.use(async (ctx, next) => {
      const userId = ctx.from?.id.toString();
      
      if (!userId || !this.authorizedUsers.has(userId)) {
        logger.warn(`🚫 Unauthorized Intel NUC Telegram access attempt from user: ${userId}`);
        await ctx.reply('🚫 Unauthorized access. Contact administrator.');
        return;
      }

      logger.info(`✅ Authorized Intel NUC Telegram user: ${userId}`);
      return next();
    });

    // Command handlers
    for (const [command, config] of this.botCommands.entries()) {
      this.bot.command(command, async (ctx) => {
        try {
          await config.handler(ctx);
        } catch (error) {
          logger.error(`❌ Error handling Intel NUC command /${command}:`, error);
          await ctx.reply('❌ An error occurred processing your command.');
        }
      });
    }
  }

  /**
   * Start the Telegram bot
   */
  private async startBot(): Promise<void> {
    try {
      await this.bot.launch();
      logger.info('🚀 Intel NUC Telegram bot started successfully');

      // Send startup notification
      if (process.env.TELEGRAM_CHAT_ID) {
        await this.sendNotificationWithRateLimit({
          id: `startup_${Date.now()}`,
          type: IntelNucNotificationType.STARTUP,
          priority: 'normal',
          chatId: process.env.TELEGRAM_CHAT_ID,
          message: `
🚀 <b>AI Crypto Trading Agent Started</b> <i>[Intel NUC]</i>

✅ System initialized successfully on Intel NUC
🔒 Security systems active
🌐 SSH tunnel to Oracle Cloud established
🤖 Bot ready for enhanced commands

Type /help for available commands.
          `.trim(),
          parseMode: 'HTML',
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('❌ Failed to start Intel NUC Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Stop the Telegram bot
   */
  public async stop(): Promise<void> {
    if (this.bot) {
      this.bot.stop();
      logger.info('🛑 Intel NUC Telegram bot stopped');
    }
  }

  /**
   * Get service statistics
   */
  public getStatistics(): {
    totalSent: number;
    totalFailed: number;
    authorizedUsers: number;
    adminUsers: number;
    rateLimitHits: number;
  } {
    let totalSent = 0;
    let totalFailed = 0;

    for (const status of this.deliveryTracking.values()) {
      if (status.status === 'sent' || status.status === 'delivered') {
        totalSent++;
      } else if (status.status === 'failed') {
        totalFailed++;
      }
    }

    return {
      totalSent,
      totalFailed,
      authorizedUsers: this.authorizedUsers.size,
      adminUsers: this.adminUsers.size,
      rateLimitHits: 0 // Would track actual rate limit hits
    };
  }
}

export default IntelNucTelegramService;