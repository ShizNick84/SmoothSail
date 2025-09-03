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
      this.transporter = nodemailer.createTransporter({
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
}

export default EmailService;