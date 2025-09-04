/**
 * =============================================================================
 * EMAIL NOTIFICATION SERVICE
 * =============================================================================
 * 
 * Simple email service for sending notifications with SMTP support.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import nodemailer from 'nodemailer';
import { logger } from '@/core/logging/logger';

/**
 * Email notification types
 */
export enum EmailNotificationType {
  TRADE_EXECUTION = 'TRADE_EXECUTION',
  SECURITY_ALERT = 'SECURITY_ALERT',
  SYSTEM_STATUS = 'SYSTEM_STATUS',
  DAILY_SUMMARY = 'DAILY_SUMMARY'
}

/**
 * Email priority levels
 */
export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Email configuration interface
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Email data interface
 */
export interface EmailData {
  to: string;
  subject: string;
  message: string;
  html?: string;
  attachments?: any[];
  from?: string;
}

/**
 * Email service class
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the email service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('📧 Initializing email service...');

      // Load configuration from environment
      this.config = {
        host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
        secure: process.env.EMAIL_SMTP_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_FROM || '',
          pass: process.env.EMAIL_PASSWORD || ''
        },
        from: process.env.EMAIL_FROM || ''
      };

      if (!this.config.auth.user || !this.config.auth.pass) {
        logger.warn('⚠️ Email credentials not configured, email service will be disabled');
        return;
      }

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth
      });

      // Verify connection
      await this.transporter.verify();

      this.isInitialized = true;
      logger.info('✅ Email service initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Send email
   */
  public async sendEmail(emailData: EmailData): Promise<string> {
    if (!this.isInitialized || !this.transporter || !this.config) {
      throw new Error('Email service not initialized');
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.message,
        html: emailData.html,
        attachments: emailData.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`✅ Email sent successfully: ${result.messageId}`);
      return result.messageId;

    } catch (error) {
      logger.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Check if email service is available
   */
  public isAvailable(): boolean {
    return this.isInitialized && this.transporter !== null;
  }

  /**
   * Send notification email (alias for sendEmail)
   */
  public async sendNotification(notification: any): Promise<string> {
    const emailData: EmailData = {
      to: notification.to,
      subject: notification.subject || 'Trading Notification',
      message: notification.message || 'Trading notification',
      html: notification.html || notification.templateData?.html || 'Notification content',
      from: this.config?.auth?.user || process.env.EMAIL_FROM
    };
    
    return this.sendEmail(emailData);
  }

  /**
   * Send daily summary email
   */
  public async sendDailySummary(summaryData: any): Promise<string> {
    const subject = `📊 Daily Trading Summary - ${summaryData.date?.toDateString() || new Date().toDateString()}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">📊 Daily Trading Summary</h1>
        </div>
        
        <div style="padding: 20px; background: #f8f9fa;">
          <h2 style="color: #333;">Performance Overview</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Trades:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${summaryData.totalTrades || 0}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Win Rate:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${(summaryData.winRate || 0).toFixed(1)}%</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total P&L:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: ${(summaryData.totalPnL || 0) >= 0 ? '#28a745' : '#dc3545'};">${(summaryData.totalPnL || 0).toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Best Trade:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #28a745;">${(summaryData.bestTrade || 0).toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Worst Trade:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #dc3545;">${(summaryData.worstTrade || 0).toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Current Balance:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${(summaryData.balance || 0).toFixed(2)}</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;

    const emailData: EmailData = {
      to: process.env.NOTIFICATION_EMAIL!,
      subject,
      message: subject,
      html,
      from: this.config?.auth?.user || process.env.EMAIL_FROM
    };
    
    return this.sendEmail(emailData);
  }

  /**
   * Send basic email (alias for sendEmail with simpler interface)
   */
  public async send(emailOptions: { to: string; subject: string; html: string }): Promise<string> {
    const emailData: EmailData = {
      to: emailOptions.to,
      subject: emailOptions.subject,
      message: emailOptions.subject,
      html: emailOptions.html,
      from: this.config?.auth?.user || process.env.EMAIL_FROM
    };
    
    return this.sendEmail(emailData);
  }

  /**
   * Send security alert email
   */
  public async sendSecurityAlert(data: {
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentType: string;
    description: string;
    affectedSystems?: string[];
    timestamp?: Date;
  }): Promise<string> {
    const subject = `🚨 Security Alert: ${data.incidentType} (${data.threatLevel})`;
    const html = `
      <h2>🚨 Security Alert</h2>
      <p><strong>Threat Level:</strong> ${data.threatLevel}</p>
      <p><strong>Incident Type:</strong> ${data.incidentType}</p>
      <p><strong>Description:</strong> ${data.description}</p>
      <p><strong>Timestamp:</strong> ${data.timestamp?.toISOString() || new Date().toISOString()}</p>
    `;
    
    return this.send({
      to: process.env.EMAIL_TO || 'admin@trading-agent.com',
      subject,
      html
    });
  }

  /**
   * Send trade execution notification email
   */
  public async sendTradeExecutionNotification(data: {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    pnl?: number;
    balance?: number;
    timestamp?: Date;
  }): Promise<string> {
    const subject = `📈 Trade Executed: ${data.action} ${data.symbol}`;
    const html = `
      <h2>📈 Trade Execution</h2>
      <p><strong>Symbol:</strong> ${data.symbol}</p>
      <p><strong>Action:</strong> ${data.action}</p>
      <p><strong>Quantity:</strong> ${data.quantity}</p>
      <p><strong>Price:</strong> $${data.price}</p>
      <p><strong>Timestamp:</strong> ${data.timestamp?.toISOString() || new Date().toISOString()}</p>
    `;
    
    return this.send({
      to: process.env.EMAIL_TO || 'admin@trading-agent.com',
      subject,
      html
    });
  }

  /**
   * Get email service statistics
   */
  public getStatistics(): {
    emailsSent: number;
    isInitialized: boolean;
    isAvailable: boolean;
  } {
    return {
      emailsSent: 0, // Could be tracked with a counter
      isInitialized: this.isInitialized,
      isAvailable: this.isAvailable()
    };
  }
}

export default EmailService;