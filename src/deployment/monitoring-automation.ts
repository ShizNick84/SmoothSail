/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - MONITORING AND MAINTENANCE AUTOMATION
 * =============================================================================
 * 
 * This module provides comprehensive monitoring and automated maintenance
 * for the AI crypto trading agent production deployment.
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../core/logger';
import { databaseSetup } from './database-setup';
import * as cron from 'node-cron';

interface MonitoringMetrics {
  timestamp: Date;
  system: SystemMetrics;
  application: ApplicationMetrics;
  trading: TradingMetrics;
  security: SecurityMetrics;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    temperature: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

interface ApplicationMetrics {
  processes: ProcessMetric[];
  apiHealth: boolean;
  dashboardHealth: boolean;
  tunnelHealth: boolean;
  responseTime: number;
  errorRate: number;
}

interface ProcessMetric {
  name: string;
  pid: number;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
}

interface TradingMetrics {
  activeTrades: number;
  totalPnL: number;
  dailyPnL: number;
  winRate: number;
  riskExposure: number;
  lastTradeTime?: Date;
}

interface SecurityMetrics {
  failedLogins: number;
  suspiciousActivities: number;
  firewallBlocks: number;
  lastSecurityScan?: Date;
}

interface MaintenanceTask {
  name: string;
  description: string;
  schedule: string; // cron expression
  action: () => Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

export class MonitoringAutomation {
  private metrics: MonitoringMetrics[] = [];
  private maintenanceTasks: MaintenanceTask[] = [];
  private alertThresholds: any;
  private isRunning: boolean = false;

  constructor() {
    this.initializeAlertThresholds();
    this.initializeMaintenanceTasks();
  }

  /**
   * Start monitoring and maintenance automation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Monitoring automation is already running');
      return;
    }

    logger.info('🔄 Starting monitoring and maintenance automation...');

    // Start metric collection
    this.startMetricCollection();

    // Schedule maintenance tasks
    this.scheduleMaintenanceTasks();

    // Start health checks
    this.startHealthChecks();

    this.isRunning = true;
    logger.info('✅ Monitoring and maintenance automation started');
  }

  /**
   * Stop monitoring and maintenance automation
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping monitoring and maintenance automation...');

    // Stop all cron jobs
    cron.getTasks().forEach(task => task.stop());

    this.isRunning = false;
    logger.info('✅ Monitoring and maintenance automation stopped');
  }

  /**
   * Initialize alert thresholds
   */
  private initializeAlertThresholds(): void {
    this.alertThresholds = {
      cpu: {
        warning: 70,
        critical: 85
      },
      memory: {
        warning: 80,
        critical: 90
      },
      disk: {
        warning: 80,
        critical: 90
      },
      temperature: {
        warning: 70,
        critical: 80
      },
      responseTime: {
        warning: 5000,
        critical: 10000
      },
      errorRate: {
        warning: 0.05,
        critical: 0.1
      }
    };
  }

  /**
   * Initialize maintenance tasks
   */
  private initializeMaintenanceTasks(): void {
    this.maintenanceTasks = [
      {
        name: 'database-backup',
        description: 'Create database backup',
        schedule: '0 2 * * *', // Daily at 2 AM
        enabled: true,
        action: async () => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = join(process.cwd(), 'backups', `db-backup-${timestamp}.db`);
          await databaseSetup.backup(backupPath);
        }
      },
      {
        name: 'log-rotation',
        description: 'Rotate and compress old logs',
        schedule: '0 1 * * *', // Daily at 1 AM
        enabled: true,
        action: async () => {
          await this.rotateLogFiles();
        }
      },
      {
        name: 'system-cleanup',
        description: 'Clean temporary files and optimize system',
        schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
        enabled: true,
        action: async () => {
          await this.performSystemCleanup();
        }
      },
      {
        name: 'security-scan',
        description: 'Run security vulnerability scan',
        schedule: '0 4 * * 1', // Weekly on Monday at 4 AM
        enabled: true,
        action: async () => {
          await this.performSecurityScan();
        }
      },
      {
        name: 'performance-optimization',
        description: 'Optimize system performance',
        schedule: '0 5 * * 0', // Weekly on Sunday at 5 AM
        enabled: true,
        action: async () => {
          await this.optimizePerformance();
        }
      },
      {
        name: 'health-report',
        description: 'Generate comprehensive health report',
        schedule: '0 6 * * 1', // Weekly on Monday at 6 AM
        enabled: true,
        action: async () => {
          await this.generateHealthReport();
        }
      },
      {
        name: 'backup-cleanup',
        description: 'Clean old backup files',
        schedule: '0 7 * * 0', // Weekly on Sunday at 7 AM
        enabled: true,
        action: async () => {
          await this.cleanupOldBackups();
        }
      }
    ];
  }

