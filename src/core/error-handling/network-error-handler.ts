/**
 * =============================================================================
 * NETWORK AND INFRASTRUCTURE ERROR HANDLING
 * =============================================================================
 * 
 * Comprehensive error handling for network and infrastructure components:
 * - SSH tunnel error handling and auto-reconnection
 * - Database connection error handling with retry mechanisms
 * - Network failure detection and recovery systems
 * - Service dependency error handling and cascading failure prevention
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/logger';
import { NotificationService } from '../notifications/notification-service';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export enum NetworkErrorType {
  SSH_TUNNEL_DISCONNECTED = 'SSH_TUNNEL_DISCONNECTED',
  DATABASE_CONNECTION_LOST = 'DATABASE_CONNECTION_LOST',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  DNS_RESOLUTION_FAILED = 'DNS_RESOLUTION_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  SSL_CERTIFICATE_ERROR = 'SSL_CERTIFICATE_ERROR',
  PROXY_ERROR = 'PROXY_ERROR',
  BANDWIDTH_EXCEEDED = 'BANDWIDTH_EXCEEDED',
  FIREWALL_BLOCKED = 'FIREWALL_BLOCKED'
}

export interface NetworkService {
  name: string;
  type: 'ssh_tunnel' | 'database' | 'api' | 'proxy';
  host: string;
  port: number;
  isHealthy: boolean;
  lastCheck: Date;
  errorCount: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  dependencies: string[];
}

export interface SSHTunnelConfig {
  localPort: number;
  remoteHost: string;
  remotePort: number;
  sshHost: string;
  sshPort: number;
  sshUser: string;
  sshKeyPath: string;
  keepAlive: boolean;
  maxRetries: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  retryAttempts: number;
}

export class NetworkErrorHandler extends EventEmitter {
  private logger: Logger;
  private notificationService: NotificationService;
  private services: Map<string, NetworkService> = new Map();
  private sshTunnels: Map<string, ChildProcess> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectionAttempts: Map<string, number> = new Map();

  constructor() {
    super();
    this.logger = new Logger('NetworkErrorHandler');
    this.notificationService = new NotificationService();
    this.initializeServices();
    this.startHealthMonitoring();
  }

  /**
   * Initialize network services configuration
   */
  private initializeServices(): void {
    // SSH Tunnel for Gate.io API
    this.services.set('gate-io-tunnel', {
      name: 'gate-io-tunnel',
      type: 'ssh_tunnel',
      host: 'localhost',
      port: 8443,
      isHealthy: false,
      lastCheck: new Date(),
      errorCount: 0,
      maxRetries: 5,
      retryDelay: 5000,
      timeout: 10000,
      dependencies: []
    });

    // Database connection
    this.services.set('database', {
      name: 'database',
      type: 'database',
      host: 'localhost',
      port: 5432,
      isHealthy: false,
      lastCheck: new Date(),
      errorCount: 0,
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 5000,
      dependencies: []
    });

    // Ollama AI service
    this.services.set('ollama', {
      name: 'ollama',
      type: 'api',
      host: 'localhost',
      port: 11434,
      isHealthy: false,
      lastCheck: new Date(),
      errorCount: 0,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 8000,
      dependencies: []
    });
  }

  /**
   * Setup SSH tunnel with auto-reconnection
   */
  async setupSSHTunnel(config: SSHTunnelConfig): Promise<boolean> {
    const serviceName = `ssh-tunnel-${config.localPort}`;
    
    try {
      this.logger.info(`Setting up SSH tunnel: ${serviceName}`, {
        localPort: config.localPort,
        remoteHost: config.remoteHost,
        remotePort: config.remotePort
      });

      // Kill existing tunnel if any
      await this.killSSHTunnel(serviceName);

      // Create SSH tunnel command
      const sshArgs = [
        '-N', // No remote command
        '-L', `${config.localPort}:${config.remoteHost}:${config.remotePort}`,
        '-p', config.sshPort.toString(),
        '-i', config.sshKeyPath,
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null',
        '-o', 'ServerAliveInterval=30',
        '-o', 'ServerAliveCountMax=3',
        '-o', 'ExitOnForwardFailure=yes',
        `${config.sshUser}@${config.sshHost}`
      ];

      // Spawn SSH process
      const sshProcess = spawn('ssh', sshArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle SSH process events
      sshProcess.on('error', (error) => {
        this.handleSSHTunnelError(serviceName, error);
      });

      sshProcess.on('exit', (code, signal) => {
        this.logger.warn(`SSH tunnel exited: ${serviceName}`, { code, signal });
        this.handleSSHTunnelDisconnection(serviceName, config);
      });

      sshProcess.stderr?.on('data', (data) => {
        const errorMsg = data.toString();
        if (errorMsg.includes('Warning') || errorMsg.includes('debug')) {
          this.logger.debug(`SSH tunnel stderr: ${errorMsg.trim()}`);
        } else {
          this.logger.error(`SSH tunnel error: ${errorMsg.trim()}`);
        }
      });

      // Store tunnel process
      this.sshTunnels.set(serviceName, sshProcess);

      // Wait for tunnel to establish
      await this.waitForTunnelEstablishment(config.localPort);

      // Update service status
      const service = this.services.get('gate-io-tunnel');
      if (service) {
        service.isHealthy = true;
        service.errorCount = 0;
        service.lastCheck = new Date();
      }

      this.logger.info(`SSH tunnel established successfully: ${serviceName}`);
      this.emit('tunnelEstablished', serviceName);

      return true;

    } catch (error) {
      this.logger.error(`Failed to setup SSH tunnel: ${serviceName}`, { error: error.message });
      await this.handleSSHTunnelError(serviceName, error);
      return false;
    }
  }

  /**
   * Handle SSH tunnel errors and attempt reconnection
   */
  private async handleSSHTunnelError(serviceName: string, error: any): Promise<void> {
    const service = this.services.get('gate-io-tunnel');
    if (!service) return;

    service.isHealthy = false;
    service.errorCount++;
    service.lastCheck = new Date();

    this.logger.error(`SSH tunnel error: ${serviceName}`, {
      error: error.message,
      errorCount: service.errorCount
    });

    // Emit error event
    this.emit('networkError', {
      type: NetworkErrorType.SSH_TUNNEL_DISCONNECTED,
      service: serviceName,
      error: error.message,
      errorCount: service.errorCount
    });

    // Attempt reconnection if within retry limits
    const attempts = this.reconnectionAttempts.get(serviceName) || 0;
    if (attempts < service.maxRetries) {
      this.reconnectionAttempts.set(serviceName, attempts + 1);
      
      this.logger.info(`Attempting SSH tunnel reconnection: ${serviceName} (${attempts + 1}/${service.maxRetries})`);
      
      // Wait before retry
      await this.sleep(service.retryDelay * Math.pow(2, attempts));
      
      // Attempt reconnection (would need config stored)
      // This is a simplified version - in production, store the config
      this.emit('tunnelReconnectionNeeded', serviceName);
    } else {
      this.logger.error(`SSH tunnel max retries exceeded: ${serviceName}`);
      
      await this.notificationService.sendCriticalAlert({
        title: 'SSH Tunnel Failed',
        message: `SSH tunnel ${serviceName} failed after ${service.maxRetries} attempts`,
        details: { error: error.message, errorCount: service.errorCount }
      });
    }
  }

  /**
   * Handle SSH tunnel disconnection
   */
  private async handleSSHTunnelDisconnection(serviceName: string, config: SSHTunnelConfig): Promise<void> {
    this.logger.warn(`SSH tunnel disconnected: ${serviceName}`);
    
    // Remove from active tunnels
    this.sshTunnels.delete(serviceName);
    
    // Mark service as unhealthy
    const service = this.services.get('gate-io-tunnel');
    if (service) {
      service.isHealthy = false;
    }

    // Attempt automatic reconnection
    if (config.maxRetries > 0) {
      setTimeout(async () => {
        await this.setupSSHTunnel(config);
      }, config.keepAlive ? 5000 : 0);
    }
  }

  /**
   * Wait for SSH tunnel to establish connection
   */
  private async waitForTunnelEstablishment(localPort: number): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let waited = 0;

    while (waited < maxWait) {
      try {
        const isListening = await this.checkPortListening(localPort);
        if (isListening) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(checkInterval);
      waited += checkInterval;
    }

    throw new Error(`SSH tunnel failed to establish within ${maxWait}ms`);
  }

  /**
   * Check if port is listening
   */
  private async checkPortListening(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`netstat -an | grep :${port}`);
      return stdout.includes('LISTEN') || stdout.includes('LISTENING');
    } catch (error) {
      return false;
    }
  }

  /**
   * Kill SSH tunnel process
   */
  private async killSSHTunnel(serviceName: string): Promise<void> {
    const process = this.sshTunnels.get(serviceName);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await this.sleep(2000);
      
      if (!process.killed) {
        process.kill('SIGKILL');
      }
      
      this.sshTunnels.delete(serviceName);
    }
  }

  /**
   * Handle database connection errors
   */
  async handleDatabaseError(error: any, config: DatabaseConfig): Promise<void> {
    const service = this.services.get('database');
    if (!service) return;

    service.isHealthy = false;
    service.errorCount++;
    service.lastCheck = new Date();

    this.logger.error('Database connection error', {
      error: error.message,
      errorCount: service.errorCount,
      host: config.host,
      port: config.port
    });

    // Determine error type
    let errorType = NetworkErrorType.DATABASE_CONNECTION_LOST;
    if (error.message.includes('timeout')) {
      errorType = NetworkErrorType.NETWORK_TIMEOUT;
    } else if (error.message.includes('refused')) {
      errorType = NetworkErrorType.CONNECTION_REFUSED;
    }

    // Emit error event
    this.emit('networkError', {
      type: errorType,
      service: 'database',
      error: error.message,
      errorCount: service.errorCount
    });

    // Attempt reconnection
    if (service.errorCount <= service.maxRetries) {
      this.logger.info(`Attempting database reconnection (${service.errorCount}/${service.maxRetries})`);
      
      await this.sleep(service.retryDelay * service.errorCount);
      
      // Emit reconnection event
      this.emit('databaseReconnectionNeeded');
    } else {
      await this.notificationService.sendHighPriorityAlert({
        title: 'Database Connection Failed',
        message: `Database connection failed after ${service.maxRetries} attempts`,
        details: { error: error.message, config: { host: config.host, port: config.port } }
      });
    }
  }

  /**
   * Test network connectivity to service
   */
  async testConnectivity(serviceName: string): Promise<boolean> {
    const service = this.services.get(serviceName);
    if (!service) return false;

    try {
      const startTime = Date.now();
      
      // Use different test methods based on service type
      let isConnected = false;
      
      switch (service.type) {
        case 'ssh_tunnel':
          isConnected = await this.testTunnelConnectivity(service.port);
          break;
        case 'database':
          isConnected = await this.testDatabaseConnectivity(service);
          break;
        case 'api':
          isConnected = await this.testAPIConnectivity(service);
          break;
        default:
          isConnected = await this.testPortConnectivity(service.host, service.port);
      }

      const responseTime = Date.now() - startTime;
      
      // Update service status
      service.isHealthy = isConnected;
      service.lastCheck = new Date();
      
      if (isConnected) {
        service.errorCount = 0;
        this.reconnectionAttempts.delete(serviceName);
      } else {
        service.errorCount++;
      }

      this.logger.debug(`Connectivity test: ${serviceName}`, {
        isConnected,
        responseTime,
        errorCount: service.errorCount
      });

      return isConnected;

    } catch (error) {
      service.isHealthy = false;
      service.errorCount++;
      service.lastCheck = new Date();
      
      this.logger.error(`Connectivity test failed: ${serviceName}`, { error: error.message });
      return false;
    }
  }

  /**
   * Test SSH tunnel connectivity
   */
  private async testTunnelConnectivity(port: number): Promise<boolean> {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`http://localhost:${port}/api/v4/spot/time`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test database connectivity
   */
  private async testDatabaseConnectivity(service: NetworkService): Promise<boolean> {
    // This would integrate with actual database client
    // For now, just test port connectivity
    return this.testPortConnectivity(service.host, service.port);
  }

  /**
   * Test API connectivity
   */
  private async testAPIConnectivity(service: NetworkService): Promise<boolean> {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`http://${service.host}:${service.port}/api/tags`, {
        method: 'GET',
        timeout: service.timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test basic port connectivity
   */
  private async testPortConnectivity(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 5000);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  /**
   * Start health monitoring for all services
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Check every 30 seconds

    this.logger.info('Network health monitoring started');
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const services = Array.from(this.services.keys());
    
    for (const serviceName of services) {
      try {
        await this.testConnectivity(serviceName);
      } catch (error) {
        this.logger.error(`Health check failed for ${serviceName}`, { error: error.message });
      }
    }

    // Check for cascading failures
    await this.checkCascadingFailures();
  }

  /**
   * Check for cascading failures and prevent them
   */
  private async checkCascadingFailures(): Promise<void> {
    const unhealthyServices = Array.from(this.services.values())
      .filter(service => !service.isHealthy);

    if (unhealthyServices.length >= 2) {
      this.logger.warn('Multiple services unhealthy - potential cascading failure', {
        unhealthyServices: unhealthyServices.map(s => s.name)
      });

      await this.notificationService.sendHighPriorityAlert({
        title: 'Cascading Failure Risk',
        message: `${unhealthyServices.length} services are unhealthy`,
        details: { services: unhealthyServices.map(s => s.name) }
      });

      // Implement circuit breaker logic
      this.emit('cascadingFailureRisk', unhealthyServices);
    }
  }

  /**
   * Get network system status
   */
  getNetworkStatus(): any {
    const services = Array.from(this.services.values()).map(service => ({
      name: service.name,
      type: service.type,
      isHealthy: service.isHealthy,
      errorCount: service.errorCount,
      lastCheck: service.lastCheck,
      host: service.host,
      port: service.port
    }));

    const activeTunnels = Array.from(this.sshTunnels.keys());

    return {
      services,
      activeTunnels,
      healthyServices: services.filter(s => s.isHealthy).length,
      totalServices: services.length,
      reconnectionAttempts: Object.fromEntries(this.reconnectionAttempts)
    };
  }

  /**
   * Utility method for sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown network error handler
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down network error handler...');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Kill all SSH tunnels
    for (const [serviceName] of this.sshTunnels) {
      await this.killSSHTunnel(serviceName);
    }

    this.logger.info('Network error handler shutdown completed');
  }
}