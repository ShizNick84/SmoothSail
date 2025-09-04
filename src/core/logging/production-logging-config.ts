/**
 * =============================================================================
 * PRODUCTION LOGGING AND MONITORING CONFIGURATION
 * =============================================================================
 * 
 * This module provides production-specific logging configuration with enhanced
 * monitoring, alerting, and performance metrics collection for the Intel NUC
 * deployment environment.
 * 
 * Features:
 * - Production log levels and file rotation
 * - Centralized logging with proper retention policies
 * - System monitoring and alerting thresholds
 * - Performance metrics collection and reporting
 * - Automated backup and recovery procedures
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from './logger';
import { ProductionLogger } from './production-logger';
import { performanceMonitor } from '../monitoring/performance-monitor';

/**
 * Production logging configuration interface
 */
export interface ProductionLoggingSetup {
  /** Base log directory */
  logDirectory: string;
  /** Log retention policies */
  retention: {
    application: string;
    audit: string;
    security: string;
    trading: string;
    performance: string;
    system: string;
  };
  /** Log rotation settings */
  rotation: {
    maxSize: string;
    maxFiles: string;
    compress: boolean;
  };
  /** Monitoring thresholds */
  thresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    temperature: { warning: number; critical: number };
  };
  /** Alert configuration */
  alerts: {
    enabled: boolean;
    channels: string[];
    escalation: {
      critical: string[];
    };
  };
  /** Backup configuration */
  backup: {
    enabled: boolean;
    schedule: string;
    retention: number;
    compression: boolean;
  };
}

/**
 * Production Logging Configuration Manager
 */
export class ProductionLoggingConfig {
  private config: ProductionLoggingSetup;
  private productionLogger?: ProductionLogger;
  private isInitialized: boolean = false;

  constructor() {
    this.config = this.getDefaultConfiguration();
  }

  /**
   * Get default production configuration
   */
  private getDefaultConfiguration(): ProductionLoggingSetup {
    return {
      logDirectory: process.env.LOG_DIR || '/var/log/trading-agent',
      retention: {
        application: process.env.LOG_RETENTION_APPLICATION || '30d',
        audit: process.env.LOG_RETENTION_AUDIT || '365d',
        security: process.env.LOG_RETENTION_SECURITY || '365d',
        trading: process.env.LOG_RETENTION_TRADING || '90d',
        performance: process.env.LOG_RETENTION_PERFORMANCE || '7d',
        system: process.env.LOG_RETENTION_SYSTEM || '30d'
      },
      rotation: {
        maxSize: process.env.LOG_MAX_SIZE || '100m',
        maxFiles: process.env.LOG_MAX_FILES || '30',
        compress: process.env.LOG_COMPRESS !== 'false'
      },
      thresholds: {
        cpu: {
          warning: parseInt(process.env.CPU_WARNING_THRESHOLD || '70'),
          critical: parseInt(process.env.CPU_CRITICAL_THRESHOLD || '85')
        },
        memory: {
          warning: parseInt(process.env.MEMORY_WARNING_THRESHOLD || '75'),
          critical: parseInt(process.env.MEMORY_CRITICAL_THRESHOLD || '90')
        },
        disk: {
          warning: parseInt(process.env.DISK_WARNING_THRESHOLD || '80'),
          critical: parseInt(process.env.DISK_CRITICAL_THRESHOLD || '95')
        },
        temperature: {
          warning: parseInt(process.env.TEMP_WARNING_THRESHOLD || '70'),
          critical: parseInt(process.env.TEMP_CRITICAL_THRESHOLD || '80')
        }
      },
      alerts: {
        enabled: process.env.ALERTS_ENABLED !== 'false',
        channels: (process.env.ALERT_CHANNELS || 'log,syslog').split(','),
        escalation: {
          critical: (process.env.CRITICAL_ALERT_CHANNELS || 'email,telegram').split(',')
        }
      },
      backup: {
        enabled: process.env.BACKUP_ENABLED !== 'false',
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
        retention: parseInt(process.env.BACKUP_RETENTION || '10'),
        compression: process.env.BACKUP_COMPRESSION !== 'false'
      }
    };
  }

  /**
   * Initialize production logging and monitoring
   */
  public async initializeProductionLogging(): Promise<void> {
    try {
      logger.info('🚀 Initializing production logging and monitoring...');

      // Create log directories
      await this.createLogDirectories();

      // Create production configuration file
      await this.createProductionConfigFile();

      // Initialize production logger
      this.productionLogger = new ProductionLogger('ProductionSystem');

      // Configure log rotation
      await this.configureLogRotation();

      // Setup system monitoring
      await this.setupSystemMonitoring();

      // Setup performance metrics collection
      await this.setupPerformanceMetrics();

      // Setup automated backup
      await this.setupAutomatedBackup();

      // Test logging and monitoring
      await this.testLoggingAndMonitoring();

      this.isInitialized = true;

      logger.info('✅ Production logging and monitoring initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize production logging', error);
      throw error;
    }
  }