  /**
   * Start metric collection
   */
  private startMetricCollection(): void {
    // Collect metrics every minute
    cron.schedule('* * * * *', async () => {
      try {
        const metrics = await this.collectMetrics();
        this.metrics.push(metrics);

        // Keep only last 1440 metrics (24 hours)
        if (this.metrics.length > 1440) {
          this.metrics = this.metrics.slice(-1440);
        }

        // Check for alerts
        await this.checkAlerts(metrics);

      } catch (error) {
        logger.error('Error collecting metrics:', error);
      }
    });
  }

  /**
   * Schedule maintenance tasks
   */
  private scheduleMaintenanceTasks(): void {
    for (const task of this.maintenanceTasks) {
      if (task.enabled) {
        cron.schedule(task.schedule, async () => {
          logger.info(`🔧 Running maintenance task: ${task.name}`);
          
          try {
            await task.action();
            task.lastRun = new Date();
            logger.info(`✅ Maintenance task completed: ${task.name}`);
          } catch (error) {
            logger.error(`❌ Maintenance task failed: ${task.name}`, error);
          }
        });
      }
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    // Health check every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    });
  }

  /**
   * Collect system and application metrics
   */
  private async collectMetrics(): Promise<MonitoringMetrics> {
    const timestamp = new Date();

    // System metrics
    const systemMetrics = await this.collectSystemMetrics();
    
    // Application metrics
    const applicationMetrics = await this.collectApplicationMetrics();
    
    // Trading metrics
    const tradingMetrics = await this.collectTradingMetrics();
    
    // Security metrics
    const securityMetrics = await this.collectSecurityMetrics();

    return {
      timestamp,
      system: systemMetrics,
      application: applicationMetrics,
      trading: tradingMetrics,
      security: securityMetrics
    };
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      // CPU metrics
      const cpuUsage = parseFloat(execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", { encoding: 'utf-8' }).trim());
      const loadAverage = execSync('uptime', { encoding: 'utf-8' }).match(/load average: ([\d.]+), ([\d.]+), ([\d.]+)/)?.slice(1).map(Number) || [0, 0, 0];
      
      // Temperature (if available)
      let temperature = 0;
      try {
        temperature = parseFloat(execSync("sensors | grep 'Core 0' | awk '{print $3}' | cut -d'+' -f2 | cut -d'°' -f1", { encoding: 'utf-8' }).trim()) || 0;
      } catch {
        // Temperature sensor not available
      }

      // Memory metrics
      const memInfo = execSync('free -b', { encoding: 'utf-8' }).split('\n')[1].split(/\s+/);
      const memTotal = parseInt(memInfo[1]);
      const memUsed = parseInt(memInfo[2]);
      const memAvailable = parseInt(memInfo[6]);

      // Disk metrics
      const diskInfo = execSync("df -B1 / | tail -1", { encoding: 'utf-8' }).split(/\s+/);
      const diskTotal = parseInt(diskInfo[1]);
      const diskUsed = parseInt(diskInfo[2]);
      const diskAvailable = parseInt(diskInfo[3]);

      // Network metrics (simplified)
      let networkMetrics = { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 };
      try {
        const netStats = execSync("cat /proc/net/dev | grep eth0 || cat /proc/net/dev | grep wlan0 || echo '0 0 0 0'", { encoding: 'utf-8' }).trim();
        if (netStats) {
          const stats = netStats.split(/\s+/);
          networkMetrics = {
            bytesIn: parseInt(stats[1]) || 0,
            bytesOut: parseInt(stats[9]) || 0,
            packetsIn: parseInt(stats[2]) || 0,
            packetsOut: parseInt(stats[10]) || 0
          };
        }
      } catch {
        // Network stats not available
      }

      return {
        cpu: {
          usage: cpuUsage,
          temperature,
          loadAverage
        },
        memory: {
          total: memTotal,
          used: memUsed,
          available: memAvailable,
          percentage: (memUsed / memTotal) * 100
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          available: diskAvailable,
          percentage: (diskUsed / diskTotal) * 100
        },
        network: networkMetrics
      };

    } catch (error) {
      logger.error('Error collecting system metrics:', error);
      throw error;
    }
  }

  /**
   * Collect application metrics
   */
  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const processes: ProcessMetric[] = [];
    let apiHealth = false;
    let dashboardHealth = false;
    let tunnelHealth = false;
    let responseTime = 0;
    let errorRate = 0;

    try {
      // PM2 process metrics
      const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
      const processData = JSON.parse(pm2List);

      for (const proc of processData) {
        processes.push({
          name: proc.name,
          pid: proc.pid,
          status: proc.pm2_env.status,
          cpu: proc.monit.cpu,
          memory: proc.monit.memory,
          uptime: Date.now() - proc.pm2_env.pm_uptime,
          restarts: proc.pm2_env.restart_time
        });
      }

      // API health check
      try {
        const startTime = Date.now();
        execSync('curl -f http://localhost:3001/api/v1/health', { stdio: 'pipe' });
        responseTime = Date.now() - startTime;
        apiHealth = true;
      } catch {
        apiHealth = false;
      }

      // Dashboard health check
      try {
        execSync('curl -f http://localhost:3002', { stdio: 'pipe' });
        dashboardHealth = true;
      } catch {
        dashboardHealth = false;
      }

      // Tunnel health check (simplified)
      tunnelHealth = processes.some(p => p.name.includes('tunnel') && p.status === 'online');

    } catch (error) {
      logger.error('Error collecting application metrics:', error);
    }

    return {
      processes,
      apiHealth,
      dashboardHealth,
      tunnelHealth,
      responseTime,
      errorRate
    };
  }

