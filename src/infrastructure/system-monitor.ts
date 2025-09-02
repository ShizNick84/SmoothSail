/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - INTEL NUC SYSTEM MONITOR
 * =============================================================================
 * 
 * This service provides comprehensive hardware monitoring for Intel NUC systems
 * running the AI crypto trading agent. It monitors CPU, RAM, SSD, network, and
 * thermal conditions to ensure optimal trading performance.
 * 
 * CRITICAL PERFORMANCE NOTICE:
 * This system monitors hardware that controls trading operations. Hardware
 * failures or performance degradation could impact trading decisions and
 * result in financial losses. All metrics are continuously monitored.
 * 
 * Hardware Specifications:
 * - Intel NUC with i5 CPU
 * - 12GB RAM
 * - 256GB M.2 SSD
 * - Wireless and Gigabit Ethernet
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import * as si from 'systeminformation';
import { logger } from '@/core/logging/logger';
import { auditService } from '@/security/audit-service';

/**
 * Interface for CPU metrics
 */
export interface CPUMetrics {
  /** CPU utilization percentage */
  utilization: number;
  /** CPU temperature in Celsius */
  temperature: number;
  /** CPU frequency in MHz */
  frequency: number;
  /** Load average (1, 5, 15 minutes) */
  loadAverage: number[];
  /** Number of processes */
  processes: number;
  /** CPU cores information */
  cores: {
    physical: number;
    logical: number;
  };
  /** CPU brand and model */
  brand: string;
  /** CPU speed in GHz */
  speed: number;
}

/**
 * Interface for RAM metrics
 */
export interface RAMMetrics {
  /** Total RAM in bytes */
  total: number;
  /** Used RAM in bytes */
  used: number;
  /** Free RAM in bytes */
  free: number;
  /** RAM utilization percentage */
  utilization: number;
  /** Cached memory in bytes */
  cached: number;
  /** Buffer memory in bytes */
  buffers: number;
  /** Available memory in bytes */
  available: number;
  /** Swap usage */
  swap: {
    total: number;
    used: number;
    free: number;
  };
}/**
 * 
Interface for SSD metrics
 */
export interface SSDMetrics {
  /** Total storage in bytes */
  total: number;
  /** Used storage in bytes */
  used: number;
  /** Free storage in bytes */
  free: number;
  /** Storage utilization percentage */
  utilization: number;
  /** Read IOPS */
  readIOPS: number;
  /** Write IOPS */
  writeIOPS: number;
  /** Read throughput in MB/s */
  readThroughput: number;
  /** Write throughput in MB/s */
  writeThroughput: number;
  /** SSD health percentage */
  health: number;
  /** SSD temperature in Celsius */
  temperature: number;
}

/**
 * Interface for network metrics
 */
export interface NetworkMetrics {
  /** Network interfaces */
  interfaces: NetworkInterface[];
  /** Total bytes received */
  totalBytesReceived: number;
  /** Total bytes sent */
  totalBytesSent: number;
  /** Current download speed in Mbps */
  downloadSpeed: number;
  /** Current upload speed in Mbps */
  uploadSpeed: number;
  /** Network latency in ms */
  latency: number;
  /** Packet loss percentage */
  packetLoss: number;
}

/**
 * Interface for network interface
 */
export interface NetworkInterface {
  /** Interface name */
  name: string;
  /** Interface type (ethernet, wireless) */
  type: string;
  /** IP address */
  ip: string;
  /** MAC address */
  mac: string;
  /** Connection status */
  isUp: boolean;
  /** Link speed in Mbps */
  speed: number;
  /** Bytes received */
  bytesReceived: number;
  /** Bytes sent */
  bytesSent: number;
}

/**
 * Interface for system health status
 */
export interface SystemHealthStatus {
  /** Overall system health score (0-100) */
  overallHealth: number;
  /** Individual component health */
  components: {
    cpu: HealthStatus;
    ram: HealthStatus;
    ssd: HealthStatus;
    network: HealthStatus;
    thermal: HealthStatus;
  };
  /** System alerts */
  alerts: SystemAlert[];
  /** Performance recommendations */
  recommendations: string[];
  /** Last update timestamp */
  lastUpdated: Date;
}/**
 * Int
erface for component health status
 */
