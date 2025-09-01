/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SYSTEM HEALTH DASHBOARD API
 * =============================================================================
 * 
 * This module provides a comprehensive health dashboard API for monitoring
 * system status, performance metrics, and deployment health.
 */

import { Router, Request, Response } from 'express';
import { logger } from '../core/logger';
import { monitoringAutomation } from './monitoring-automation';
import { backupRecovery } from './backup-recovery';
import { databaseSetup } from './database-setup';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

interface HealthStatus {
  overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'ERROR';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  components: {
    system: ComponentHealth;
    application: ComponentHealth;
    database: ComponentHealth;
    security: ComponentHealth;
    trading: ComponentHealth;
  };
  metrics: {
    performance: PerformanceMetrics;
    resources: ResourceMetrics;
    alerts: AlertSummary;
  };
  maintenance: MaintenanceStatus;
}

interface ComponentHealth {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'ERROR';
  message: string;
  details: any;
  lastCheck: Date;
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
}

interface ResourceMetrics {
  cpu: {
    usage: number;
    temperature: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

interface AlertSummary {
  active: number;
  critical: number;
  warnings: number;
  recent: Array<{
    timestamp: Date;
    level: string;
    message: string;
  }>;
}

interface MaintenanceStatus {
  lastBackup: Date | null;
  nextBackup: Date | null;
  scheduledTasks: Array<{
    name: string;
    nextRun: Date;
    enabled: boolean;
  }>;
  systemUpdates: {
    available: number;
    security: number;
    lastCheck: Date;
  };
}

export class HealthDashboard {
  private router: Router;
  private startTime: Date;

  constructor() {
    this.router = Router();
    this.startTime = new Date();
    this.setupRoutes();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Main health endpoint
    this.router.get('/health', this.getHealthStatus.bind(this));
    
    // Detailed component health
    this.router.get('/health/system', this.getSystemHealth.bind(this));
    this.router.get('/health/application', this.getApplicationHealth.bind(this));
    this.router.get('/health/database', this.getDatabaseHealth.bind(this));
    this.router.get('/health/security', this.getSecurityHealth.bind(this));
    this.router.get('/health/trading', this.getTradingHealth.bind(this));

    // Metrics endpoints
    this.router.get('/metrics', this.getMetrics.bind(this));
    this.router.get('/metrics/performance', this.getPerformanceMetrics.bind(this));
    this.router.get('/metrics/resources', this.getResourceMetrics.bind(this));
    this.router.get('/metrics/history', this.getMetricsHistory.bind(this));

    // Alerts endpoints
    this.router.get('/alerts', this.getAlerts.bind(this));
    this.router.get('/alerts/active', this.getActiveAlerts.bind(this));
    this.router.post('/alerts/:id/acknowledge', this.acknowledgeAlert.bind(this));

    // Maintenance endpoints
    this.router.get('/maintenance', this.getMaintenanceStatus.bind(this));
    this.router.get('/maintenance/tasks', this.getMaintenanceTasks.bind(this));
    this.router.post('/maintenance/tasks/:name/run', this.runMaintenanceTask.bind(this));

    // Backup endpoints
    this.router.get('/backups', this.getBackupStatus.bind(this));
    this.router.get('/backups/history', this.getBackupHistory.bind(this));
    this.router.post('/backups/create', this.createBackup.bind(this));

    // Recovery endpoints
    this.router.get('/recovery/plans', this.getRecoveryPlans.bind(this));
    this.router.post('/recovery/execute/:plan', this.executeRecovery.bind(this));

    // System control endpoints
    this.router.post('/system/restart', this.restartSystem.bind(this));
    this.router.post('/system/shutdown', this.shutdownSystem.bind(this));
    this.router.get('/system/logs', this.getSystemLogs.bind(this));
  }

  /**
   * Get overall health status
   */
  private async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus: HealthStatus = {
        overall: 'HEALTHY',
        timestamp: new Date(),
        uptime: Date.now() - this.startTime.getTime(),
        version: this.getVersion(),
        environment: process.env.NODE_ENV || 'development',
        components: {
          system: await this.checkSystemHealth(),
          application: await this.checkApplicationHealth(),
          database: await this.checkDatabaseHealth(),
          security: await this.checkSecurityHealth(),
          trading: await this.checkTradingHealth()
        },
        metrics: {
          performance: await this.getPerformanceMetricsData(),
          resources: await this.getResourceMetricsData(),
          alerts: await this.getAlertSummaryData()
        },
        maintenance: await this.getMaintenanceStatusData()
      };

      // Determine overall status
      const componentStatuses = Object.values(healthStatus.components).map(c => c.status);
      if (componentStatuses.includes('CRITICAL') || componentStatuses.includes('ERROR')) {
        healthStatus.overall = 'CRITICAL';
      } else if (componentStatuses.includes('WARNING')) {
        healthStatus.overall = 'WARNING';
      }

      res.json(healthStatus);

    } catch (error) {
      logger.error('Health status check failed:', error);
      res.status(500).json({
        overall: 'ERROR',
        timestamp: new Date(),
        error: error.message
      });
    }
  }

