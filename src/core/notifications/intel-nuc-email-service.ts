/**
 * =============================================================================
 * INTEL NUC EMAIL NOTIFICATION SERVICE
 * =============================================================================
 * 
 * Enhanced SMTP email service specifically optimized for Intel NUC deployment
 * with professional HTML templates, responsive design, and comprehensive
 * trading analytics integration.
 * 
 * Features:
 * - Professional HTML email templates with responsive design
 * - Intel NUC system monitoring integration
 * - Trading performance charts and visualizations
 * - Dark/light theme support
 * - Comprehensive delivery tracking and confirmation
 * - Email security with DKIM and SPF support
 * - Backup notification mechanisms
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Intel NUC Optimized
 * =============================================================================
 */

import nodemailer from 'nodemailer';
import { logger } from '@/core/logging/logger';
import { EncryptionService } from '@/security/encryption-service';

/**
 * Enhanced email notification types for Intel NUC
 */
export enum IntelNucEmailType {
  TRADE_EXECUTION = 'TRADE_EXECUTION',
  TRADE_OPPORTUNITY_MISSED = 'TRADE_OPPORTUNITY_MISSED',
  PROFIT_TARGET = 'PROFIT_TARGET',
  STOP_LOSS = 'STOP_LOSS',
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  WEEKLY_SUMMARY = 'WEEKLY_SUMMARY',
  MONTHLY_SUMMARY = 'MONTHLY_SUMMARY',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  SECURITY_ALERT = 'SECURITY_ALERT',
  SSH_TUNNEL_ALERT = 'SSH_TUNNEL_ALERT',
  THERMAL_ALERT = 'THERMAL_ALERT',
  PERFORMANCE_ALERT = 'PERFORMANCE_ALERT',
  STRATEGY_OPTIMIZATION = 'STRATEGY_OPTIMIZATION',
  BACKUP_NOTIFICATION = 'BACKUP_NOTIFICATION',
  EMERGENCY = 'EMERGENCY'
}

/**
 * Enhanced email template data for Intel NUC
 */
export interface IntelNucEmailTemplateData {
  // Common fields
  systemName: string;
  timestamp: string;
  theme: 'light' | 'dark';
  
  // Trading-specific fields
  symbol?: string;
  action?: 'BUY' | 'SELL';
  quantity?: number;
  price?: number;
  pnl?: number;
  balance?: number;
  strategy?: string;
  confidence?: number;
  sentimentScore?: number;
  reasoning?: string;
  marketAnalysis?: string;
  riskAssessment?: string;
  
  // Intel NUC system fields
  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  cpuTemperature?: number;
  networkStatus?: string;
  sshTunnelHealth?: 'healthy' | 'degraded' | 'failed';
  sshTunnelLatency?: number;
  uptime?: number;
  
  // Performance summary fields
  totalTrades?: number;
  winRate?: number;
  totalPnL?: number;
  bestTrade?: number;
  worstTrade?: number;
  strategyBreakdown?: Record<string, { trades: number; pnl: number }>;
  marketConditions?: string;
  
  // Security fields
  threatLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  incidentType?: string;
  affectedSystems?: string[];
  description?: string;
  
  // Charts and visualizations
  performanceChart?: string; // Base64 encoded chart image
  systemHealthChart?: string;
  strategyComparisonChart?: string;
}

/**
 * Email notification structure for Intel NUC
 */
export interface IntelNucEmailNotification {
  id: string;
  type: IntelNucEmailType;
  priority: 'low' | 'normal' | 'high' | 'critical';
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  templateData: IntelNucEmailTemplateData;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType: string;
  }>;
  timestamp: Date;
  deliveryStatus?: {
    messageId: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
    timestamp: Date;
    error?: string;
  };
}

/**
 * Intel NUC Email service class
 */