export interface HealthStatus {
  /** Health score (0-100) */
  score: number;
  /** Status level */
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  /** Status message */
  message: string;
  /** Metric value */
  value: number;
  /** Threshold values */
  thresholds: {
    warning: number;
    critical: number;
  };
}

/**
 * Interface for system alert
 */
export interface SystemAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'CPU' | 'RAM' | 'SSD' | 'NETWORK' | 'THERMAL';
  /** Alert severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Alert message */
  message: string;
  /** Current value */
  currentValue: number;
  /** Threshold value */
  threshold: number;
  /** Alert timestamp */
  timestamp: Date;
  /** Whether alert is active */
  isActive: boolean;
}

/**
 * Intel NUC System Monitor
 * Provides comprehensive hardware monitoring and performance optimization
 */
export class SystemMonitor {
  /** Monitoring interval in milliseconds */
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  /** Current system metrics */
  private currentMetrics: {
    cpu?: CPUMetrics;
    ram?: RAMMetrics;
    ssd?: SSDMetrics;
    network?: NetworkMetrics;
  } = {};
  
  /** Active system alerts */
  private activeAlerts: Map<string, SystemAlert> = new Map();
  
  /** Monitoring configuration */
  private config = {
    monitoringIntervalMs: 30000, // 30 seconds
    cpuWarningThreshold: parseInt(process.env.CPU_USAGE_WARNING_THRESHOLD || '70'),
    cpuCriticalThreshold: parseInt(process.env.CPU_USAGE_CRITICAL_THRESHOLD || '85'),
    ramWarningThreshold: parseInt(process.env.MEMORY_USAGE_WARNING_THRESHOLD || '75'),
    ramCriticalThreshold: parseInt(process.env.MEMORY_USAGE_CRITICAL_THRESHOLD || '90'),
    ssdWarningThreshold: parseInt(process.env.DISK_USAGE_WARNING_THRESHOLD || '80'),
    ssdCriticalThreshold: parseInt(process.env.DISK_USAGE_CRITICAL_THRESHOLD || '95'),
    tempWarningThreshold: parseInt(process.env.CPU_TEMP_WARNING_THRESHOLD || '70'),
    tempCriticalThreshold: parseInt(process.env.CPU_TEMP_CRITICAL_THRESHOLD || '80'),
    networkLatencyWarning: parseInt(process.env.NETWORK_LATENCY_WARNING_MS || '100'),
    networkLatencyCritical: parseInt(process.env.NETWORK_LATENCY_CRITICAL_MS || '500')
  };

  constructor() {
    logger.info('🖥️ Intel NUC System Monitor initializing...');
  }