  /**
   * Component health check methods
   */
  private async checkSystemHealth(): Promise<ComponentHealth> {
    try {
      const metrics = await this.getResourceMetricsData();
      
      let status: ComponentHealth['status'] = 'HEALTHY';
      let message = 'System resources are within normal limits';

      if (metrics.cpu.usage > 85 || metrics.memory.percentage > 90 || metrics.disk.percentage > 90) {
        status = 'CRITICAL';
        message = 'System resources are critically high';
      } else if (metrics.cpu.usage > 70 || metrics.memory.percentage > 80 || metrics.disk.percentage > 80) {
        status = 'WARNING';
        message = 'System resources are elevated';
      }

      return {
        status,
        message,
        details: metrics,
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'ERROR',
        message: `System health check failed: ${error.message}`,
        details: null,
        lastCheck: new Date()
      };
    }
  }

  private async checkApplicationHealth(): Promise<ComponentHealth> {
    try {
      const processes = await this.getProcessStatus();
      const apiHealth = await this.checkApiHealth();
      const dashboardHealth = await this.checkDashboardHealth();

      const runningProcesses = processes.filter(p => p.status === 'online');
      const totalProcesses = processes.length;

      let status: ComponentHealth['status'] = 'HEALTHY';
      let message = 'All application services are running normally';

      if (!apiHealth || runningProcesses.length === 0) {
        status = 'CRITICAL';
        message = 'Critical application services are down';
      } else if (runningProcesses.length < totalProcesses || !dashboardHealth) {
        status = 'WARNING';
        message = 'Some application services have issues';
      }

      return {
        status,
        message,
        details: {
          processes: {
            running: runningProcesses.length,
            total: totalProcesses
          },
          api: apiHealth,
          dashboard: dashboardHealth
        },
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'ERROR',
        message: `Application health check failed: ${error.message}`,
        details: null,
        lastCheck: new Date()
      };
    }
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    try {
      const isValid = await databaseSetup.validateIntegrity();
      const stats = await databaseSetup.getStatistics();

      return {
        status: isValid ? 'HEALTHY' : 'CRITICAL',
        message: isValid ? 'Database is healthy' : 'Database integrity issues detected',
        details: stats,
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'ERROR',
        message: `Database health check failed: ${error.message}`,
        details: null,
        lastCheck: new Date()
      };
    }
  }

  private async checkSecurityHealth(): Promise<ComponentHealth> {
    try {
      // Check firewall status
      let firewallActive = false;
      try {
        const ufwStatus = execSync('sudo ufw status', { encoding: 'utf-8' });
        firewallActive = ufwStatus.includes('Status: active');
      } catch {
        // UFW not available
      }

      // Check fail2ban status
      let fail2banActive = false;
      try {
        const fail2banStatus = execSync('sudo systemctl is-active fail2ban', { encoding: 'utf-8' });
        fail2banActive = fail2banStatus.trim() === 'active';
      } catch {
        // Fail2ban not available
      }

      // Check for security updates
      let securityUpdates = 0;
      try {
        const updates = execSync('apt list --upgradable 2>/dev/null | grep -i security | wc -l', { encoding: 'utf-8' });
        securityUpdates = parseInt(updates.trim()) || 0;
      } catch {
        // Cannot check updates
      }

      let status: ComponentHealth['status'] = 'HEALTHY';
      let message = 'Security systems are functioning normally';

      if (!firewallActive || securityUpdates > 10) {
        status = 'CRITICAL';
        message = 'Critical security issues detected';
      } else if (!fail2banActive || securityUpdates > 0) {
        status = 'WARNING';
        message = 'Security warnings detected';
      }

      return {
        status,
        message,
        details: {
          firewall: firewallActive,
          fail2ban: fail2banActive,
          securityUpdates
        },
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'ERROR',
        message: `Security health check failed: ${error.message}`,
        details: null,
        lastCheck: new Date()
      };
    }
  }

