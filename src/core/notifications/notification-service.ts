/**
 * Notification Service
 * 
 * Central notification service for the AI crypto trading agent.
 * Handles email, Telegram, and other notification channels.
 */

import { Logger } from '../logging/logger';

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };
  telegram?: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
}

export interface Notification {
  title: string;
  message: string;
  details?: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  errorId?: string;
}

export interface HighPriorityAlert {
  title: string;
  message: string;
  details?: any;
  errorId?: string;
  priority?: 'HIGH' | 'CRITICAL';
}

export interface CriticalAlert {
  title: string;
  message: string;
  details?: any;
  errorId?: string;
  priority?: 'CRITICAL';
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export class NotificationService {
  private logger: Logger;
  private config: NotificationConfig;

  constructor(logger?: Logger, config?: NotificationConfig) {
    this.logger = logger || new Logger('NotificationService');
    this.config = config || {
      email: { enabled: false, smtp: { host: '', port: 587, secure: false, auth: { user: '', pass: '' } } },
      telegram: { enabled: false, botToken: '', chatId: '' }
    };
  }

  async sendAlert(notification: Notification): Promise<void> {
    this.logger.info('Sending alert notification', {
      title: notification.title,
      priority: notification.priority
    });

    // Mock implementation for testing
    return Promise.resolve();
  }

  async sendEmail(email: EmailNotification): Promise<void> {
    this.logger.info('Sending email notification', {
      to: email.to,
      subject: email.subject
    });

    // Mock implementation for testing
    return Promise.resolve();
  }

  async sendTelegram(message: string): Promise<void> {
    this.logger.info('Sending Telegram notification', {
      message: message.substring(0, 100)
    });

    // Mock implementation for testing
    return Promise.resolve();
  }

  async sendHighPriorityAlert(alert: HighPriorityAlert): Promise<void> {
    this.logger.warn('Sending high priority alert notification', {
      title: alert.title,
      priority: alert.priority || 'HIGH',
      errorId: alert.errorId
    });

    // Enhanced alert handling for high priority
    const notification: Notification = {
      title: alert.title,
      message: alert.message,
      details: alert.details,
      priority: 'HIGH'
    };

    // Send through multiple channels for high priority
    await Promise.all([
      this.sendAlert(notification),
      this.sendTelegram(`🚨 HIGH PRIORITY: ${alert.title}\n\n${alert.message}`)
    ]);

    return Promise.resolve();
  }

  async sendCriticalAlert(alert: CriticalAlert): Promise<void> {
    this.logger.error('Sending critical alert notification', {
      title: alert.title,
      priority: 'CRITICAL',
      errorId: alert.errorId
    });

    // Enhanced alert handling for critical priority
    const notification: Notification = {
      title: alert.title,
      message: alert.message,
      details: alert.details,
      priority: 'CRITICAL'
    };

    // Send through all available channels for critical alerts
    await Promise.all([
      this.sendAlert(notification),
      this.sendTelegram(`🚨🚨 CRITICAL ALERT: ${alert.title}\n\n${alert.message}`),
      this.sendEmail({
        to: process.env.EMAIL_TO || 'admin@trading-agent.com',
        subject: `CRITICAL ALERT: ${alert.title}`,
        html: this.generateCriticalAlertEmailTemplate(alert)
      })
    ]);

    return Promise.resolve();
  }

  private generateCriticalAlertEmailTemplate(alert: CriticalAlert): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { background-color: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 CRITICAL SYSTEM ALERT 🚨</h1>
          </div>
          <div class="content">
            <h2>${alert.title}</h2>
            <p>${alert.message}</p>
            ${alert.details ? `
              <div class="alert-details">
                <h3>Alert Details:</h3>
                <pre>${JSON.stringify(alert.details, null, 2)}</pre>
              </div>
            ` : ''}
            ${alert.errorId ? `<p><strong>Error ID:</strong> ${alert.errorId}</p>` : ''}
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>System:</strong> AI Crypto Trading Agent - Intel NUC</p>
          </div>
          <div class="footer">
            This is an automated critical alert from the AI Crypto Trading System.
            Immediate attention may be required.
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
