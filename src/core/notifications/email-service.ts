/**
 * =============================================================================
 * EMAIL NOTIFICATION SERVICE
 * =============================================================================
 * 
 * Implements SMTP email service with HTML formatting, delivery tracking,
 * and security features for the AI crypto trading agent.
 * 
 * Features:
 * - Rich HTML email templates
 * - Secure SMTP with authentication
 * - Delivery tracking and confirmation
 * - Email encryption and security
 * - Template-based notifications
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import nodemailer from 'nodemailer';
import { logger } from '@/core/logging/logger';
import { EncryptionService } from '@/security/encryption-service';

/**
 * Email notification types for different system events
 */
export enum EmailNotificationType {
  TRADE_EXECUTION = 'TRADE_EXECUTION',
  PROFIT_TARGET = 'PROFIT_TARGET',
  STOP_LOSS = 'STOP_LOSS',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SECURITY_ALERT = 'SECURITY_ALERT',
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  WEEKLY_SUMMARY = 'WEEKLY_SUMMARY',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  EMERGENCY = 'EMERGENCY'
}

/**
 * Email priority levels for routing and delivery
 */
export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Email notification data structure
 */
export interface EmailNotification {
  id: string;
  type: EmailNotificationType;
  priority: EmailPriority;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  templateData: Record<string, any>;
  attachments?: EmailAttachment[];
  timestamp: Date;
  retryCount?: number;
  deliveryStatus?: EmailDeliveryStatus;
}

/**
 * Email attachment structure
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  encoding?: string;
}

/**
 * Email delivery status tracking
 */
export interface EmailDeliveryStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  timestamp: Date;
  error?: string;
  retryAttempts: number;
}

/**
 * SMTP configuration interface
 */
export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

/**
 * Email template data for different notification types
 */
export interface EmailTemplateData {
  // Common fields
  systemName: string;
  timestamp: string;
  
  // Trading-specific fields
  symbol?: string;
  action?: string;
  quantity?: number;
  price?: number;
  pnl?: number;
  balance?: number;
  
  // System health fields
  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  networkStatus?: string;
  
  // Security fields
  threatLevel?: string;
  incidentType?: string;
  affectedSystems?: string[];
  
  // Performance summary fields
  totalTrades?: number;
  winRate?: number;
  totalPnL?: number;
  bestTrade?: number;
  worstTrade?: number;
}