  /**
   * Collect trading metrics
   */
  private async collectTradingMetrics(): Promise<TradingMetrics> {
    // This would typically query the database for trading data
    // For now, return default values
    return {
      activeTrades: 0,
      totalPnL: 0,
      dailyPnL: 0,
      winRate: 0,
      riskExposure: 0
    };
  }

  /**
   * Collect security metrics
   */
  private async collectSecurityMetrics(): Promise<SecurityMetrics> {
    let failedLogins = 0;
    let suspiciousActivities = 0;
    let firewallBlocks = 0;

    try {
      // Count failed login attempts from auth.log
      if (existsSync('/var/log/auth.log')) {
        const authLog = execSync("grep 'Failed password' /var/log/auth.log | wc -l", { encoding: 'utf-8' });
        failedLogins = parseInt(authLog.trim()) || 0;
      }

      // Count firewall blocks
      try {
        const ufwLog = execSync("grep 'UFW BLOCK' /var/log/ufw.log | wc -l", { encoding: 'utf-8' });
        firewallBlocks = parseInt(ufwLog.trim()) || 0;
      } catch {
        // UFW log not available
      }

    } catch (error) {
      logger.error('Error collecting security metrics:', error);
    }

    return {
      failedLogins,
      suspiciousActivities,
      firewallBlocks
    };
  }

