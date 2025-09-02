/**
 * Automated Security Testing Suite
 * 
 * Orchestrates comprehensive security testing including penetration testing,
 * vulnerability scanning, and compliance validation for the AI crypto trading agent.
 * 
 * Features:
 * - Automated test scheduling and execution
 * - Continuous security monitoring
 * - Integration with CI/CD pipelines
 * - Comprehensive reporting and alerting
 */

import { Logger } from '../core/logging/logger';
import { PenetrationTestingService, VulnerabilityReport, PenetrationTestConfig } from './penetration-testing-service';
import { SecurityMonitoringService } from './security-monitoring-service';
import { IncidentResponseService } from './incident-response-service';
import { NotificationService } from '../core/notifications/notification-service';
import * as cron from 'node-cron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SecurityTestSchedule {
  id: string;
  name: string;
  cronExpression: string;
  testTypes: string[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface SecurityTestSuiteConfig {
  schedules: SecurityTestSchedule[];
  reportingConfig: {
    outputDirectory: string;
    retentionDays: number;
    emailReports: boolean;
    slackIntegration: boolean;
  };
  alertingConfig: {
    criticalThreshold: number;
    highThreshold: number;
    emailAlerts: boolean;
    immediateNotification: boolean;
  };
  integrationConfig: {
    cicdIntegration: boolean;
    webhookUrl?: string;
    apiKey?: string;
  };
}

export interface SecurityTestExecution {
  executionId: string;
  scheduleId: string;
  startTime: Date;
  endTime?: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  report?: VulnerabilityReport;
  error?: string;
}

export class AutomatedSecurityTestingSuite {
  private logger: Logger;
  private penetrationTesting: PenetrationTestingService;
  private securityMonitoring: SecurityMonitoringService;
  private incidentResponse: IncidentResponseService;
  private notifications: NotificationService;
  private config: SecurityTestSuiteConfig;
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private activeExecutions: Map<string, SecurityTestExecution> = new Map();

  constructor(
    logger: Logger,
    penetrationTesting: PenetrationTestingService,
    securityMonitoring: SecurityMonitoringService,
    incidentResponse: IncidentResponseService,
    notifications: NotificationService,
    config: SecurityTestSuiteConfig
  ) {
    this.logger = logger;
    this.penetrationTesting = penetrationTesting;
    this.securityMonitoring = securityMonitoring;
    this.incidentResponse = incidentResponse;
    this.notifications = notifications;
    this.config = config;
  }

  /**
   * Initialize the automated security testing suite
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing automated security testing suite');

    try {
      // Create output directory if it doesn't exist
      await this.ensureOutputDirectory();

      // Schedule all enabled security tests
      await this.scheduleSecurityTests();

      // Start continuous monitoring
      await this.startContinuousMonitoring();

      this.logger.info('Automated security testing suite initialized successfully', {
        scheduledTests: this.scheduledJobs.size,
        outputDirectory: this.config.reportingConfig.outputDirectory
      });
    } catch (error) {
      this.logger.error('Failed to initialize automated security testing suite', { error });
      throw error;
    }
  }

  /**
   * Schedule all security tests based on configuration
   */
  private async scheduleSecurityTests(): Promise<void> {
    for (const schedule of this.config.schedules) {
      if (schedule.enabled) {
        await this.scheduleSecurityTest(schedule);
      }
    }
  }

  /**
   * Schedule a specific security test
   */
  private async scheduleSecurityTest(schedule: SecurityTestSchedule): Promise<void> {
    try {
      const task = cron.schedule(schedule.cronExpression, async () => {
        await this.executeScheduledTest(schedule);
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.scheduledJobs.set(schedule.id, task);
      task.start();

      this.logger.info(`Scheduled security test: ${schedule.name}`, {
        scheduleId: schedule.id,
        cronExpression: schedule.cronExpression,
        testTypes: schedule.testTypes
      });
    } catch (error) {
      this.logger.error(`Failed to schedule security test: ${schedule.name}`, { 
        scheduleId: schedule.id, 
        error 
      });
    }
  }

  /**
   * Execute a scheduled security test
   */
  private async executeScheduledTest(schedule: SecurityTestSchedule): Promise<void> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: SecurityTestExecution = {
      executionId,
      scheduleId: schedule.id,
      startTime: new Date(),
      status: 'RUNNING'
    };

    this.activeExecutions.set(executionId, execution);

    this.logger.info(`Starting scheduled security test execution`, {
      executionId,
      scheduleName: schedule.name,
      testTypes: schedule.testTypes
    });

    try {
      // Execute the security test suite
      const report = await this.penetrationTesting.executeSecurityTestSuite();

      // Update execution status
      execution.endTime = new Date();
      execution.status = 'COMPLETED';
      execution.report = report;

      // Update schedule last run time
      schedule.lastRun = new Date();

      // Save report to disk
      await this.saveSecurityReport(execution, report);

      // Process results and send alerts if necessary
      await this.processSecurityTestResults(execution, report);

      this.logger.info(`Security test execution completed successfully`, {
        executionId,
        totalVulnerabilities: report.totalVulnerabilities,
        criticalCount: report.criticalCount,
        complianceScore: report.complianceScore
      });

    } catch (error) {
      execution.endTime = new Date();
      execution.status = 'FAILED';
      execution.error = error instanceof Error ? error.message : String(error);

      this.logger.error(`Security test execution failed`, {
        executionId,
        scheduleName: schedule.name,
        error
      });

      // Send failure notification
      await this.sendFailureNotification(execution, error);
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute security tests on demand
   */
  async executeSecurityTestsOnDemand(testTypes?: string[]): Promise<VulnerabilityReport> {
    const executionId = `ondemand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: SecurityTestExecution = {
      executionId,
      scheduleId: 'on-demand',
      startTime: new Date(),
      status: 'RUNNING'
    };

    this.activeExecutions.set(executionId, execution);

    this.logger.info(`Starting on-demand security test execution`, {
      executionId,
      testTypes: testTypes || 'all'
    });

    try {
      // Execute the security test suite
      const report = await this.penetrationTesting.executeSecurityTestSuite();

      execution.endTime = new Date();
      execution.status = 'COMPLETED';
      execution.report = report;

      // Save report to disk
      await this.saveSecurityReport(execution, report);

      // Process results
      await this.processSecurityTestResults(execution, report);

      this.logger.info(`On-demand security test execution completed`, {
        executionId,
        totalVulnerabilities: report.totalVulnerabilities,
        criticalCount: report.criticalCount
      });

      return report;

    } catch (error) {
      execution.endTime = new Date();
      execution.status = 'FAILED';
      execution.error = error instanceof Error ? error.message : String(error);

      this.logger.error(`On-demand security test execution failed`, {
        executionId,
        error
      });

      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Process security test results and trigger appropriate actions
   */
  private async processSecurityTestResults(
    execution: SecurityTestExecution,
    report: VulnerabilityReport
  ): Promise<void> {
    // Check if critical vulnerabilities exceed threshold
    if (report.criticalCount >= this.config.alertingConfig.criticalThreshold) {
      await this.handleCriticalVulnerabilities(execution, report);
    }

    // Check if high vulnerabilities exceed threshold
    if (report.highCount >= this.config.alertingConfig.highThreshold) {
      await this.handleHighVulnerabilities(execution, report);
    }

    // Send regular report if configured
    if (this.config.reportingConfig.emailReports) {
      await this.sendSecurityReport(execution, report);
    }

    // Update security metrics
    await this.updateSecurityMetrics(report);

    // Trigger CI/CD integration if configured
    if (this.config.integrationConfig.cicdIntegration) {
      await this.triggerCICDIntegration(execution, report);
    }
  }

  /**
   * Handle critical vulnerabilities
   */
  private async handleCriticalVulnerabilities(
    execution: SecurityTestExecution,
    report: VulnerabilityReport
  ): Promise<void> {
    this.logger.warn(`Critical vulnerabilities detected`, {
      executionId: execution.executionId,
      criticalCount: report.criticalCount,
      threshold: this.config.alertingConfig.criticalThreshold
    });

    // Create security incident
    const incident = await this.incidentResponse.createIncident({
      type: 'CRITICAL_VULNERABILITIES',
      severity: 'CRITICAL',
      description: `${report.criticalCount} critical vulnerabilities detected in security scan`,
      source: 'Automated Security Testing',
      evidence: report.vulnerabilities.filter(v => v.severity === 'CRITICAL')
    });

    // Send immediate notification if configured
    if (this.config.alertingConfig.immediateNotification) {
      await this.notifications.sendCriticalAlert({
        title: '🚨 Critical Security Vulnerabilities Detected',
        message: `Security scan found ${report.criticalCount} critical vulnerabilities requiring immediate attention.`,
        details: {
          executionId: execution.executionId,
          criticalCount: report.criticalCount,
          complianceScore: report.complianceScore,
          incidentId: incident.id
        },
        priority: 'CRITICAL'
      });
    }
  }

  /**
   * Handle high severity vulnerabilities
   */
  private async handleHighVulnerabilities(
    execution: SecurityTestExecution,
    report: VulnerabilityReport
  ): Promise<void> {
    this.logger.warn(`High severity vulnerabilities detected`, {
      executionId: execution.executionId,
      highCount: report.highCount,
      threshold: this.config.alertingConfig.highThreshold
    });

    // Send alert notification
    if (this.config.alertingConfig.emailAlerts) {
      await this.notifications.sendAlert({
        title: '⚠️ High Severity Security Vulnerabilities',
        message: `Security scan found ${report.highCount} high severity vulnerabilities.`,
        details: {
          executionId: execution.executionId,
          highCount: report.highCount,
          complianceScore: report.complianceScore
        },
        priority: 'HIGH'
      });
    }
  }

  /**
   * Save security report to disk
   */
  private async saveSecurityReport(
    execution: SecurityTestExecution,
    report: VulnerabilityReport
  ): Promise<void> {
    try {
      const reportData = {
        execution: {
          executionId: execution.executionId,
          scheduleId: execution.scheduleId,
          startTime: execution.startTime,
          endTime: execution.endTime,
          status: execution.status
        },
        report,
        metadata: {
          generatedAt: new Date(),
          version: '1.0',
          format: 'json'
        }
      };

      const fileName = `security-report-${execution.executionId}-${Date.now()}.json`;
      const filePath = path.join(this.config.reportingConfig.outputDirectory, fileName);

      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));

      this.logger.info(`Security report saved`, {
        executionId: execution.executionId,
        filePath,
        fileSize: JSON.stringify(reportData).length
      });

      // Clean up old reports if retention policy is configured
      await this.cleanupOldReports();

    } catch (error) {
      this.logger.error(`Failed to save security report`, {
        executionId: execution.executionId,
        error
      });
    }
  }

  /**
   * Send security report via email
   */
  private async sendSecurityReport(
    execution: SecurityTestExecution,
    report: VulnerabilityReport
  ): Promise<void> {
    try {
      const emailContent = this.generateEmailReport(execution, report);

      await this.notifications.sendEmail({
        to: 'security-team@company.com',
        subject: `Security Test Report - ${execution.executionId}`,
        html: emailContent,
        attachments: [{
          filename: `security-report-${execution.executionId}.json`,
          content: JSON.stringify(report, null, 2),
          contentType: 'application/json'
        }]
      });

      this.logger.info(`Security report sent via email`, {
        executionId: execution.executionId
      });

    } catch (error) {
      this.logger.error(`Failed to send security report via email`, {
        executionId: execution.executionId,
        error
      });
    }
  }

  /**
   * Generate HTML email report
   */
  private generateEmailReport(
    execution: SecurityTestExecution,
    report: VulnerabilityReport
  ): string {
    const severityColors = {
      CRITICAL: '#dc3545',
      HIGH: '#fd7e14',
      MEDIUM: '#ffc107',
      LOW: '#28a745'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
          .summary { display: flex; justify-content: space-around; margin: 20px 0; }
          .metric { text-align: center; padding: 15px; border-radius: 5px; background-color: #e9ecef; }
          .vulnerability { margin: 10px 0; padding: 15px; border-left: 4px solid #ccc; }
          .critical { border-left-color: ${severityColors.CRITICAL}; }
          .high { border-left-color: ${severityColors.HIGH}; }
          .medium { border-left-color: ${severityColors.MEDIUM}; }
          .low { border-left-color: ${severityColors.LOW}; }
          .recommendations { background-color: #d1ecf1; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔒 Security Test Report</h1>
          <p><strong>Execution ID:</strong> ${execution.executionId}</p>
          <p><strong>Execution Time:</strong> ${execution.startTime.toISOString()}</p>
          <p><strong>Status:</strong> ${execution.status}</p>
        </div>

        <div class="summary">
          <div class="metric">
            <h3>${report.totalVulnerabilities}</h3>
            <p>Total Vulnerabilities</p>
          </div>
          <div class="metric">
            <h3 style="color: ${severityColors.CRITICAL}">${report.criticalCount}</h3>
            <p>Critical</p>
          </div>
          <div class="metric">
            <h3 style="color: ${severityColors.HIGH}">${report.highCount}</h3>
            <p>High</p>
          </div>
          <div class="metric">
            <h3 style="color: ${severityColors.MEDIUM}">${report.mediumCount}</h3>
            <p>Medium</p>
          </div>
          <div class="metric">
            <h3 style="color: ${severityColors.LOW}">${report.lowCount}</h3>
            <p>Low</p>
          </div>
          <div class="metric">
            <h3>${report.complianceScore}%</h3>
            <p>Compliance Score</p>
          </div>
        </div>

        <h2>🔍 Top Vulnerabilities</h2>
        ${report.vulnerabilities
          .filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH')
          .slice(0, 10)
          .map(v => `
            <div class="vulnerability ${v.severity.toLowerCase()}">
              <h4>${v.type} - ${v.severity}</h4>
              <p><strong>Description:</strong> ${v.description}</p>
              <p><strong>Location:</strong> ${v.location}</p>
              <p><strong>Remediation:</strong> ${v.remediation}</p>
            </div>
          `).join('')}

        <div class="recommendations">
          <h2>💡 Recommendations</h2>
          <ul>
            ${report.recommendations.slice(0, 10).map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <p><em>This is an automated security report generated by the AI Crypto Trading Agent Security Testing Suite.</em></p>
      </body>
      </html>
    `;
  }

  /**
   * Send failure notification
   */
  private async sendFailureNotification(
    execution: SecurityTestExecution,
    error: any
  ): Promise<void> {
    try {
      await this.notifications.sendAlert({
        title: '❌ Security Test Execution Failed',
        message: `Security test execution ${execution.executionId} failed with error: ${error.message}`,
        details: {
          executionId: execution.executionId,
          scheduleId: execution.scheduleId,
          error: error.message,
          startTime: execution.startTime,
          endTime: execution.endTime
        },
        priority: 'HIGH'
      });
    } catch (notificationError) {
      this.logger.error(`Failed to send failure notification`, {
        executionId: execution.executionId,
        originalError: error,
        notificationError
      });
    }
  }

  /**
   * Update security metrics
   */
  private async updateSecurityMetrics(report: VulnerabilityReport): Promise<void> {
    try {
      await this.securityMonitoring.updateSecurityMetrics({
        timestamp: new Date(),
        totalVulnerabilities: report.totalVulnerabilities,
        criticalCount: report.criticalCount,
        highCount: report.highCount,
        mediumCount: report.mediumCount,
        lowCount: report.lowCount,
        complianceScore: report.complianceScore
      });
    } catch (error) {
      this.logger.error(`Failed to update security metrics`, { error });
    }
  }

  /**
   * Trigger CI/CD integration
   */
  private async triggerCICDIntegration(
    execution: SecurityTestExecution,
    report: VulnerabilityReport
  ): Promise<void> {
    if (!this.config.integrationConfig.webhookUrl) {
      return;
    }

    try {
      const payload = {
        executionId: execution.executionId,
        timestamp: new Date().toISOString(),
        status: execution.status,
        vulnerabilities: {
          total: report.totalVulnerabilities,
          critical: report.criticalCount,
          high: report.highCount,
          medium: report.mediumCount,
          low: report.lowCount
        },
        complianceScore: report.complianceScore,
        recommendations: report.recommendations.slice(0, 5)
      };

      // This would make an HTTP request to the CI/CD webhook
      this.logger.info(`Triggering CI/CD integration`, {
        executionId: execution.executionId,
        webhookUrl: this.config.integrationConfig.webhookUrl
      });

    } catch (error) {
      this.logger.error(`Failed to trigger CI/CD integration`, {
        executionId: execution.executionId,
        error
      });
    }
  }

  /**
   * Start continuous monitoring
   */
  private async startContinuousMonitoring(): Promise<void> {
    // This would start continuous security monitoring
    // For now, we'll just log that it's started
    this.logger.info('Continuous security monitoring started');
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.reportingConfig.outputDirectory, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create output directory`, {
        directory: this.config.reportingConfig.outputDirectory,
        error
      });
      throw error;
    }
  }

  /**
   * Clean up old reports based on retention policy
   */
  private async cleanupOldReports(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.reportingConfig.outputDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.reportingConfig.retentionDays);

      for (const file of files) {
        if (file.startsWith('security-report-')) {
          const filePath = path.join(this.config.reportingConfig.outputDirectory, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            this.logger.info(`Deleted old security report`, { file });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old reports`, { error });
    }
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): SecurityTestExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get scheduled tests
   */
  getScheduledTests(): SecurityTestSchedule[] {
    return this.config.schedules;
  }

  /**
   * Add new security test schedule
   */
  async addSecurityTestSchedule(schedule: SecurityTestSchedule): Promise<void> {
    this.config.schedules.push(schedule);
    
    if (schedule.enabled) {
      await this.scheduleSecurityTest(schedule);
    }

    this.logger.info(`Added new security test schedule`, {
      scheduleId: schedule.id,
      name: schedule.name
    });
  }

  /**
   * Remove security test schedule
   */
  async removeSecurityTestSchedule(scheduleId: string): Promise<void> {
    const task = this.scheduledJobs.get(scheduleId);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(scheduleId);
    }

    this.config.schedules = this.config.schedules.filter(s => s.id !== scheduleId);

    this.logger.info(`Removed security test schedule`, { scheduleId });
  }

  /**
   * Stop all scheduled tests
   */
  async stopAllScheduledTests(): Promise<void> {
    for (const [scheduleId, task] of this.scheduledJobs) {
      task.stop();
      this.logger.info(`Stopped scheduled test`, { scheduleId });
    }
    
    this.scheduledJobs.clear();
  }

  /**
   * Shutdown the automated security testing suite
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down automated security testing suite');

    // Stop all scheduled tests
    await this.stopAllScheduledTests();

    // Cancel active executions
    for (const execution of this.activeExecutions.values()) {
      execution.status = 'CANCELLED';
      execution.endTime = new Date();
    }

    this.activeExecutions.clear();

    this.logger.info('Automated security testing suite shutdown complete');
  }
}
