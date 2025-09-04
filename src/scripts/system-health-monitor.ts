#!/usr/bin/env tsx

/**
 * System Health Monitor for Intel NUC Production Deployment
 * Monitors system resources, services, and trading agent health
 */

import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import axios from 'axios';

interface HealthMetrics {
  timestamp: Date;
  system: {
    uptime: number;
    loadAverage: number[];
    cpuUsage: number;
    memoryUsage: {
      total: number;
      used: number;
      free: number;
      percentage: number;
    };
    diskUsage: {
      total: number;
      used: number;
      free: number;
      percentage: number;
    };
    temperature?: number;
  };
  services: {
    [serviceName: string]: {
      active: boolean;
      status: string;
      uptime?: string;
    };
  };
  network: {
    connectivity: boolean;
    latency?: number;
    sshTunnel: boolean;
  };
  trading: {
    apiConnectivity: boolean;
    lastTrade?: Date;
    errorRate: number;
    tradesCount: number;
  };
  alerts: Alert[];
}

interface Alert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  component: string;
}

class SystemHealthMonitor {
  private metrics: HealthMetrics;
  private alerts: Alert[] = [];
  private logDir = '/var/log/trading-agent';
  private configPath = '/opt/trading-agent/.env';

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): HealthMetrics {
    return {
      timestamp: new Date(),
      system: {
        uptime: 0,
        loadAverage: [0, 0, 0],
        cpuUsage: 0,
        memoryUsage: { total: 0, used: 0, free: 0, percentage: 0 },
        diskUsage: { total: 0, used: 0, free: 0, percentage: 0 }
      },
      services: {},
      network: {
        connectivity: false,
        sshTunnel: false
      },
      trading: {
        apiConnectivity: false,
        errorRate: 0,
        tradesCount: 0
      },
      alerts: []
    };
  }

  private addAlert(level: Alert['level'], message: string, component: string): void {
    const alert: Alert = {
      level,
      message,
      timestamp: new Date(),
      component
    };
    this.alerts.push(alert);
    console.log(`[${level.toUpperCase()}] ${component}: ${message}`);
  }

  private async getSystemMetrics(): Promise<void> {
    try {
      // System uptime
      this.metrics.system.uptime = os.uptime();

      // Load average
      this.metrics.system.loadAverage = os.loadavg();

      // CPU usage (approximate)
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      this.metrics.system.cpuUsage = Math.round(100 - (totalIdle / totalTick) * 100);

      // Memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      this.metrics.system.memoryUsage = {
        total: Math.round(totalMem / 1024 / 1024), // MB
        used: Math.round(usedMem / 1024 / 1024),   // MB
        free: Math.round(freeMem / 1024 / 1024),   // MB
        percentage: Math.round((usedMem / totalMem) * 100)
      };

      // Disk usage
      try {
        const diskInfo = execSync('df / --output=size,used,avail', { encoding: 'utf8' });
        const lines = diskInfo.trim().split('\n');
        if (lines.length > 1) {
          const [size, used, avail] = lines[1].trim().split(/\s+/).map(Number);
          this.metrics.system.diskUsage = {
            total: Math.round(size / 1024), // MB
            used: Math.round(used / 1024),  // MB
            free: Math.round(avail / 1024), // MB
            percentage: Math.round((used / size) * 100)
          };
        }
      } catch (error) {
        this.addAlert('warning', 'Failed to get disk usage information', 'system');
      }

      // Temperature (Intel NUC specific)
      try {
        const tempOutput = execSync('sensors 2>/dev/null | grep "Core 0" | awk \'{print $3}\' | sed \'s/+//\' | sed \'s/°C//\'', { encoding: 'utf8' });
        if (tempOutput.trim()) {
          this.metrics.system.temperature = parseFloat(tempOutput.trim());
        }
      } catch (error) {
        // Temperature monitoring not available
      }

      // Check thresholds and generate alerts
      this.checkSystemThresholds();

    } catch (error) {
      this.addAlert('critical', `Failed to collect system metrics: ${error}`, 'system');
    }
  }

  private checkSystemThresholds(): void {
    const { system } = this.metrics;

    // CPU usage alerts
    if (system.cpuUsage > 90) {
      this.addAlert('critical', `CPU usage critical: ${system.cpuUsage}%`, 'system');
    } else if (system.cpuUsage > 80) {
      this.addAlert('warning', `CPU usage high: ${system.cpuUsage}%`, 'system');
    }

    // Memory usage alerts
    if (system.memoryUsage.percentage > 95) {
      this.addAlert('critical', `Memory usage critical: ${system.memoryUsage.percentage}%`, 'system');
    } else if (system.memoryUsage.percentage > 85) {
      this.addAlert('warning', `Memory usage high: ${system.memoryUsage.percentage}%`, 'system');
    }

    // Disk usage alerts
    if (system.diskUsage.percentage > 95) {
      this.addAlert('critical', `Disk usage critical: ${system.diskUsage.percentage}%`, 'system');
    } else if (system.diskUsage.percentage > 90) {
      this.addAlert('warning', `Disk usage high: ${system.diskUsage.percentage}%`, 'system');
    }

    // Load average alerts
    const loadAvg1min = system.loadAverage[0];
    const cpuCount = os.cpus().length;
    if (loadAvg1min > cpuCount * 2) {
      this.addAlert('critical', `Load average critical: ${loadAvg1min.toFixed(2)}`, 'system');
    } else if (loadAvg1min > cpuCount * 1.5) {
      this.addAlert('warning', `Load average high: ${loadAvg1min.toFixed(2)}`, 'system');
    }

    // Temperature alerts (if available)
    if (system.temperature) {
      if (system.temperature > 85) {
        this.addAlert('critical', `CPU temperature critical: ${system.temperature}°C`, 'system');
      } else if (system.temperature > 75) {
        this.addAlert('warning', `CPU temperature high: ${system.temperature}°C`, 'system');
      }
    }
  }

  private async checkServices(): Promise<void> {
    const services = [
      'trading-agent',
      'postgresql',
      'nginx',
      'ssh-tunnel',
      'collectd',
      'fail2ban',
      'ufw'
    ];

    for (const service of services) {
      try {
        const isActive = execSync(`systemctl is-active ${service}`, { encoding: 'utf8' }).trim() === 'active';
        const status = execSync(`systemctl status ${service} --no-pager -l`, { encoding: 'utf8' });
        
        // Extract uptime if service is active
        let uptime: string | undefined;
        if (isActive) {
          const uptimeMatch = status.match(/Active: active \(.*\) since (.*?);/);
          if (uptimeMatch) {
            uptime = uptimeMatch[1];
          }
        }

        this.metrics.services[service] = {
          active: isActive,
          status: isActive ? 'active' : 'inactive',
          uptime
        };

        if (!isActive) {
          this.addAlert('critical', `Service ${service} is not running`, 'services');
        }

      } catch (error) {
        this.metrics.services[service] = {
          active: false,
          status: 'error'
        };
        this.addAlert('critical', `Failed to check service ${service}: ${error}`, 'services');
      }
    }
  }

  private async checkNetworkConnectivity(): Promise<void> {
    try {
      // Test internet connectivity
      await axios.get('https://www.google.com', { timeout: 10000 });
      this.metrics.network.connectivity = true;

      // Measure latency
      const start = Date.now();
      await axios.get('https://www.google.com', { timeout: 5000 });
      this.metrics.network.latency = Date.now() - start;

    } catch (error) {
      this.metrics.network.connectivity = false;
      this.addAlert('critical', 'Internet connectivity failed', 'network');
    }

    // Check SSH tunnel status
    try {
      const sshProcesses = execSync('pgrep -f "ssh.*tunnel"', { encoding: 'utf8' });
      this.metrics.network.sshTunnel = sshProcesses.trim().length > 0;

      if (!this.metrics.network.sshTunnel) {
        this.addAlert('critical', 'SSH tunnel is not running', 'network');
      }
    } catch (error) {
      this.metrics.network.sshTunnel = false;
      this.addAlert('critical', 'SSH tunnel is not running', 'network');
    }
  }

  private async checkTradingHealth(): Promise<void> {
    try {
      // Test API connectivity (through SSH tunnel)
      try {
        await axios.get('http://localhost:8443/api/v4/spot/currencies', { timeout: 10000 });
        this.metrics.trading.apiConnectivity = true;
      } catch (error) {
        this.metrics.trading.apiConnectivity = false;
        this.addAlert('critical', 'Gate.io API connectivity failed', 'trading');
      }

      // Analyze trading logs
      const today = new Date().toISOString().split('T')[0];
      
      if (fs.existsSync(`${this.logDir}/trading`)) {
        try {
          // Count trades today
          const tradeLogFiles = fs.readdirSync(`${this.logDir}/trading`)
            .filter(file => file.endsWith('.log'))
            .map(file => `${this.logDir}/trading/${file}`);

          let tradesCount = 0;
          let errorCount = 0;
          let lastTradeTime: Date | undefined;

          for (const logFile of tradeLogFiles) {
            if (fs.existsSync(logFile)) {
              const content = fs.readFileSync(logFile, 'utf8');
              const lines = content.split('\n');

              for (const line of lines) {
                if (line.includes(today)) {
                  if (line.includes('TRADE_EXECUTED')) {
                    tradesCount++;
                    // Extract timestamp
                    const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
                    if (timestampMatch) {
                      const tradeTime = new Date(timestampMatch[1]);
                      if (!lastTradeTime || tradeTime > lastTradeTime) {
                        lastTradeTime = tradeTime;
                      }
                    }
                  }
                  if (line.includes('ERROR')) {
                    errorCount++;
                  }
                }
              }
            }
          }

          this.metrics.trading.tradesCount = tradesCount;
          this.metrics.trading.lastTrade = lastTradeTime;
          this.metrics.trading.errorRate = errorCount;

          // Generate alerts based on trading activity
          if (errorCount > 10) {
            this.addAlert('warning', `High error rate in trading logs: ${errorCount} errors today`, 'trading');
          }

          // Alert if no trades for extended period (if trading is enabled)
          if (lastTradeTime) {
            const hoursSinceLastTrade = (Date.now() - lastTradeTime.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastTrade > 24) {
              this.addAlert('warning', `No trades executed in ${Math.round(hoursSinceLastTrade)} hours`, 'trading');
            }
          }

        } catch (error) {
          this.addAlert('warning', `Failed to analyze trading logs: ${error}`, 'trading');
        }
      }

    } catch (error) {
      this.addAlert('critical', `Failed to check trading health: ${error}`, 'trading');
    }
  }

  private generateReport(): string {
    const report = [];
    
    report.push('🤖 AI CRYPTO TRADING AGENT - HEALTH REPORT');
    report.push('='.repeat(50));
    report.push(`Generated: ${this.metrics.timestamp.toISOString()}`);
    report.push('');

    // System Health
    report.push('📊 SYSTEM HEALTH:');
    report.push(`   Uptime: ${Math.floor(this.metrics.system.uptime / 3600)}h ${Math.floor((this.metrics.system.uptime % 3600) / 60)}m`);
    report.push(`   Load Average: ${this.metrics.system.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
    report.push(`   CPU Usage: ${this.metrics.system.cpuUsage}%`);
    report.push(`   Memory: ${this.metrics.system.memoryUsage.used}MB/${this.metrics.system.memoryUsage.total}MB (${this.metrics.system.memoryUsage.percentage}%)`);
    report.push(`   Disk: ${this.metrics.system.diskUsage.used}MB/${this.metrics.system.diskUsage.total}MB (${this.metrics.system.diskUsage.percentage}%)`);
    if (this.metrics.system.temperature) {
      report.push(`   Temperature: ${this.metrics.system.temperature}°C`);
    }
    report.push('');

    // Service Status
    report.push('🔧 SERVICE STATUS:');
    Object.entries(this.metrics.services).forEach(([name, service]) => {
      const status = service.active ? '✅' : '❌';
      report.push(`   ${status} ${name}: ${service.status}`);
    });
    report.push('');

    // Network Status
    report.push('🌐 NETWORK STATUS:');
    report.push(`   Internet: ${this.metrics.network.connectivity ? '✅' : '❌'}`);
    if (this.metrics.network.latency) {
      report.push(`   Latency: ${this.metrics.network.latency}ms`);
    }
    report.push(`   SSH Tunnel: ${this.metrics.network.sshTunnel ? '✅' : '❌'}`);
    report.push('');

    // Trading Status
    report.push('📈 TRADING STATUS:');
    report.push(`   API Connectivity: ${this.metrics.trading.apiConnectivity ? '✅' : '❌'}`);
    report.push(`   Trades Today: ${this.metrics.trading.tradesCount}`);
    report.push(`   Errors Today: ${this.metrics.trading.errorRate}`);
    if (this.metrics.trading.lastTrade) {
      report.push(`   Last Trade: ${this.metrics.trading.lastTrade.toISOString()}`);
    }
    report.push('');

    // Alerts
    if (this.alerts.length > 0) {
      report.push('🚨 ALERTS:');
      this.alerts.forEach(alert => {
        const icon = alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵';
        report.push(`   ${icon} [${alert.level.toUpperCase()}] ${alert.component}: ${alert.message}`);
      });
    } else {
      report.push('✅ NO ALERTS - System is healthy');
    }

    report.push('');
    report.push('='.repeat(50));

    return report.join('\n');
  }

  private async saveMetrics(): Promise<void> {
    try {
      const metricsDir = `${this.logDir}/performance`;
      if (!fs.existsSync(metricsDir)) {
        fs.mkdirSync(metricsDir, { recursive: true });
      }

      const metricsFile = `${metricsDir}/health-metrics-${new Date().toISOString().split('T')[0]}.json`;
      const existingData = fs.existsSync(metricsFile) ? JSON.parse(fs.readFileSync(metricsFile, 'utf8')) : [];
      
      existingData.push({
        ...this.metrics,
        alerts: this.alerts
      });

      fs.writeFileSync(metricsFile, JSON.stringify(existingData, null, 2));

    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private async sendNotifications(): Promise<void> {
    const criticalAlerts = this.alerts.filter(alert => alert.level === 'critical');
    
    if (criticalAlerts.length > 0) {
      // Send Telegram notification if configured
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      if (telegramToken && telegramChatId) {
        try {
          const message = `🚨 CRITICAL ALERTS - Trading Agent\n\n${criticalAlerts.map(alert => 
            `• ${alert.component}: ${alert.message}`
          ).join('\n')}`;

          await axios.post(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            chat_id: telegramChatId,
            text: message,
            parse_mode: 'HTML'
          });

        } catch (error) {
          console.error('Failed to send Telegram notification:', error);
        }
      }
    }
  }

  async runHealthCheck(): Promise<void> {
    console.log('🔍 Starting system health check...');

    this.metrics.timestamp = new Date();
    this.alerts = [];

    await this.getSystemMetrics();
    await this.checkServices();
    await this.checkNetworkConnectivity();
    await this.checkTradingHealth();

    const report = this.generateReport();
    console.log(report);

    await this.saveMetrics();
    await this.sendNotifications();

    console.log('✅ Health check completed');
  }

  async startContinuousMonitoring(intervalMinutes: number = 5): Promise<void> {
    console.log(`🔄 Starting continuous monitoring (${intervalMinutes} minute intervals)...`);
    
    // Run initial check
    await this.runHealthCheck();

    // Set up interval
    setInterval(async () => {
      try {
        await this.runHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new SystemHealthMonitor();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  switch (command) {
    case 'check':
      monitor.runHealthCheck().catch(console.error);
      break;
    case 'monitor':
      const interval = parseInt(args[1]) || 5;
      monitor.startContinuousMonitoring(interval).catch(console.error);
      break;
    default:
      console.log('Usage:');
      console.log('  tsx system-health-monitor.ts check          # Run single health check');
      console.log('  tsx system-health-monitor.ts monitor [min]  # Start continuous monitoring');
      break;
  }
}

export { SystemHealthMonitor };