  /**
   * Start hardware monitoring
   * Begins continuous monitoring of all system components
   * 
   * @returns Promise<void>
   */
  public async startHardwareMonitoring(): Promise<void> {
    try {
      logger.info('📊 Starting Intel NUC hardware monitoring...');
      
      // Perform initial system scan
      await this.performSystemScan();
      
      // Start continuous monitoring
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.performSystemScan();
        } catch (error) {
          logger.error('❌ System monitoring error:', error);
        }
      }, this.config.monitoringIntervalMs);
      
      logger.info('✅ Hardware monitoring started successfully');
      
      // Audit log
      await auditService.createAuditEntry({
        auditId: `sys_mon_start_${Date.now()}`,
        eventType: 'SYSTEM_MONITORING_START',
        actor: 'SYSTEM',
        resource: 'HARDWARE_MONITOR',
        action: 'START_MONITORING',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: { monitoringInterval: this.config.monitoringIntervalMs }
      });
      
    } catch (error) {
      logger.error('❌ Failed to start hardware monitoring:', error);
      throw new Error('Hardware monitoring initialization failed');
    }
  }  /**
  
 * Perform comprehensive system scan
   * Collects metrics from all hardware components
   * 
   * @returns Promise<void>
   */
  private async performSystemScan(): Promise<void> {
    try {
      // Collect CPU metrics
      this.currentMetrics.cpu = await this.collectCPUMetrics();
      
      // Collect RAM metrics
      this.currentMetrics.ram = await this.collectRAMMetrics();
      
      // Collect SSD metrics
      this.currentMetrics.ssd = await this.collectSSDMetrics();
      
      // Collect network metrics
      this.currentMetrics.network = await this.collectNetworkMetrics();
      
      // Analyze metrics and generate alerts
      await this.analyzeMetricsAndGenerateAlerts();
      
      // Log system status
      this.logSystemStatus();
      
    } catch (error) {
      logger.error('❌ System scan failed:', error);
    }
  }

  /**
   * Collect CPU metrics
   * Gathers comprehensive CPU performance data
   * 
   * @returns Promise<CPUMetrics> CPU metrics
   */
  private async collectCPUMetrics(): Promise<CPUMetrics> {
    try {
      const [cpuData, currentLoad, cpuTemp, processes] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
        si.cpuTemperature(),
        si.processes()
      ]);
      
      return {
        utilization: Math.round(currentLoad.currentLoad),
        temperature: cpuTemp.main || 0,
        frequency: cpuData.speed || 0,
        loadAverage: [currentLoad.avgLoad || 0],
        processes: processes.all || 0,
        cores: {
          physical: cpuData.physicalCores || 0,
          logical: cpuData.cores || 0
        },
        brand: cpuData.brand || 'Unknown',
        speed: cpuData.speed || 0
      };
      
    } catch (error) {
      logger.error('❌ Failed to collect CPU metrics:', error);
      throw error;
    }
  }

  /**
   * Collect RAM metrics
   * Gathers comprehensive memory usage data
   * 
   * @returns Promise<RAMMetrics> RAM metrics
   */
  private async collectRAMMetrics(): Promise<RAMMetrics> {
    try {
      const memData = await si.mem();
      
      return {
        total: memData.total,
        used: memData.used,
        free: memData.free,
        utilization: Math.round((memData.used / memData.total) * 100),
        cached: memData.cached || 0,
        buffers: memData.buffers || 0,
        available: memData.available,
        swap: {
          total: memData.swaptotal || 0,
          used: memData.swapused || 0,
          free: memData.swapfree || 0
        }
      };
      
    } catch (error) {
      logger.error('❌ Failed to collect RAM metrics:', error);
      throw error;
    }
  }

  /**
   * Collect SSD metrics
   * Gathers comprehensive storage performance data
   * 
   * @returns Promise<SSDMetrics> SSD metrics
   */
  private async collectSSDMetrics(): Promise<SSDMetrics> {
    try {
      const [fsSize, diskIO, blockDevices] = await Promise.all([
        si.fsSize(),
        si.disksIO(),
        si.blockDevices()
      ]);
      
      // Get primary disk (usually the first one)
      const primaryDisk = fsSize[0] || {};
      const primaryBlockDevice = blockDevices[0] || {};
      
      return {
        total: primaryDisk.size || 0,
        used: primaryDisk.used || 0,
        free: primaryDisk.available || 0,
        utilization: Math.round(primaryDisk.use || 0),
        readIOPS: diskIO.rIO || 0,
        writeIOPS: diskIO.wIO || 0,
        readThroughput: (diskIO.rIO_sec || 0) / 1024 / 1024, // Convert to MB/s
        writeThroughput: (diskIO.wIO_sec || 0) / 1024 / 1024, // Convert to MB/s
        health: 100, // Would need SMART data for actual health
        temperature: primaryBlockDevice.temperature || 0
      };
      
    } catch (error) {
      logger.error('❌ Failed to collect SSD metrics:', error);
      throw error;
    }
  }  /**

   * Collect network metrics
   * Gathers comprehensive network performance data
   * 
   * @returns Promise<NetworkMetrics> Network metrics
   */
  private async collectNetworkMetrics(): Promise<NetworkMetrics> {
    try {
      const [networkInterfaces, networkStats] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats()
      ]);
      
      const interfaces: NetworkInterface[] = networkInterfaces.map(iface => ({
        name: iface.iface,
        type: iface.type || 'unknown',
        ip: iface.ip4 || '',
        mac: iface.mac || '',
        isUp: !iface.internal && iface.operstate === 'up',
        speed: iface.speed || 0,
        bytesReceived: 0, // Will be updated from networkStats
        bytesSent: 0 // Will be updated from networkStats
      }));
      
      // Update interface statistics
      networkStats.forEach(stat => {
        const iface = interfaces.find(i => i.name === stat.iface);
        if (iface) {
          iface.bytesReceived = stat.rx_bytes || 0;
          iface.bytesSent = stat.tx_bytes || 0;
        }
      });
      
      const totalBytesReceived = networkStats.reduce((sum, stat) => sum + (stat.rx_bytes || 0), 0);
      const totalBytesSent = networkStats.reduce((sum, stat) => sum + (stat.tx_bytes || 0), 0);
      
      // Calculate current speeds (simplified)
      const downloadSpeed = networkStats.reduce((sum, stat) => sum + (stat.rx_sec || 0), 0) / 1024 / 1024 * 8; // Mbps
      const uploadSpeed = networkStats.reduce((sum, stat) => sum + (stat.tx_sec || 0), 0) / 1024 / 1024 * 8; // Mbps
      
      return {
        interfaces,
        totalBytesReceived,
        totalBytesSent,
        downloadSpeed,
        uploadSpeed,
        latency: 0, // Would need ping test for actual latency
        packetLoss: 0 // Would need ping test for packet loss
      };
      
    } catch (error) {
      logger.error('❌ Failed to collect network metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze metrics and generate alerts
   * Evaluates system metrics against thresholds and creates alerts
   * 
   * @returns Promise<void>
   */
  private async analyzeMetricsAndGenerateAlerts(): Promise<void> {
    try {
      const alerts: SystemAlert[] = [];
      
      // Analyze CPU metrics
      if (this.currentMetrics.cpu) {
        const cpu = this.currentMetrics.cpu;
        
        if (cpu.utilization >= this.config.cpuCriticalThreshold) {
          alerts.push(this.createAlert('CPU', 'CRITICAL', 
            `CPU utilization critical: ${cpu.utilization}%`, 
            cpu.utilization, this.config.cpuCriticalThreshold));
        } else if (cpu.utilization >= this.config.cpuWarningThreshold) {
          alerts.push(this.createAlert('CPU', 'HIGH', 
            `CPU utilization high: ${cpu.utilization}%`, 
            cpu.utilization, this.config.cpuWarningThreshold));
        }
        
        if (cpu.temperature >= this.config.tempCriticalThreshold) {
          alerts.push(this.createAlert('THERMAL', 'CRITICAL', 
            `CPU temperature critical: ${cpu.temperature}°C`, 
            cpu.temperature, this.config.tempCriticalThreshold));
        } else if (cpu.temperature >= this.config.tempWarningThreshold) {
          alerts.push(this.createAlert('THERMAL', 'HIGH', 
            `CPU temperature high: ${cpu.temperature}°C`, 
            cpu.temperature, this.config.tempWarningThreshold));
        }
      }
      
      // Analyze RAM metrics
      if (this.currentMetrics.ram) {
        const ram = this.currentMetrics.ram;
        
        if (ram.utilization >= this.config.ramCriticalThreshold) {
          alerts.push(this.createAlert('RAM', 'CRITICAL', 
            `Memory utilization critical: ${ram.utilization}%`, 
            ram.utilization, this.config.ramCriticalThreshold));
        } else if (ram.utilization >= this.config.ramWarningThreshold) {
          alerts.push(this.createAlert('RAM', 'HIGH', 
            `Memory utilization high: ${ram.utilization}%`, 
            ram.utilization, this.config.ramWarningThreshold));
        }
      }
      
      // Analyze SSD metrics
      if (this.currentMetrics.ssd) {
        const ssd = this.currentMetrics.ssd;
        
        if (ssd.utilization >= this.config.ssdCriticalThreshold) {
          alerts.push(this.createAlert('SSD', 'CRITICAL', 
            `Storage utilization critical: ${ssd.utilization}%`, 
            ssd.utilization, this.config.ssdCriticalThreshold));
        } else if (ssd.utilization >= this.config.ssdWarningThreshold) {
          alerts.push(this.createAlert('SSD', 'HIGH', 
            `Storage utilization high: ${ssd.utilization}%`, 
            ssd.utilization, this.config.ssdWarningThreshold));
        }
      }
      
      // Process new alerts
      for (const alert of alerts) {
        await this.processAlert(alert);
      }
      
    } catch (error) {
      logger.error('❌ Failed to analyze metrics:', error);
    }
  }  /**

   * Create system alert
   * Creates a new system alert with specified parameters
   * 
   * @param type - Alert type
   * @param severity - Alert severity
   * @param message - Alert message
   * @param currentValue - Current metric value
   * @param threshold - Threshold value
   * @returns SystemAlert New alert
   */
  private createAlert(
    type: 'CPU' | 'RAM' | 'SSD' | 'NETWORK' | 'THERMAL',
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    message: string,
    currentValue: number,
    threshold: number
  ): SystemAlert {
    return {
      id: `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      type,
      severity,
      message,
      currentValue,
      threshold,
      timestamp: new Date(),
      isActive: true
    };
  }

  /**
   * Process system alert
   * Handles new alerts and triggers appropriate responses
   * 
   * @param alert - System alert to process
   * @returns Promise<void>
   */
  private async processAlert(alert: SystemAlert): Promise<void> {
    try {
      // Check if similar alert already exists
      const existingAlert = Array.from(this.activeAlerts.values())
        .find(a => a.type === alert.type && a.severity === alert.severity && a.isActive);
      
      if (existingAlert) {
        // Update existing alert
        existingAlert.currentValue = alert.currentValue;
        existingAlert.timestamp = alert.timestamp;
        return;
      }
      
      // Add new alert
      this.activeAlerts.set(alert.id, alert);
      
      // Log alert
      logger.warn(`⚠️ System Alert: ${alert.message}`, {
        type: alert.type,
        severity: alert.severity,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
      
      // Create audit entry for critical alerts
      if (alert.severity === 'CRITICAL') {
        await auditService.createAuditEntry({
          auditId: `sys_alert_${alert.id}`,
          eventType: 'CRITICAL_SYSTEM_ALERT',
          actor: 'SYSTEM_MONITOR',
          resource: `HARDWARE_${alert.type}`,
          action: 'GENERATE_ALERT',
          result: 'SUCCESS',
          timestamp: alert.timestamp,
          auditData: {
            alertType: alert.type,
            severity: alert.severity,
            currentValue: alert.currentValue,
            threshold: alert.threshold
          }
        });
      }
      
      // TODO: Send notifications for critical alerts
      // This would integrate with notification service
      
    } catch (error) {
      logger.error('❌ Failed to process alert:', error);
    }
  }

  /**
   * Log system status
   * Logs current system metrics for monitoring
   */
  private logSystemStatus(): void {
    const { cpu, ram, ssd, network } = this.currentMetrics;
    
    logger.debug('📊 System Status Update', {
      cpu: cpu ? {
        utilization: cpu.utilization,
        temperature: cpu.temperature,
        frequency: cpu.frequency
      } : null,
      ram: ram ? {
        utilization: ram.utilization,
        used: Math.round(ram.used / 1024 / 1024 / 1024 * 100) / 100, // GB
        total: Math.round(ram.total / 1024 / 1024 / 1024 * 100) / 100 // GB
      } : null,
      ssd: ssd ? {
        utilization: ssd.utilization,
        used: Math.round(ssd.used / 1024 / 1024 / 1024 * 100) / 100, // GB
        total: Math.round(ssd.total / 1024 / 1024 / 1024 * 100) / 100 // GB
      } : null,
      network: network ? {
        downloadSpeed: Math.round(network.downloadSpeed * 100) / 100,
        uploadSpeed: Math.round(network.uploadSpeed * 100) / 100,
        activeInterfaces: network.interfaces.filter(i => i.isUp).length
      } : null,
      activeAlerts: this.activeAlerts.size
    });
  }

  /**
   * Get current system health status
   * Returns comprehensive system health information
   * 
   * @returns Promise<SystemHealthStatus> System health status
   */
  public async getSystemHealthStatus(): Promise<SystemHealthStatus> {
    try {
      const { cpu, ram, ssd, network } = this.currentMetrics;
      
      // Calculate component health scores
      const cpuHealth = this.calculateComponentHealth(
        cpu?.utilization || 0, 
        this.config.cpuWarningThreshold, 
        this.config.cpuCriticalThreshold,
        'CPU utilization'
      );
      
      const ramHealth = this.calculateComponentHealth(
        ram?.utilization || 0, 
        this.config.ramWarningThreshold, 
        this.config.ramCriticalThreshold,
        'Memory utilization'
      );
      
      const ssdHealth = this.calculateComponentHealth(
        ssd?.utilization || 0, 
        this.config.ssdWarningThreshold, 
        this.config.ssdCriticalThreshold,
        'Storage utilization'
      );
      
      const thermalHealth = this.calculateComponentHealth(
        cpu?.temperature || 0, 
        this.config.tempWarningThreshold, 
        this.config.tempCriticalThreshold,
        'CPU temperature'
      );
      
      const networkHealth: HealthStatus = {
        score: network?.interfaces.filter(i => i.isUp).length > 0 ? 100 : 0,
        status: network?.interfaces.filter(i => i.isUp).length > 0 ? 'EXCELLENT' : 'CRITICAL',
        message: `${network?.interfaces.filter(i => i.isUp).length || 0} active interfaces`,
        value: network?.interfaces.filter(i => i.isUp).length || 0,
        thresholds: { warning: 1, critical: 0 }
      };
      
      // Calculate overall health score
      const overallHealth = Math.round(
        (cpuHealth.score + ramHealth.score + ssdHealth.score + thermalHealth.score + networkHealth.score) / 5
      );
      
      // Generate recommendations
      const recommendations: string[] = [];
      if (cpuHealth.score < 70) recommendations.push('Consider reducing CPU-intensive operations');
      if (ramHealth.score < 70) recommendations.push('Consider freeing up memory or adding more RAM');
      if (ssdHealth.score < 70) recommendations.push('Consider cleaning up disk space');
      if (thermalHealth.score < 70) recommendations.push('Check system cooling and ventilation');
      if (networkHealth.score < 70) recommendations.push('Check network connectivity');
      
      return {
        overallHealth,
        components: {
          cpu: cpuHealth,
          ram: ramHealth,
          ssd: ssdHealth,
          network: networkHealth,
          thermal: thermalHealth
        },
        alerts: Array.from(this.activeAlerts.values()).filter(a => a.isActive),
        recommendations,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      logger.error('❌ Failed to get system health status:', error);
      throw error;
    }
  }

  /**
   * Calculate component health score
   * Determines health score based on current value and thresholds
   * 
   * @param currentValue - Current metric value
   * @param warningThreshold - Warning threshold
   * @param criticalThreshold - Critical threshold
   * @param description - Component description
   * @returns HealthStatus Component health status
   */
  private calculateComponentHealth(
    currentValue: number,
    warningThreshold: number,
    criticalThreshold: number,
    description: string
  ): HealthStatus {
    let score: number;
    let status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
    let message: string;
    
    if (currentValue >= criticalThreshold) {
      score = Math.max(0, 100 - ((currentValue - criticalThreshold) / criticalThreshold) * 100);
      status = 'CRITICAL';
      message = `${description} is critical (${currentValue})`;
    } else if (currentValue >= warningThreshold) {
      score = Math.max(30, 100 - ((currentValue - warningThreshold) / (criticalThreshold - warningThreshold)) * 70);
      status = 'WARNING';
      message = `${description} is elevated (${currentValue})`;
    } else if (currentValue >= warningThreshold * 0.7) {
      score = Math.max(70, 100 - (currentValue / warningThreshold) * 30);
      status = 'GOOD';
      message = `${description} is good (${currentValue})`;
    } else {
      score = 100;
      status = 'EXCELLENT';
      message = `${description} is excellent (${currentValue})`;
    }
    
    return {
      score: Math.round(score),
      status,
      message,
      value: currentValue,
      thresholds: {
        warning: warningThreshold,
        critical: criticalThreshold
      }
    };
  }

  /**
   * Validate system requirements
   * Checks if system meets minimum requirements for trading
   * 
   * @returns Promise<{ meetsRequirements: boolean; warnings: string[] }> Validation result
   */
  public async validateSystemRequirements(): Promise<{ meetsRequirements: boolean; warnings: string[] }> {
    try {
      const warnings: string[] = [];
      let meetsRequirements = true;
      
      const { cpu, ram, ssd } = this.currentMetrics;
      
      // Check CPU requirements (i5 or better)
      if (cpu && !cpu.brand.toLowerCase().includes('i5') && !cpu.brand.toLowerCase().includes('i7')) {
        warnings.push(`CPU may not meet requirements: ${cpu.brand} (recommended: Intel i5 or better)`);
      }
      
      // Check RAM requirements (12GB minimum)
      if (ram && ram.total < 12 * 1024 * 1024 * 1024) {
        warnings.push(`RAM below recommended: ${Math.round(ram.total / 1024 / 1024 / 1024)}GB (recommended: 12GB)`);
        meetsRequirements = false;
      }
      
      // Check SSD requirements (256GB minimum)
      if (ssd && ssd.total < 256 * 1024 * 1024 * 1024) {
        warnings.push(`Storage below recommended: ${Math.round(ssd.total / 1024 / 1024 / 1024)}GB (recommended: 256GB)`);
      }
      
      // Check available storage (at least 50GB free)
      if (ssd && ssd.free < 50 * 1024 * 1024 * 1024) {
        warnings.push(`Low storage space: ${Math.round(ssd.free / 1024 / 1024 / 1024)}GB free (recommended: 50GB+)`);
        meetsRequirements = false;
      }
      
      return { meetsRequirements, warnings };
      
    } catch (error) {
      logger.error('❌ Failed to validate system requirements:', error);
      return { meetsRequirements: false, warnings: ['System validation failed'] };
    }
  }

  /**
   * Get current system metrics
   * Returns the most recent system metrics
   * 
   * @returns Current system metrics
   */
  public getCurrentMetrics(): {
    cpu?: CPUMetrics;
    ram?: RAMMetrics;
    ssd?: SSDMetrics;
    network?: NetworkMetrics;
  } {
    return { ...this.currentMetrics };
  }

  /**
   * Stop hardware monitoring
   * Stops continuous monitoring and cleans up resources
   */
  public stopHardwareMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('🛑 Hardware monitoring stopped');
    }
  }

  /**
   * Initialize performance optimization
   * Sets up performance optimization integration
   */
  public async initializePerformanceOptimization(): Promise<void> {
    logger.info('⚡ Initializing performance optimization integration...');
    // Performance optimization is handled by PerformanceOptimizer class
    // This method provides integration point for system monitoring
    logger.info('✅ Performance optimization integration ready');
  }

  /**
   * Setup thermal management
   * Sets up thermal monitoring integration
   */
  public async setupThermalManagement(): Promise<void> {
    logger.info('🌡️ Setting up thermal management integration...');
    // Thermal management is handled by PerformanceOptimizer class
    // This method provides integration point for system monitoring
    logger.info('✅ Thermal management integration ready');
  }

  /**
   * Get system monitor status
   * Returns current status for monitoring
   * 
   * @returns Object containing status information
   */
  public getStatus(): {
    isMonitoring: boolean;
    activeAlerts: number;
    lastScanTime: Date | null;
    monitoringInterval: number;
    timestamp: number;
  } {
    return {
      isMonitoring: this.monitoringInterval !== null,
      activeAlerts: this.activeAlerts.size,
      lastScanTime: null, // Would track last scan time
      monitoringInterval: this.config.monitoringIntervalMs,
      timestamp: Date.now()
    };
  }
}

// =============================================================================
// INTEL NUC SYSTEM MONITORING NOTES
// =============================================================================
// 1. Continuous monitoring of CPU, RAM, SSD, and network performance
// 2. Real-time alerting for performance issues and hardware problems
// 3. Thermal monitoring to prevent overheating during intensive trading
// 4. Storage monitoring to prevent disk space issues
// 5. Network monitoring for connectivity and performance issues
// 6. System health scoring for overall system assessment
// 7. Hardware requirement validation for optimal trading performance
// 8. Comprehensive logging and audit trails for all monitoring activities
// =============================================================================