  /**
   * Create log directories with proper permissions
   */
  private async createLogDirectories(): Promise<void> {
    const directories = [
      this.config.logDirectory,
      resolve(this.config.logDirectory, 'application'),
      resolve(this.config.logDirectory, 'audit'),
      resolve(this.config.logDirectory, 'security'),
      resolve(this.config.logDirectory, 'trading'),
      resolve(this.config.logDirectory, 'performance'),
      resolve(this.config.logDirectory, 'system')
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o750 });
        logger.info(`📁 Created log directory: ${dir}`);
      }
    }
  }

  /**
   * Create production configuration file
   */
  private async createProductionConfigFile(): Promise<void> {
    const configPath = resolve('/etc/trading-agent/logging/production.json');
    const configDir = resolve('/etc/trading-agent/logging');

    // Create config directory if it doesn't exist
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true, mode: 0o755 });
    }

    const configData = {
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        timestamp: true,
        colorize: false,
        maxFiles: this.config.rotation.maxFiles,
        maxSize: this.config.rotation.maxSize,
        compress: this.config.rotation.compress,
        directories: {
          application: resolve(this.config.logDirectory, 'application'),
          audit: resolve(this.config.logDirectory, 'audit'),
          security: resolve(this.config.logDirectory, 'security'),
          trading: resolve(this.config.logDirectory, 'trading'),
          performance: resolve(this.config.logDirectory, 'performance'),
          system: resolve(this.config.logDirectory, 'system')
        },
        retention: this.config.retention
      },
      monitoring: {
        enabled: true,
        interval: 60000, // 1 minute
        thresholds: this.config.thresholds,
        alerts: this.config.alerts
      },
      backup: this.config.backup
    };

    try {
      writeFileSync(configPath, JSON.stringify(configData, null, 2), { mode: 0o640 });
      logger.info(`⚙️ Created production config file: ${configPath}`);
    } catch (error) {
      // If we can't write to /etc, write to local config
      const localConfigPath = resolve('./config/production-logging.json');
      const localConfigDir = resolve('./config');
      
      if (!existsSync(localConfigDir)) {
        mkdirSync(localConfigDir, { recursive: true });
      }
      
      writeFileSync(localConfigPath, JSON.stringify(configData, null, 2));
      logger.info(`⚙️ Created local production config file: ${localConfigPath}`);
    }
  }

  /**
   * Configure log rotation
   */
  private async configureLogRotation(): Promise<void> {
    const logrotateConfig = `# AI Crypto Trading Agent Log Rotation Configuration
# Rotates logs with proper retention policies

${resolve(this.config.logDirectory, 'application')}/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
    postrotate
        systemctl reload trading-agent || true
    endscript
}

${resolve(this.config.logDirectory, 'trading')}/*.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
    postrotate
        systemctl reload trading-agent || true
    endscript
}

${resolve(this.config.logDirectory, 'security')}/*.log {
    daily
    rotate 365
    compress
    delaycompress
    missingok
    notifempty
    create 600 trading trading
    postrotate
        systemctl reload trading-agent || true
    endscript
}

${resolve(this.config.logDirectory, 'audit')}/*.log {
    daily
    rotate 365
    compress
    delaycompress
    missingok
    notifempty
    create 600 trading trading
    postrotate
        systemctl reload trading-agent || true
    endscript
}

${resolve(this.config.logDirectory, 'performance')}/*.log {
    hourly
    rotate 168
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
}

${resolve(this.config.logDirectory, 'system')}/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
}`;

    try {
      const logrotateConfigPath = '/etc/logrotate.d/trading-agent';
      writeFileSync(logrotateConfigPath, logrotateConfig, { mode: 0o644 });
      logger.info('🔄 Configured log rotation');
    } catch (error) {
      // If we can't write to /etc, save to local config
      const localLogrotateConfig = resolve('./config/logrotate-trading-agent.conf');
      writeFileSync(localLogrotateConfig, logrotateConfig);
      logger.info('🔄 Created local log rotation config');
    }
  }

  /**
   * Setup system monitoring
   */
  private async setupSystemMonitoring(): Promise<void> {
    // Create system health check script
    const healthCheckScript = `#!/bin/bash

# AI Crypto Trading Agent Health Check
# Monitors system health and generates alerts

LOG_FILE="${this.config.logDirectory}/system/health.log"
ALERT_FILE="${this.config.logDirectory}/system/alerts.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Thresholds
CPU_THRESHOLD=${this.config.thresholds.cpu.warning}
MEMORY_THRESHOLD=${this.config.thresholds.memory.warning}
DISK_THRESHOLD=${this.config.thresholds.disk.warning}
TEMP_THRESHOLD=${this.config.thresholds.temperature.warning}

# Check CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d. -f1)
if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
    echo "[$TIMESTAMP] ALERT: High CPU usage: \${CPU_USAGE}%" >> "$ALERT_FILE"
    logger -p local0.warning -t trading-monitor "High CPU usage: \${CPU_USAGE}%"
fi

# Check memory usage
MEMORY_PERCENT=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_PERCENT" -gt "$MEMORY_THRESHOLD" ]; then
    echo "[$TIMESTAMP] ALERT: High memory usage: \${MEMORY_PERCENT}%" >> "$ALERT_FILE"
    logger -p local0.warning -t trading-monitor "High memory usage: \${MEMORY_PERCENT}%"
fi

# Check disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "[$TIMESTAMP] ALERT: High disk usage: \${DISK_USAGE}%" >> "$ALERT_FILE"
    logger -p local0.warning -t trading-monitor "High disk usage: \${DISK_USAGE}%"
fi

# Check trading agent process
if ! pgrep -f "trading-agent" > /dev/null; then
    echo "[$TIMESTAMP] CRITICAL: Trading agent process not running" >> "$ALERT_FILE"
    logger -p local0.error -t trading-monitor "Trading agent process not running"
fi

# Log health status
echo "[$TIMESTAMP] Health check completed - CPU: \${CPU_USAGE}%, Memory: \${MEMORY_PERCENT}%, Disk: \${DISK_USAGE}%" >> "$LOG_FILE"
`;

    try {
      const scriptPath = '/usr/local/bin/trading-health-check';
      writeFileSync(scriptPath, healthCheckScript, { mode: 0o755 });
      logger.info('🏥 Created system health check script');
    } catch (error) {
      // Save to local scripts directory
      const localScriptPath = resolve('./scripts/trading-health-check.sh');
      writeFileSync(localScriptPath, healthCheckScript, { mode: 0o755 });
      logger.info('🏥 Created local system health check script');
    }
  }

  /**
   * Setup performance metrics collection
   */
  private async setupPerformanceMetrics(): Promise<void> {
    // Create performance monitoring script
    const performanceScript = `#!/bin/bash

# AI Crypto Trading Agent Performance Monitor
# Collects system performance metrics for monitoring

LOG_FILE="${this.config.logDirectory}/performance/metrics.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Collect CPU metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
CPU_TEMP=$(sensors | grep "Core 0" | awk '{print $3}' | sed 's/+//;s/°C//' || echo "N/A")

# Collect memory metrics
MEMORY_INFO=$(free -m | grep "Mem:")
MEMORY_TOTAL=$(echo $MEMORY_INFO | awk '{print $2}')
MEMORY_USED=$(echo $MEMORY_INFO | awk '{print $3}')
MEMORY_PERCENT=$(echo "scale=2; $MEMORY_USED * 100 / $MEMORY_TOTAL" | bc)

# Collect disk metrics
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

# Collect trading process metrics
TRADING_PID=$(pgrep -f "trading-agent" | head -1)
if [ -n "$TRADING_PID" ]; then
    TRADING_CPU=$(ps -p $TRADING_PID -o %cpu --no-headers | tr -d ' ')
    TRADING_MEM=$(ps -p $TRADING_PID -o %mem --no-headers | tr -d ' ')
else
    TRADING_CPU="0"
    TRADING_MEM="0"
fi

# Log metrics in JSON format
echo "{\\"timestamp\\":\\"$TIMESTAMP\\",\\"system\\":{\\"cpu_usage\\":$CPU_USAGE,\\"cpu_temp\\":\\"$CPU_TEMP\\",\\"memory_percent\\":$MEMORY_PERCENT,\\"memory_used_mb\\":$MEMORY_USED,\\"memory_total_mb\\":$MEMORY_TOTAL,\\"disk_usage_percent\\":$DISK_USAGE},\\"trading_process\\":{\\"cpu_percent\\":$TRADING_CPU,\\"memory_percent\\":$TRADING_MEM}}" >> "$LOG_FILE"
`;

    try {
      const scriptPath = '/usr/local/bin/trading-performance-monitor';
      writeFileSync(scriptPath, performanceScript, { mode: 0o755 });
      logger.info('📊 Created performance monitoring script');
    } catch (error) {
      // Save to local scripts directory
      const localScriptPath = resolve('./scripts/trading-performance-monitor.sh');
      writeFileSync(localScriptPath, performanceScript, { mode: 0o755 });
      logger.info('📊 Created local performance monitoring script');
    }
  }

  /**
   * Setup automated backup
   */
  private async setupAutomatedBackup(): Promise<void> {
    const backupScript = `#!/bin/bash

# AI Crypto Trading Agent Automated Backup
# Creates compressed backups of configuration, logs, and data

BACKUP_DIR="/var/backups/trading-agent"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_NAME="backup_\${TIMESTAMP}"
BACKUP_PATH="\${BACKUP_DIR}/\${BACKUP_NAME}"
LOG_FILE="${this.config.logDirectory}/system/backup.log"

# Create backup directory
mkdir -p "$BACKUP_PATH"

log_backup() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_backup "Starting backup: $BACKUP_NAME"

# Backup configuration files
log_backup "Backing up configuration files..."
mkdir -p "$BACKUP_PATH/config"
cp -r /opt/trading-agent/.env* "$BACKUP_PATH/config/" 2>/dev/null || true
cp -r /etc/trading-agent/ "$BACKUP_PATH/config/" 2>/dev/null || true

# Backup recent logs (last 7 days)
log_backup "Backing up recent logs..."
mkdir -p "$BACKUP_PATH/logs"
find ${this.config.logDirectory} -name "*.log" -mtime -7 -exec cp {} "$BACKUP_PATH/logs/" \\; 2>/dev/null || true

# Create compressed archive
log_backup "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "\${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

# Cleanup old backups (keep last ${this.config.backup.retention})
log_backup "Cleaning up old backups..."
ls -t "\${BACKUP_DIR}"/backup_*.tar.gz | tail -n +$((${this.config.backup.retention} + 1)) | xargs rm -f 2>/dev/null || true

BACKUP_SIZE=$(du -h "\${BACKUP_DIR}/\${BACKUP_NAME}.tar.gz" | cut -f1)
log_backup "Backup completed: \${BACKUP_NAME}.tar.gz (\${BACKUP_SIZE})"
`;

    try {
      const scriptPath = '/usr/local/bin/trading-backup';
      writeFileSync(scriptPath, backupScript, { mode: 0o755 });
      logger.info('💾 Created automated backup script');
    } catch (error) {
      // Save to local scripts directory
      const localScriptPath = resolve('./scripts/trading-backup.sh');
      writeFileSync(localScriptPath, backupScript, { mode: 0o755 });
      logger.info('💾 Created local automated backup script');
    }
  }

  /**
   * Test logging and monitoring setup
   */
  private async testLoggingAndMonitoring(): Promise<void> {
    logger.info('🧪 Testing production logging and monitoring setup...');

    // Test log directory creation
    const testLogFile = resolve(this.config.logDirectory, 'application', 'test.log');
    try {
      writeFileSync(testLogFile, `Test log entry: ${new Date().toISOString()}\n`);
      logger.info('✅ Log directory write test passed');
    } catch (error) {
      logger.warn('⚠️ Log directory write test failed', { error: error.message });
    }

    // Test production logger
    if (this.productionLogger) {
      this.productionLogger.info('Production logging test message');
      logger.info('✅ Production logger test passed');
    }

    // Test performance monitoring
    try {
      await performanceMonitor.startMonitoring(60000); // 1 minute interval
      logger.info('✅ Performance monitoring test passed');
    } catch (error) {
      logger.warn('⚠️ Performance monitoring test failed', { error: error.message });
    }

    logger.info('🎯 Production logging and monitoring tests completed');
  }

  /**
   * Get production logging statistics
   */
  public getProductionStats(): {
    isInitialized: boolean;
    config: ProductionLoggingSetup;
    logDirectories: string[];
    timestamp: number;
  } {
    return {
      isInitialized: this.isInitialized,
      config: this.config,
      logDirectories: [
        resolve(this.config.logDirectory, 'application'),
        resolve(this.config.logDirectory, 'audit'),
        resolve(this.config.logDirectory, 'security'),
        resolve(this.config.logDirectory, 'trading'),
        resolve(this.config.logDirectory, 'performance'),
        resolve(this.config.logDirectory, 'system')
      ],
      timestamp: Date.now()
    };
  }

  /**
   * Update configuration
   */
  public updateConfiguration(updates: Partial<ProductionLoggingSetup>): void {
    this.config = { ...this.config, ...updates };
    logger.info('⚙️ Production logging configuration updated', { updates });
  }

  /**
   * Stop production logging
   */
  public stopProductionLogging(): void {
    if (this.productionLogger) {
      this.productionLogger.stopProductionLogging();
    }
    
    performanceMonitor.stopMonitoring();
    
    this.isInitialized = false;
    logger.info('🛑 Production logging and monitoring stopped');
  }
}

// Create and export singleton instance
export const productionLoggingConfig = new ProductionLoggingConfig();