/**
 * Email service class for handling all email notifications
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private encryptionService: EncryptionService;
  private deliveryTracking: Map<string, EmailDeliveryStatus>;
  private templates: Map<EmailNotificationType, string>;
  private isInitialized: boolean = false;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.deliveryTracking = new Map();
    this.templates = new Map();
  }

  /**
   * Initialize the email service with SMTP configuration
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('📧 Initializing email notification service...');

      // Load SMTP configuration from environment
      const smtpConfig = await this.loadSMTPConfig();
      
      // Create nodemailer transporter with security settings
      this.transporter = nodemailer.createTransporter({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
        tls: smtpConfig.tls,
        // Additional security settings
        requireTLS: true,
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
      });

      // Verify SMTP connection
      await this.verifyConnection();

      // Load email templates
      await this.loadEmailTemplates();

      this.isInitialized = true;
      logger.info('✅ Email notification service initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Send email notification with template and tracking
   */
  public async sendNotification(notification: EmailNotification): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Email service not initialized');
    }

    try {
      logger.info(`📧 Sending ${notification.type} email to ${notification.to.join(', ')}`);

      // Generate HTML content from template
      const htmlContent = await this.generateEmailContent(notification);

      // Prepare email options
      const mailOptions = {
        from: process.env.SMTP_FROM_ADDRESS,
        to: notification.to,
        cc: notification.cc,
        bcc: notification.bcc,
        subject: notification.subject,
        html: htmlContent,
        attachments: notification.attachments,
        priority: this.mapPriorityToNodemailer(notification.priority),
        headers: {
          'X-Trading-Agent': 'AI-Crypto-Trading-Agent',
          'X-Notification-Type': notification.type,
          'X-Notification-ID': notification.id
        }
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      // Track delivery status
      const deliveryStatus: EmailDeliveryStatus = {
        messageId: result.messageId,
        status: 'sent',
        timestamp: new Date(),
        retryAttempts: notification.retryCount || 0
      };

      this.deliveryTracking.set(notification.id, deliveryStatus);

      logger.info(`✅ Email sent successfully: ${result.messageId}`);
      return result.messageId;

    } catch (error) {
      logger.error(`❌ Failed to send email notification:`, error);
      
      // Update delivery status with error
      const deliveryStatus: EmailDeliveryStatus = {
        messageId: '',
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        retryAttempts: (notification.retryCount || 0) + 1
      };

      this.deliveryTracking.set(notification.id, deliveryStatus);
      throw error;
    }
  }

  /**
   * Send trade execution notification
   */
  public async sendTradeExecutionNotification(data: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    pnl?: number;
    balance: number;
    strategy: string;
    timestamp: Date;
  }): Promise<string> {
    const notification: EmailNotification = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: EmailNotificationType.TRADE_EXECUTION,
      priority: EmailPriority.HIGH,
      to: [process.env.NOTIFICATION_EMAIL!],
      subject: `🚀 Trade Executed: ${data.action} ${data.symbol}`,
      templateData: {
        systemName: 'AI Crypto Trading Agent',
        timestamp: data.timestamp.toISOString(),
        symbol: data.symbol,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        pnl: data.pnl,
        balance: data.balance,
        strategy: data.strategy
      },
      timestamp: new Date()
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send daily performance summary
   */
  public async sendDailySummary(data: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    bestTrade: number;
    worstTrade: number;
    balance: number;
    date: Date;
  }): Promise<string> {
    const notification: EmailNotification = {
      id: `daily_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: EmailNotificationType.DAILY_SUMMARY,
      priority: EmailPriority.NORMAL,
      to: [process.env.NOTIFICATION_EMAIL!],
      subject: `📊 Daily Trading Summary - ${data.date.toDateString()}`,
      templateData: {
        systemName: 'AI Crypto Trading Agent',
        timestamp: data.date.toISOString(),
        totalTrades: data.totalTrades,
        winRate: data.winRate,
        totalPnL: data.totalPnL,
        bestTrade: data.bestTrade,
        worstTrade: data.worstTrade,
        balance: data.balance
      },
      timestamp: new Date()
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send security alert notification
   */
  public async sendSecurityAlert(data: {
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentType: string;
    description: string;
    affectedSystems: string[];
    timestamp: Date;
  }): Promise<string> {
    const notification: EmailNotification = {
      id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: EmailNotificationType.SECURITY_ALERT,
      priority: data.threatLevel === 'CRITICAL' ? EmailPriority.CRITICAL : EmailPriority.HIGH,
      to: [process.env.NOTIFICATION_EMAIL!, process.env.SECURITY_EMAIL!].filter(Boolean),
      subject: `🚨 Security Alert: ${data.threatLevel} - ${data.incidentType}`,
      templateData: {
        systemName: 'AI Crypto Trading Agent',
        timestamp: data.timestamp.toISOString(),
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
   * Get delivery status for a notification
   */
  public getDeliveryStatus(notificationId: string): EmailDeliveryStatus | undefined {
    return this.deliveryTracking.get(notificationId);
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('✅ SMTP connection verified successfully');
    } catch (error) {
      logger.error('❌ SMTP connection verification failed:', error);
      throw new Error('SMTP connection failed');
    }
  }

  /**
   * Load SMTP configuration from environment variables
   */
  private async loadSMTPConfig(): Promise<SMTPConfig> {
    const requiredEnvVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM_ADDRESS'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Decrypt SMTP password if encrypted
    const smtpPass = await this.encryptionService.decrypt(process.env.SMTP_PASS!);

    return {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
      }
    };
  }

  /**
   * Load email templates for different notification types
   */
  private async loadEmailTemplates(): Promise<void> {
    // Trade execution template
    this.templates.set(EmailNotificationType.TRADE_EXECUTION, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🚀 Trade Executed</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <h2 style="color: #333;">{{action}} {{symbol}}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Symbol:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{symbol}}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Action:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{action}}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Quantity:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{quantity}}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Price:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${{price}}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>P&L:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${{pnl}}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Balance:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${{balance}}</td></tr>
          </table>
          <p style="margin-top: 20px; color: #666;">Executed at {{timestamp}}</p>
        </div>
      </div>
    `);

    // Daily summary template
    this.templates.set(EmailNotificationType.DAILY_SUMMARY, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">📊 Daily Trading Summary</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <h2 style="color: #333;">Performance Overview</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0; color: #667eea;">Total Trades</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #333;">{{totalTrades}}</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0; color: #667eea;">Win Rate</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #333;">{{winRate}}%</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0; color: #667eea;">Total P&L</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: {{#if (gt totalPnL 0)}}#28a745{{else}}#dc3545{{/if}};">${{totalPnL}}</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin: 0; color: #667eea;">Balance</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #333;">${{balance}}</p>
            </div>
          </div>
          <p style="margin-top: 20px; color: #666;">Report generated at {{timestamp}}</p>
        </div>
      </div>
    `);

    // Security alert template
    this.templates.set(EmailNotificationType.SECURITY_ALERT, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🚨 Security Alert</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0;">{{threatLevel}} Threat Detected</h2>
            <p style="color: #856404; margin: 5px 0;"><strong>Type:</strong> {{incidentType}}</p>
          </div>
          <h3 style="color: #333;">Incident Details</h3>
          <p style="color: #666;">{{description}}</p>
          <h3 style="color: #333;">Affected Systems</h3>
          <ul style="color: #666;">
            {{#each affectedSystems}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
          <p style="margin-top: 20px; color: #666;"><strong>Detected at:</strong> {{timestamp}}</p>
        </div>
      </div>
    `);

    logger.info('✅ Email templates loaded successfully');
  }

  /**
   * Generate HTML content from template and data
   */
  private async generateEmailContent(notification: EmailNotification): Promise<string> {
    const template = this.templates.get(notification.type);
    if (!template) {
      throw new Error(`No template found for notification type: ${notification.type}`);
    }

    // Simple template replacement (in production, consider using a proper template engine)
    let content = template;
    
    for (const [key, value] of Object.entries(notification.templateData)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    }

    return content;
  }

  /**
   * Map email priority to nodemailer priority
   */
  private mapPriorityToNodemailer(priority: EmailPriority): 'high' | 'normal' | 'low' {
    switch (priority) {
      case EmailPriority.CRITICAL:
      case EmailPriority.HIGH:
        return 'high';
      case EmailPriority.LOW:
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Clean up delivery tracking (remove old entries)
   */
  public cleanupDeliveryTracking(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    for (const [id, status] of this.deliveryTracking.entries()) {
      if (status.timestamp < cutoffTime) {
        this.deliveryTracking.delete(id);
      }
    }
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

    for (const status of this.deliveryTracking.values()) {
      switch (status.status) {
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
}

export default EmailService;