export class IntelNucEmailService {
  private transporter: nodemailer.Transporter;
  private encryptionService: EncryptionService;
  private deliveryTracking: Map<string, any>;
  private templates: Map<IntelNucEmailType, string>;
  private isInitialized: boolean = false;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.deliveryTracking = new Map();
    this.templates = new Map();
  }

  /**
   * Initialize the Intel NUC email service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('📧 Initializing Intel NUC email notification service...');

      // Load SMTP configuration from environment
      const smtpConfig = await this.loadSMTPConfig();
      
      // Create nodemailer transporter with enhanced security
      this.transporter = nodemailer.createTransporter({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
        tls: smtpConfig.tls,
        // Enhanced security settings for Intel NUC
        requireTLS: true,
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        dkim: {
          domainName: process.env.EMAIL_DKIM_DOMAIN || 'localhost',
          keySelector: process.env.EMAIL_DKIM_SELECTOR || 'default',
          privateKey: process.env.EMAIL_DKIM_PRIVATE_KEY || ''
        }
      });

      // Verify SMTP connection
      await this.verifyConnection();

      // Load enhanced email templates
      await this.loadIntelNucEmailTemplates();

      this.isInitialized = true;
      logger.info('✅ Intel NUC email notification service initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Intel NUC email service:', error);
      throw error;
    }
  }

  /**
   * Send enhanced trade execution notification
   */
  public async sendTradeExecutionNotification(data: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    pnl?: number;
    balance: number;
    strategy: string;
    confidence?: number;
    sentimentScore?: number;
    reasoning?: string;
    marketAnalysis?: string;
    riskAssessment?: string;
    timestamp: Date;
  }): Promise<string> {
    const notification: IntelNucEmailNotification = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucEmailType.TRADE_EXECUTION,
      priority: 'high',
      to: [process.env.EMAIL_TO!],
      subject: `🚀 Trade Executed: ${data.action} ${data.symbol} [Intel NUC]`,
      templateData: {
        systemName: 'AI Crypto Trading Agent - Intel NUC',
        timestamp: data.timestamp.toISOString(),
        theme: 'light',
        symbol: data.symbol,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        pnl: data.pnl,
        balance: data.balance,
        strategy: data.strategy,
        confidence: data.confidence,
        sentimentScore: data.sentimentScore,
        reasoning: data.reasoning,
        marketAnalysis: data.marketAnalysis,
        riskAssessment: data.riskAssessment
      },
      timestamp: new Date()
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send comprehensive daily summary with Intel NUC metrics
   */
  public async sendDailySummary(data: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    bestTrade: number;
    worstTrade: number;
    balance: number;
    date: Date;
    systemPerformance: {
      cpuUsage: number;
      ramUsage: number;
      diskUsage: number;
      cpuTemperature: number;
      sshTunnelHealth: 'healthy' | 'degraded' | 'failed';
      sshTunnelLatency: number;
      uptime: number;
    };
    strategyBreakdown: Record<string, { trades: number; pnl: number }>;
    marketConditions: string;
    performanceChart?: string;
  }): Promise<string> {
    const notification: IntelNucEmailNotification = {
      id: `daily_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucEmailType.DAILY_SUMMARY,
      priority: 'normal',
      to: [process.env.EMAIL_TO!],
      subject: `📊 Daily Trading Summary - ${data.date.toDateString()} [Intel NUC]`,
      templateData: {
        systemName: 'AI Crypto Trading Agent - Intel NUC',
        timestamp: data.date.toISOString(),
        theme: 'light',
        totalTrades: data.totalTrades,
        winRate: data.winRate,
        totalPnL: data.totalPnL,
        bestTrade: data.bestTrade,
        worstTrade: data.worstTrade,
        balance: data.balance,
        cpuUsage: data.systemPerformance.cpuUsage,
        ramUsage: data.systemPerformance.ramUsage,
        diskUsage: data.systemPerformance.diskUsage,
        cpuTemperature: data.systemPerformance.cpuTemperature,
        sshTunnelHealth: data.systemPerformance.sshTunnelHealth,
        sshTunnelLatency: data.systemPerformance.sshTunnelLatency,
        uptime: data.systemPerformance.uptime,
        strategyBreakdown: data.strategyBreakdown,
        marketConditions: data.marketConditions,
        performanceChart: data.performanceChart
      },
      timestamp: new Date()
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send Intel NUC system health notification
   */
  public async sendSystemHealthNotification(data: {
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;
    cpuTemperature: number;
    networkStatus: string;
    sshTunnelHealth: 'healthy' | 'degraded' | 'failed';
    sshTunnelLatency: number;
    uptime: number;
    timestamp: Date;
  }): Promise<string> {
    const notification: IntelNucEmailNotification = {
      id: `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucEmailType.SYSTEM_HEALTH,
      priority: 'normal',
      to: [process.env.EMAIL_TO!],
      subject: `🖥️ Intel NUC System Health Report`,
      templateData: {
        systemName: 'AI Crypto Trading Agent - Intel NUC',
        timestamp: data.timestamp.toISOString(),
        theme: 'light',
        cpuUsage: data.cpuUsage,
        ramUsage: data.ramUsage,
        diskUsage: data.diskUsage,
        cpuTemperature: data.cpuTemperature,
        networkStatus: data.networkStatus,
        sshTunnelHealth: data.sshTunnelHealth,
        sshTunnelLatency: data.sshTunnelLatency,
        uptime: data.uptime
      },
      timestamp: new Date()
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send security alert with enhanced formatting
   */
  public async sendSecurityAlert(data: {
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentType: string;
    description: string;
    affectedSystems: string[];
    timestamp: Date;
  }): Promise<string> {
    const notification: IntelNucEmailNotification = {
      id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: IntelNucEmailType.SECURITY_ALERT,
      priority: data.threatLevel === 'CRITICAL' ? 'critical' : 'high',
      to: [process.env.EMAIL_TO!, process.env.SECURITY_EMAIL!].filter(Boolean),
      subject: `🚨 Security Alert: ${data.threatLevel} - ${data.incidentType} [Intel NUC]`,
      templateData: {
        systemName: 'AI Crypto Trading Agent - Intel NUC',
        timestamp: data.timestamp.toISOString(),
        theme: 'dark', // Use dark theme for security alerts
        threatLevel: data.threatLevel,
        incidentType: data.incidentType,
        description: data.description,
        affectedSystems: data.affectedSystems
      },
      timestamp: new Date()
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send notification with enhanced delivery tracking
   */
  public async sendNotification(notification: IntelNucEmailNotification): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Intel NUC email service not initialized');
    }

    try {
      logger.info(`📧 Sending ${notification.type} email to ${notification.to.join(', ')}`);

      // Generate HTML content from template
      const htmlContent = await this.generateEmailContent(notification);

      // Prepare email options with enhanced headers
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: notification.to,
        cc: notification.cc,
        bcc: notification.bcc,
        subject: notification.subject,
        html: htmlContent,
        attachments: notification.attachments,
        priority: this.mapPriorityToNodemailer(notification.priority),
        headers: {
          'X-Trading-Agent': 'AI-Crypto-Trading-Agent-Intel-NUC',
          'X-Notification-Type': notification.type,
          'X-Notification-ID': notification.id,
          'X-System-Source': 'Intel-NUC',
          'X-Mailer': 'Intel-NUC-Trading-Agent-v2.0'
        }
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      // Track delivery status
      const deliveryStatus = {
        messageId: result.messageId,
        status: 'sent' as const,
        timestamp: new Date()
      };

      notification.deliveryStatus = deliveryStatus;
      this.deliveryTracking.set(notification.id, notification);

      logger.info(`✅ Intel NUC email sent successfully: ${result.messageId}`);
      return result.messageId;

    } catch (error) {
      logger.error(`❌ Failed to send Intel NUC email notification:`, error);
      
      // Update delivery status with error
      const deliveryStatus = {
        messageId: '',
        status: 'failed' as const,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      notification.deliveryStatus = deliveryStatus;
      this.deliveryTracking.set(notification.id, notification);
      throw error;
    }
  }

  /**
   * Load enhanced email templates for Intel NUC
   */
  private async loadIntelNucEmailTemplates(): Promise<void> {
    // Enhanced trade execution template
    this.templates.set(IntelNucEmailType.TRADE_EXECUTION, `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trade Executed - Intel NUC</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .header .subtitle { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 30px; }
          .trade-summary { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .trade-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
          .trade-row:last-child { border-bottom: none; }
          .trade-label { font-weight: 600; color: #495057; }
          .trade-value { color: #212529; font-weight: 500; }
          .pnl-positive { color: #28a745; font-weight: bold; }
          .pnl-negative { color: #dc3545; font-weight: bold; }
          .section { margin: 25px 0; }
          .section-title { font-size: 18px; font-weight: 600; color: #343a40; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
          .reasoning-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .market-analysis { background: #f3e5f5; border-left: 4px solid #9c27b0; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .risk-assessment { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .footer { background: #343a40; color: white; padding: 20px; text-align: center; font-size: 12px; }
          .confidence-bar { width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin: 5px 0; }
          .confidence-fill { height: 100%; background: linear-gradient(90deg, #dc3545, #ffc107, #28a745); transition: width 0.3s ease; }
          @media (max-width: 600px) {
            .container { margin: 0; box-shadow: none; }
            .content { padding: 20px; }
            .trade-row { flex-direction: column; align-items: flex-start; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Trade Executed</h1>
            <div class="subtitle">{{systemName}} • {{timestamp}}</div>
          </div>
          
          <div class="content">
            <div class="trade-summary">
              <div class="trade-row">
                <span class="trade-label">🎯 Symbol:</span>
                <span class="trade-value">{{symbol}}</span>
              </div>
              <div class="trade-row">
                <span class="trade-label">⚡ Action:</span>
                <span class="trade-value">{{action}}</span>
              </div>
              <div class="trade-row">
                <span class="trade-label">📊 Quantity:</span>
                <span class="trade-value">{{quantity}}</span>
              </div>
              <div class="trade-row">
                <span class="trade-label">💵 Price:</span>
                <span class="trade-value">${{price}}</span>
              </div>
              <div class="trade-row">
                <span class="trade-label">💰 P&L:</span>
                <span class="trade-value {{#if (gt pnl 0)}}pnl-positive{{else}}pnl-negative{{/if}}">${{pnl}}</span>
              </div>
              <div class="trade-row">
                <span class="trade-label">💎 Balance:</span>
                <span class="trade-value">${{balance}}</span>
              </div>
              <div class="trade-row">
                <span class="trade-label">🧠 Strategy:</span>
                <span class="trade-value">{{strategy}}</span>
              </div>
              {{#if confidence}}
              <div class="trade-row">
                <span class="trade-label">🎯 Confidence:</span>
                <div style="flex: 1; margin-left: 20px;">
                  <div class="confidence-bar">
                    <div class="confidence-fill" style="width: {{confidence}}%;"></div>
                  </div>
                  <span class="trade-value">{{confidence}}%</span>
                </div>
              </div>
              {{/if}}
            </div>

            {{#if reasoning}}
            <div class="section">
              <div class="section-title">🤖 AI Reasoning</div>
              <div class="reasoning-box">{{reasoning}}</div>
            </div>
            {{/if}}

            {{#if marketAnalysis}}
            <div class="section">
              <div class="section-title">📊 Market Analysis</div>
              <div class="market-analysis">{{marketAnalysis}}</div>
            </div>
            {{/if}}

            {{#if riskAssessment}}
            <div class="section">
              <div class="section-title">⚠️ Risk Assessment</div>
              <div class="risk-assessment">{{riskAssessment}}</div>
            </div>
            {{/if}}
          </div>
          
          <div class="footer">
            <p>🖥️ Generated by Intel NUC Trading System</p>
            <p>This is an automated notification from your AI crypto trading agent.</p>
          </div>
        </div>
      </body>
      </html>
    `);

    // Enhanced daily summary template
    this.templates.set(IntelNucEmailType.DAILY_SUMMARY, `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Trading Summary - Intel NUC</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 700px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .content { padding: 30px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
          .metric-card { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #667eea; }
          .metric-value { font-size: 24px; font-weight: bold; color: #343a40; margin: 5px 0; }
          .metric-label { font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px; }
          .system-health { background: #e8f5e8; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .health-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
          .strategy-breakdown { margin: 20px 0; }
          .strategy-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; margin: 5px 0; border-radius: 4px; }
          .footer { background: #343a40; color: white; padding: 20px; text-align: center; font-size: 12px; }
          .positive { color: #28a745; }
          .negative { color: #dc3545; }
          @media (max-width: 600px) {
            .metrics-grid { grid-template-columns: 1fr 1fr; }
            .content { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Trading Summary</h1>
            <div class="subtitle">{{systemName}} • {{timestamp}}</div>
          </div>
          
          <div class="content">
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">{{totalTrades}}</div>
                <div class="metric-label">🎯 Total Trades</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">{{winRate}}%</div>
                <div class="metric-label">🏆 Win Rate</div>
              </div>
              <div class="metric-card">
                <div class="metric-value {{#if (gt totalPnL 0)}}positive{{else}}negative{{/if}}">${{totalPnL}}</div>
                <div class="metric-label">💰 Total P&L</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${{balance}}</div>
                <div class="metric-label">💎 Balance</div>
              </div>
            </div>

            <div class="system-health">
              <h3>🖥️ Intel NUC System Performance</h3>
              <div class="health-row">
                <span>💻 CPU Usage:</span>
                <span>{{cpuUsage}}%</span>
              </div>
              <div class="health-row">
                <span>🧠 RAM Usage:</span>
                <span>{{ramUsage}}%</span>
              </div>
              <div class="health-row">
                <span>💾 Disk Usage:</span>
                <span>{{diskUsage}}%</span>
              </div>
              <div class="health-row">
                <span>🌡️ CPU Temperature:</span>
                <span>{{cpuTemperature}}°C</span>
              </div>
              <div class="health-row">
                <span>🌐 SSH Tunnel:</span>
                <span>{{sshTunnelHealth}} ({{sshTunnelLatency}}ms)</span>
              </div>
            </div>

            {{#if strategyBreakdown}}
            <div class="strategy-breakdown">
              <h3>🧠 Strategy Performance</h3>
              {{#each strategyBreakdown}}
              <div class="strategy-item">
                <span>{{@key}}</span>
                <span>{{this.trades}} trades • <span class="positive">{{this.pnl}}</span></span>
              </div>
              {{/each}}
            </div>
            {{/if}}

            {{#if marketConditions}}
            <div class="section">
              <h3>🌍 Market Conditions</h3>
              <p>{{marketConditions}}</p>
            </div>
            {{/if}}
          </div>
          
          <div class="footer">
            <p>🖥️ Generated by Intel NUC Trading System</p>
            <p>Daily performance report • Uptime: {{uptime}} seconds</p>
          </div>
        </div>
      </body>
      </html>
    `);

    // Security alert template with dark theme
    this.templates.set(IntelNucEmailType.SECURITY_ALERT, `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Alert - Intel NUC</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #1a1a1a; color: #ffffff; }
          .container { max-width: 600px; margin: 0 auto; background-color: #2d2d2d; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .content { padding: 30px; }
          .alert-box { background: #3d1a1a; border: 1px solid #ff6b6b; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .threat-level { font-size: 24px; font-weight: bold; text-align: center; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .threat-critical { background: #721c24; color: #f8d7da; }
          .threat-high { background: #856404; color: #fff3cd; }
          .threat-medium { background: #664d03; color: #fff3cd; }
          .threat-low { background: #155724; color: #d4edda; }
          .details { background: #404040; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .footer { background: #1a1a1a; color: #cccccc; padding: 20px; text-align: center; font-size: 12px; }
          .affected-systems { list-style: none; padding: 0; }
          .affected-systems li { background: #404040; margin: 5px 0; padding: 10px; border-radius: 4px; border-left: 4px solid #ff6b6b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Security Alert</h1>
            <div class="subtitle">{{systemName}} • {{timestamp}}</div>
          </div>
          
          <div class="content">
            <div class="threat-level threat-{{threatLevel}}">
              {{threatLevel}} THREAT DETECTED
            </div>

            <div class="alert-box">
              <h3>🎯 Incident Type: {{incidentType}}</h3>
              <div class="details">
                <p>{{description}}</p>
              </div>
            </div>

            {{#if affectedSystems}}
            <div class="section">
              <h3>🖥️ Affected Systems</h3>
              <ul class="affected-systems">
                {{#each affectedSystems}}
                <li>{{this}}</li>
                {{/each}}
              </ul>
            </div>
            {{/if}}

            <div class="alert-box">
              <p><strong>⚠️ Immediate Action Required:</strong></p>
              <ul>
                <li>Review system logs for additional details</li>
                <li>Verify all trading operations are secure</li>
                <li>Check Intel NUC system integrity</li>
                <li>Monitor SSH tunnel connections</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>🖥️ Intel NUC Security Monitoring System</p>
            <p>This is an automated security alert. Take immediate action if required.</p>
          </div>
        </div>
      </body>
      </html>
    `);

    logger.info('✅ Intel NUC email templates loaded successfully');
  }

  /**
   * Generate HTML content from template and data
   */
  private async generateEmailContent(notification: IntelNucEmailNotification): Promise<string> {
    const template = this.templates.get(notification.type);
    if (!template) {
      throw new Error(`No template found for notification type: ${notification.type}`);
    }

    // Enhanced template replacement with helper functions
    let content = template;
    
    // Replace simple variables
    for (const [key, value] of Object.entries(notification.templateData)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value || ''));
    }

    // Handle conditional blocks and loops (simplified implementation)
    content = this.processConditionals(content, notification.templateData);
    content = this.processLoops(content, notification.templateData);

    return content;
  }

  /**
   * Process conditional blocks in templates
   */
  private processConditionals(content: string, data: IntelNucEmailTemplateData): string {
    // Simple conditional processing for {{#if variable}}...{{/if}}
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    
    return content.replace(ifRegex, (match, variable, block) => {
      const value = (data as any)[variable];
      return value ? block : '';
    });
  }

  /**
   * Process loop blocks in templates
   */
  private processLoops(content: string, data: IntelNucEmailTemplateData): string {
    // Simple loop processing for {{#each array}}...{{/each}}
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    return content.replace(eachRegex, (match, variable, block) => {
      const array = (data as any)[variable];
      if (!array || typeof array !== 'object') return '';
      
      let result = '';
      for (const [key, value] of Object.entries(array)) {
        let itemBlock = block;
        itemBlock = itemBlock.replace(/{{@key}}/g, key);
        itemBlock = itemBlock.replace(/{{this\.(\w+)}}/g, (m, prop) => {
          return String((value as any)[prop] || '');
        });
        result += itemBlock;
      }
      return result;
    });
  }

  /**
   * Load SMTP configuration from environment variables
   */
  private async loadSMTPConfig(): Promise<any> {
    const requiredEnvVars = [
      'EMAIL_SMTP_HOST',
      'EMAIL_SMTP_PORT',
      'EMAIL_FROM',
      'EMAIL_PASSWORD',
      'EMAIL_TO'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Decrypt SMTP password if encrypted
    let smtpPass = process.env.EMAIL_PASSWORD!;
    try {
      smtpPass = await this.encryptionService.decrypt(smtpPass);
    } catch {
      // If decryption fails, assume it's already plain text
    }

    return {
      host: process.env.EMAIL_SMTP_HOST!,
      port: parseInt(process.env.EMAIL_SMTP_PORT!),
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_FROM!,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false'
      }
    };
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('✅ Intel NUC SMTP connection verified successfully');
    } catch (error) {
      logger.error('❌ Intel NUC SMTP connection verification failed:', error);
      throw new Error('SMTP connection failed');
    }
  }

  /**
   * Map email priority to nodemailer priority
   */
  private mapPriorityToNodemailer(priority: string): 'high' | 'normal' | 'low' {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Get delivery status for a notification
   */
  public getDeliveryStatus(notificationId: string): any {
    return this.deliveryTracking.get(notificationId);
  }

  /**
   * Get email service statistics
   */
  public getStatistics(): {
    totalSent: number;
    totalFailed: number;
    pendingDeliveries: number;
  } {
    let totalSent = 0;
    let totalFailed = 0;
    let pendingDeliveries = 0;

    for (const notification of this.deliveryTracking.values()) {
      const status = notification.deliveryStatus?.status;
      switch (status) {
        case 'sent':
        case 'delivered':
          totalSent++;
          break;
        case 'failed':
        case 'bounced':
          totalFailed++;
          break;
        case 'pending':
          pendingDeliveries++;
          break;
      }
    }

    return { totalSent, totalFailed, pendingDeliveries };
  }

  /**
   * Clean up old delivery tracking entries
   */
  public cleanupDeliveryTracking(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    for (const [id, notification] of this.deliveryTracking.entries()) {
      if (notification.timestamp < cutoffTime) {
        this.deliveryTracking.delete(id);
      }
    }
  }
}

export default IntelNucEmailService;