  /**
   * Check for alerts based on metrics
   */
  private async checkAlerts(metrics: MonitoringMetrics): Promise<void> {
    const alerts: string[] = [];

    // CPU alerts
    if (metrics.system.cpu.usage > this.alertThresholds.cpu.critical) {
      alerts.push(`CRITICAL: CPU usage is ${metrics.system.cpu.usage.toFixed(1)}%`);
    } else if (metrics.system.cpu.usage > this.alertThresholds.cpu.warning) {
      alerts.push(`WARNING: CPU usage is ${metrics.system.cpu.usage.toFixed(1)}%`);
    }

    // Memory alerts
    if (metrics.system.memory.percentage > this.alertThresholds.memory.critical) {
      alerts.push(`CRITICAL: Memory usage is ${metrics.system.memory.percentage.toFixed(1)}%`);
    } else if (metrics.system.memory.percentage > this.alertThresholds.memory.warning) {
      alerts.push(`WARNING: Memory usage is ${metrics.system.memory.percentage.toFixed(1)}%`);
    }

    // Disk alerts
    if (metrics.system.disk.percentage > this.alertThresholds.disk.critical) {
      alerts.push(`CRITICAL: Disk usage is ${metrics.system.disk.percentage.toFixed(1)}%`);
    } else if (metrics.system.disk.percentage > this.alertThresholds.disk.warning) {
      alerts.push(`WARNING: Disk usage is ${metrics.system.disk.percentage.toFixed(1)}%`);
    }

    // Temperature alerts
    if (metrics.system.cpu.temperature > this.alertThresholds.temperature.critical) {
      alerts.push(`CRITICAL: CPU temperature is ${metrics.system.cpu.temperature}°C`);
    } else if (metrics.system.cpu.temperature > this.alertThresholds.temperature.warning) {
      alerts.push(`WARNING: CPU temperature is ${metrics.system.cpu.temperature}°C`);
    }

    // Application health alerts
    if (!metrics.application.apiHealth) {
      alerts.push('CRITICAL: API service is not responding');
    }

    if (!metrics.application.tunnelHealth) {
      alerts.push('WARNING: SSH tunnel may be down');
    }

    // Process alerts
    const failedProcesses = metrics.application.processes.filter(p => p.status !== 'online');
    if (failedProcesses.length > 0) {
      alerts.push(`WARNING: ${failedProcesses.length} processes are not running`);
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }

  /**
   * Send alerts via configured channels
   */
  private async sendAlerts(alerts: string[]): Promise<void> {
    const alertMessage = `🚨 AI Crypto Trading Agent Alerts:\n${alerts.join('\n')}`;
    
    logger.warn('System alerts:', alerts);

    // Here you would integrate with notification services
    // For now, just log the alerts
    
    // Save alerts to file
    const alertsDir = join(process.cwd(), 'logs', 'alerts');
    if (!existsSync(alertsDir)) {
      mkdirSync(alertsDir, { recursive: true });
    }

    const alertFile = join(alertsDir, `alerts-${new Date().toISOString().split('T')[0]}.log`);
    const alertEntry = `${new Date().toISOString()}: ${alertMessage}\n`;
    
    try {
      writeFileSync(alertFile, alertEntry, { flag: 'a' });
    } catch (error) {
      logger.error('Failed to write alert to file:', error);
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    const healthStatus = {
      timestamp: new Date(),
      overall: 'HEALTHY',
      checks: {}
    };

    try {
      // Check system resources
      const metrics = await this.collectMetrics();
      
      healthStatus.checks['system'] = {
        status: metrics.system.cpu.usage < 80 && metrics.system.memory.percentage < 85 ? 'HEALTHY' : 'WARNING',
        details: {
          cpu: `${metrics.system.cpu.usage.toFixed(1)}%`,
          memory: `${metrics.system.memory.percentage.toFixed(1)}%`,
          disk: `${metrics.system.disk.percentage.toFixed(1)}%`
        }
      };

      // Check application services
      healthStatus.checks['services'] = {
        status: metrics.application.apiHealth && metrics.application.tunnelHealth ? 'HEALTHY' : 'CRITICAL',
        details: {
          api: metrics.application.apiHealth ? 'UP' : 'DOWN',
          dashboard: metrics.application.dashboardHealth ? 'UP' : 'DOWN',
          tunnel: metrics.application.tunnelHealth ? 'UP' : 'DOWN'
        }
      };

      // Check database
      const dbHealthy = await databaseSetup.validateIntegrity();
      healthStatus.checks['database'] = {
        status: dbHealthy ? 'HEALTHY' : 'CRITICAL',
        details: { integrity: dbHealthy ? 'OK' : 'FAILED' }
      };

      // Determine overall status
      const statuses = Object.values(healthStatus.checks).map(check => check.status);
      if (statuses.includes('CRITICAL')) {
        healthStatus.overall = 'CRITICAL';
      } else if (statuses.includes('WARNING')) {
        healthStatus.overall = 'WARNING';
      }

      // Save health status
      const healthFile = join(process.cwd(), 'logs', 'health-status.json');
      writeFileSync(healthFile, JSON.stringify(healthStatus, null, 2));

    } catch (error) {
      logger.error('Health check failed:', error);
      healthStatus.overall = 'ERROR';
      healthStatus.checks['error'] = { status: 'ERROR', details: error.message };
    }
  }

  /**
   * Maintenance task implementations
   */
  private async rotateLogFiles(): Promise<void> {
    logger.info('🔄 Rotating log files...');
    
    try {
      // Use logrotate if available
      execSync('sudo logrotate -f /etc/logrotate.d/ai-crypto-trading', { stdio: 'pipe' });
    } catch {
      // Manual log rotation
      const logsDir = join(process.cwd(), 'logs');
      if (existsSync(logsDir)) {
        const timestamp = new Date().toISOString().split('T')[0];
        execSync(`find ${logsDir} -name "*.log" -size +100M -exec gzip {} \\;`);
        execSync(`find ${logsDir} -name "*.gz" -mtime +30 -delete`);
      }
    }
    
    logger.info('✅ Log rotation completed');
  }

  private async performSystemCleanup(): Promise<void> {
    logger.info('🧹 Performing system cleanup...');
    
    try {
      // Clean package cache
      execSync('sudo apt autoremove -y', { stdio: 'pipe' });
      execSync('sudo apt autoclean', { stdio: 'pipe' });
      
      // Clean temporary files
      execSync('sudo find /tmp -type f -atime +7 -delete', { stdio: 'pipe' });
      
      // Clean old logs
      execSync('sudo journalctl --vacuum-time=30d', { stdio: 'pipe' });
      
    } catch (error) {
      logger.error('System cleanup error:', error);
    }
    
    logger.info('✅ System cleanup completed');
  }

  private async performSecurityScan(): Promise<void> {
    logger.info('🔒 Performing security scan...');
    
    try {
      // Run npm audit
      execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
      
      // Check for security updates
      execSync('sudo apt list --upgradable | grep -i security', { stdio: 'pipe' });
      
    } catch (error) {
      logger.warn('Security scan completed with warnings');
    }
    
    logger.info('✅ Security scan completed');
  }

  private async optimizePerformance(): Promise<void> {
    logger.info('⚡ Optimizing system performance...');
    
    try {
      // Clear memory caches
      execSync('sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches', { stdio: 'pipe' });
      
      // Optimize database
      await databaseSetup.run('VACUUM');
      await databaseSetup.run('ANALYZE');
      
    } catch (error) {
      logger.error('Performance optimization error:', error);
    }
    
    logger.info('✅ Performance optimization completed');
  }

  private async generateHealthReport(): Promise<void> {
    logger.info('📊 Generating health report...');
    
    const report = {
      timestamp: new Date(),
      system: await this.collectSystemMetrics(),
      application: await this.collectApplicationMetrics(),
      maintenance: {
        lastTasks: this.maintenanceTasks.map(task => ({
          name: task.name,
          lastRun: task.lastRun,
          enabled: task.enabled
        }))
      },
      recommendations: this.generateRecommendations()
    };
    
    const reportFile = join(process.cwd(), 'logs', `health-report-${new Date().toISOString().split('T')[0]}.json`);
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    logger.info(`✅ Health report generated: ${reportFile}`);
  }

  private async cleanupOldBackups(): Promise<void> {
    logger.info('🗑️ Cleaning up old backups...');
    
    const backupsDir = join(process.cwd(), 'backups');
    if (existsSync(backupsDir)) {
      // Keep backups for 30 days
      execSync(`find ${backupsDir} -type f -mtime +30 -delete`, { stdio: 'pipe' });
    }
    
    logger.info('✅ Backup cleanup completed');
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.length > 0) {
      const latestMetrics = this.metrics[this.metrics.length - 1];
      
      if (latestMetrics.system.cpu.usage > 70) {
        recommendations.push('Consider optimizing CPU-intensive processes');
      }
      
      if (latestMetrics.system.memory.percentage > 80) {
        recommendations.push('Monitor memory usage and consider adding more RAM');
      }
      
      if (latestMetrics.system.disk.percentage > 80) {
        recommendations.push('Clean up disk space or add more storage');
      }
      
      if (!latestMetrics.application.apiHealth) {
        recommendations.push('Investigate API service issues');
      }
    }
    
    return recommendations;
  }

  /**
   * Get current metrics
   */
  getMetrics(): MonitoringMetrics[] {
    return this.metrics;
  }

  /**
   * Get maintenance task status
   */
  getMaintenanceStatus(): MaintenanceTask[] {
    return this.maintenanceTasks;
  }
}

// Export singleton instance
export const monitoringAutomation = new MonitoringAutomation();