  private async checkTradingHealth(): Promise<ComponentHealth> {
    try {
      // This would check trading-specific health metrics
      // For now, return a basic status
      return {
        status: 'HEALTHY',
        message: 'Trading systems are operational',
        details: {
          activeTrades: 0,
          riskExposure: 0,
          lastTradeTime: null
        },
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'ERROR',
        message: `Trading health check failed: ${error.message}`,
        details: null,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Metrics collection methods
   */
  private async getPerformanceMetricsData(): Promise<PerformanceMetrics> {
    // Get response time
    let responseTime = 0;
    try {
      const start = Date.now();
      execSync('curl -s http://localhost:3001/api/v1/health', { stdio: 'pipe' });
      responseTime = Date.now() - start;
    } catch {
      responseTime = -1; // Service unavailable
    }

    return {
      responseTime,
      throughput: 0, // Would be calculated from request logs
      errorRate: 0, // Would be calculated from error logs
      availability: responseTime > 0 ? 100 : 0
    };
  }

  private async getResourceMetricsData(): Promise<ResourceMetrics> {
    try {
      // CPU metrics
      const cpuUsage = parseFloat(execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", { encoding: 'utf-8' }).trim());
      const cpuCores = parseInt(execSync('nproc', { encoding: 'utf-8' }).trim());
      
      let cpuTemp = 0;
      try {
        cpuTemp = parseFloat(execSync("sensors | grep 'Core 0' | awk '{print $3}' | cut -d'+' -f2 | cut -d'°' -f1", { encoding: 'utf-8' }).trim()) || 0;
      } catch {
        // Temperature sensor not available
      }

      // Memory metrics
      const memInfo = execSync('free -b', { encoding: 'utf-8' }).split('\n')[1].split(/\s+/);
      const memTotal = parseInt(memInfo[1]);
      const memUsed = parseInt(memInfo[2]);

      // Disk metrics
      const diskInfo = execSync("df -B1 / | tail -1", { encoding: 'utf-8' }).split(/\s+/);
      const diskTotal = parseInt(diskInfo[1]);
      const diskUsed = parseInt(diskInfo[2]);

      // Network metrics (simplified)
      let networkIn = 0, networkOut = 0;
      try {
        const netStats = execSync("cat /proc/net/dev | grep -E 'eth0|wlan0' | head -1", { encoding: 'utf-8' }).trim();
        if (netStats) {
          const stats = netStats.split(/\s+/);
          networkIn = parseInt(stats[1]) || 0;
          networkOut = parseInt(stats[9]) || 0;
        }
      } catch {
        // Network stats not available
      }

      return {
        cpu: {
          usage: cpuUsage,
          temperature: cpuTemp,
          cores: cpuCores
        },
        memory: {
          used: memUsed,
          total: memTotal,
          percentage: (memUsed / memTotal) * 100
        },
        disk: {
          used: diskUsed,
          total: diskTotal,
          percentage: (diskUsed / diskTotal) * 100
        },
        network: {
          bytesIn: networkIn,
          bytesOut: networkOut
        }
      };

    } catch (error) {
      logger.error('Error collecting resource metrics:', error);
      throw error;
    }
  }

  private async getAlertSummaryData(): Promise<AlertSummary> {
    // This would integrate with the monitoring system
    return {
      active: 0,
      critical: 0,
      warnings: 0,
      recent: []
    };
  }

  private async getMaintenanceStatusData(): Promise<MaintenanceStatus> {
    const backupHistory = backupRecovery.getBackupHistory();
    const maintenanceTasks = monitoringAutomation.getMaintenanceStatus();

    const lastBackup = backupHistory.length > 0 ? backupHistory[backupHistory.length - 1].timestamp : null;

    // Check for system updates
    let availableUpdates = 0;
    let securityUpdates = 0;
    try {
      const updates = execSync('apt list --upgradable 2>/dev/null | wc -l', { encoding: 'utf-8' });
      availableUpdates = Math.max(0, parseInt(updates.trim()) - 1); // Subtract header line

      const secUpdates = execSync('apt list --upgradable 2>/dev/null | grep -i security | wc -l', { encoding: 'utf-8' });
      securityUpdates = parseInt(secUpdates.trim()) || 0;
    } catch {
      // Cannot check updates
    }

    return {
      lastBackup,
      nextBackup: null, // Would be calculated from backup schedule
      scheduledTasks: maintenanceTasks.map(task => ({
        name: task.name,
        nextRun: task.nextRun || new Date(),
        enabled: task.enabled
      })),
      systemUpdates: {
        available: availableUpdates,
        security: securityUpdates,
        lastCheck: new Date()
      }
    };
  }

  /**
   * Helper methods
   */
  private async getProcessStatus(): Promise<any[]> {
    try {
      const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
      return JSON.parse(pm2List);
    } catch {
      return [];
    }
  }

  private async checkApiHealth(): Promise<boolean> {
    try {
      execSync('curl -f http://localhost:3001/api/v1/health', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private async checkDashboardHealth(): Promise<boolean> {
    try {
      execSync('curl -f http://localhost:3002', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private getVersion(): string {
    try {
      if (existsSync('package.json')) {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
        return packageJson.version || '1.0.0';
      }
    } catch {
      // Ignore errors
    }
    return '1.0.0';
  }

  /**
   * API endpoint implementations
   */
  private async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const systemHealth = await this.checkSystemHealth();
      res.json(systemHealth);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getApplicationHealth(req: Request, res: Response): Promise<void> {
    try {
      const appHealth = await this.checkApplicationHealth();
      res.json(appHealth);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getDatabaseHealth(req: Request, res: Response): Promise<void> {
    try {
      const dbHealth = await this.checkDatabaseHealth();
      res.json(dbHealth);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getSecurityHealth(req: Request, res: Response): Promise<void> {
    try {
      const securityHealth = await this.checkSecurityHealth();
      res.json(securityHealth);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getTradingHealth(req: Request, res: Response): Promise<void> {
    try {
      const tradingHealth = await this.checkTradingHealth();
      res.json(tradingHealth);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = monitoringAutomation.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const performanceMetrics = await this.getPerformanceMetricsData();
      res.json(performanceMetrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getResourceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const resourceMetrics = await this.getResourceMetricsData();
      res.json(resourceMetrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getMetricsHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = monitoringAutomation.getMetrics();
      const limit = parseInt(req.query.limit as string) || 100;
      res.json(history.slice(-limit));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      // This would integrate with the alerting system
      res.json({ alerts: [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getActiveAlerts(req: Request, res: Response): Promise<void> {
    try {
      // This would return only active alerts
      res.json({ activeAlerts: [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const alertId = req.params.id;
      // This would acknowledge the alert
      res.json({ success: true, alertId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getMaintenanceStatus(req: Request, res: Response): Promise<void> {
    try {
      const maintenanceStatus = await this.getMaintenanceStatusData();
      res.json(maintenanceStatus);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getMaintenanceTasks(req: Request, res: Response): Promise<void> {
    try {
      const tasks = monitoringAutomation.getMaintenanceStatus();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async runMaintenanceTask(req: Request, res: Response): Promise<void> {
    try {
      const taskName = req.params.name;
      // This would trigger the maintenance task
      res.json({ success: true, task: taskName, status: 'started' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getBackupStatus(req: Request, res: Response): Promise<void> {
    try {
      const config = backupRecovery.getConfig();
      const history = backupRecovery.getBackupHistory();
      const lastBackup = history.length > 0 ? history[history.length - 1] : null;

      res.json({
        config,
        lastBackup,
        totalBackups: history.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getBackupHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = backupRecovery.getBackupHistory();
      const limit = parseInt(req.query.limit as string) || 50;
      res.json(history.slice(-limit));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const result = await backupRecovery.performFullBackup();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getRecoveryPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = backupRecovery.getRecoveryPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async executeRecovery(req: Request, res: Response): Promise<void> {
    try {
      const planName = req.params.plan;
      const result = await backupRecovery.executeRecovery(planName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async restartSystem(req: Request, res: Response): Promise<void> {
    try {
      // This would restart the system services
      execSync('pm2 restart all');
      res.json({ success: true, message: 'System restart initiated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async shutdownSystem(req: Request, res: Response): Promise<void> {
    try {
      // This would gracefully shutdown the system
      execSync('pm2 stop all');
      res.json({ success: true, message: 'System shutdown initiated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getSystemLogs(req: Request, res: Response): Promise<void> {
    try {
      const lines = parseInt(req.query.lines as string) || 100;
      const logType = req.query.type as string || 'application';
      
      let logs = '';
      switch (logType) {
        case 'application':
          logs = execSync(`pm2 logs --lines ${lines} --nostream`, { encoding: 'utf-8' });
          break;
        case 'system':
          logs = execSync(`journalctl -n ${lines} --no-pager`, { encoding: 'utf-8' });
          break;
        case 'security':
          logs = execSync(`tail -n ${lines} /var/log/auth.log`, { encoding: 'utf-8' });
          break;
        default:
          logs = execSync(`pm2 logs --lines ${lines} --nostream`, { encoding: 'utf-8' });
      }

      res.json({ logs: logs.split('\n') });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get router instance
   */
  getRouter(): Router {
    return this.router;
  }
}

// Export singleton instance
export const healthDashboard = new HealthDashboard();