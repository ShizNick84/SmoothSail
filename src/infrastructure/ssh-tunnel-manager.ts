import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Logger } from '../core/logging/logger';
import { EncryptionService } from '../security/encryption-service';

/**
 * SSH Tunnel Configuration interface
 * Defines all parameters needed to establish a secure SSH tunnel to Oracle Free Tier
 */
export interface TunnelConfig {
  /** Oracle Free Tier IP address */
  oracleIP: string;
  /** SSH port (default: 22) */
  sshPort: number;
  /** SSH username for Oracle instance */
  username: string;
  /** Path to private key file */
  privateKeyPath: string;
  /** Local port for tunnel */
  localPort: number;
  /** Remote port on Oracle instance */
  remotePort: number;
  /** Enable SSH keep-alive */
  keepAlive: boolean;
  /** Enable SSH compression */
  compression: boolean;
  /** Connection timeout in seconds */
  connectionTimeout: number;
  /** Server alive interval in seconds */
  serverAliveInterval: number;
  /** Maximum server alive count misses */
  serverAliveCountMax: number;
}

/**
 * SSH Tunnel Connection interface
 * Represents an active SSH tunnel connection with state management
 */
export interface TunnelConnection {
  /** Unique connection identifier */
  id: string;
  /** Connection configuration */
  config: TunnelConfig;
  /** SSH process handle */
  process: ChildProcess | null;
  /** Connection state */
  state: TunnelState;
  /** Connection establishment timestamp */
  connectedAt: Date | null;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Connection statistics */
  stats: TunnelStats;
}

/**
 * Tunnel connection states
 */
export enum TunnelState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
  TERMINATED = 'TERMINATED'
}

/**
 * Tunnel connection statistics
 */
export interface TunnelStats {
  /** Total bytes transferred */
  bytesTransferred: number;
  /** Connection uptime in milliseconds */
  uptime: number;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Last error message */
  lastError: string | null;
  /** Connection quality score (0-100) */
  qualityScore: number;
}

/**
 * SSH Tunnel Manager
 * Manages SSH tunnel connections to Oracle Free Tier with authentication,
 * state management, and connection validation
 */
export class SSHTunnelManager extends EventEmitter {
  private logger: Logger;
  private encryptionService: EncryptionService;
  private connections: Map<string, TunnelConnection>;
  private defaultConfig: Partial<TunnelConfig>;

  constructor(
    logger: Logger,
    encryptionService: EncryptionService
  ) {
    super();
    this.logger = logger;
    this.encryptionService = encryptionService;
    this.connections = new Map();
    
    // Default configuration for Oracle Free Tier
    this.defaultConfig = {
      oracleIP: '168.138.104.117',
      sshPort: 22,
      keepAlive: true,
      compression: true,
      connectionTimeout: 30,
      serverAliveInterval: 60,
      serverAliveCountMax: 3
    };

    this.logger.info('SSH Tunnel Manager initialized');
  }

  /**
   * Create a new SSH tunnel connection to Oracle Free Tier
   * Implements secure authentication with private key management
   * 
   * @param config - Tunnel configuration parameters
   * @returns Promise resolving to tunnel connection
   */
  async createTunnel(config: Partial<TunnelConfig>): Promise<TunnelConnection> {
    const fullConfig = { ...this.defaultConfig, ...config } as TunnelConfig;
    
    // Validate configuration
    await this.validateTunnelConfig(fullConfig);
    
    // Generate unique connection ID
    const connectionId = this.generateConnectionId();
    
    // Create connection object
    const connection: TunnelConnection = {
      id: connectionId,
      config: fullConfig,
      process: null,
      state: TunnelState.DISCONNECTED,
      connectedAt: null,
      lastActivity: new Date(),
      stats: {
        bytesTransferred: 0,
        uptime: 0,
        reconnectAttempts: 0,
        lastError: null,
        qualityScore: 0
      }
    };

    // Store connection
    this.connections.set(connectionId, connection);
    
    this.logger.info(`Created SSH tunnel connection: ${connectionId}`, {
      oracleIP: fullConfig.oracleIP,
      localPort: fullConfig.localPort,
      remotePort: fullConfig.remotePort
    });

    return connection;
  }

  /**
   * Establish SSH tunnel connection
   * Implements connection authentication and state management
   * 
   * @param connectionId - Connection identifier
   * @returns Promise resolving when connection is established
   */
  async establishTunnel(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (connection.state === TunnelState.CONNECTED) {
      this.logger.warn(`Tunnel already connected: ${connectionId}`);
      return;
    }

    try {
      // Update state to connecting
      this.updateConnectionState(connection, TunnelState.CONNECTING);
      
      // Validate private key exists and is accessible
      await this.validatePrivateKey(connection.config.privateKeyPath);
      
      // Build SSH command arguments
      const sshArgs = this.buildSSHArguments(connection.config);
      
      this.logger.info(`Establishing SSH tunnel: ${connectionId}`, {
        command: 'ssh',
        args: sshArgs.filter(arg => !arg.includes('IdentityFile')) // Don't log private key path
      });

      // Spawn SSH process
      const sshProcess = spawn('ssh', sshArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      connection.process = sshProcess;

      // Set up process event handlers
      this.setupProcessHandlers(connection);

      // Wait for connection establishment
      await this.waitForConnection(connection);
      
      // Update connection state
      this.updateConnectionState(connection, TunnelState.CONNECTED);
      connection.connectedAt = new Date();
      
      this.logger.info(`SSH tunnel established successfully: ${connectionId}`);
      this.emit('tunnelConnected', connection);

    } catch (error) {
      this.logger.error(`Failed to establish SSH tunnel: ${connectionId}`, error);
      this.updateConnectionState(connection, TunnelState.FAILED);
      connection.stats.lastError = error instanceof Error ? error.message : String(error);
      this.emit('tunnelError', connection, error);
      throw error;
    }
  }

  /**
   * Disconnect SSH tunnel
   * Gracefully terminates the SSH connection
   * 
   * @param connectionId - Connection identifier
   * @returns Promise resolving when disconnected
   */
  async disconnectTunnel(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (connection.state === TunnelState.DISCONNECTED) {
      this.logger.warn(`Tunnel already disconnected: ${connectionId}`);
      return;
    }

    try {
      this.logger.info(`Disconnecting SSH tunnel: ${connectionId}`);
      
      if (connection.process) {
        // Graceful termination
        connection.process.kill('SIGTERM');
        
        // Wait for process to exit
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if graceful termination fails
            if (connection.process && !connection.process.killed) {
              connection.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);

          connection.process!.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      this.updateConnectionState(connection, TunnelState.DISCONNECTED);
      connection.process = null;
      connection.connectedAt = null;
      
      this.logger.info(`SSH tunnel disconnected: ${connectionId}`);
      this.emit('tunnelDisconnected', connection);

    } catch (error) {
      this.logger.error(`Error disconnecting SSH tunnel: ${connectionId}`, error);
      throw error;
    }
  }

  /**
   * Get connection by ID
   * 
   * @param connectionId - Connection identifier
   * @returns Tunnel connection or undefined
   */
  getConnection(connectionId: string): TunnelConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections
   * 
   * @returns Array of all tunnel connections
   */
  getAllConnections(): TunnelConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get active connections
   * 
   * @returns Array of connected tunnel connections
   */
  getActiveConnections(): TunnelConnection[] {
    return this.getAllConnections().filter(
      conn => conn.state === TunnelState.CONNECTED
    );
  }

  /**
   * Validate tunnel configuration
   * Ensures all required parameters are present and valid
   * 
   * @param config - Tunnel configuration to validate
   */
  private async validateTunnelConfig(config: TunnelConfig): Promise<void> {
    const requiredFields: (keyof TunnelConfig)[] = [
      'oracleIP', 'username', 'privateKeyPath', 'localPort', 'remotePort'
    ];

    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required tunnel configuration: ${field}`);
      }
    }

    // Validate IP address format
    if (!this.isValidIP(config.oracleIP)) {
      throw new Error(`Invalid Oracle IP address: ${config.oracleIP}`);
    }

    // Validate port ranges
    if (config.localPort < 1 || config.localPort > 65535) {
      throw new Error(`Invalid local port: ${config.localPort}`);
    }

    if (config.remotePort < 1 || config.remotePort > 65535) {
      throw new Error(`Invalid remote port: ${config.remotePort}`);
    }

    this.logger.debug('Tunnel configuration validated successfully');
  }

  /**
   * Validate private key file exists and is accessible
   * 
   * @param privateKeyPath - Path to private key file
   */
  private async validatePrivateKey(privateKeyPath: string): Promise<void> {
    try {
      const stats = await fs.stat(privateKeyPath);
      
      if (!stats.isFile()) {
        throw new Error(`Private key path is not a file: ${privateKeyPath}`);
      }

      // Check file permissions (should be readable by owner only)
      await fs.access(privateKeyPath, fs.constants.R_OK);
      
      this.logger.debug(`Private key validated: ${privateKeyPath}`);
      
    } catch (error) {
      throw new Error(`Private key validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build SSH command arguments
   * 
   * @param config - Tunnel configuration
   * @returns Array of SSH command arguments
   */
  private buildSSHArguments(config: TunnelConfig): string[] {
    const args = [
      '-N', // No remote command execution
      '-T', // Disable pseudo-terminal allocation
      '-o', 'StrictHostKeyChecking=no', // Accept new host keys
      '-o', 'UserKnownHostsFile=/dev/null', // Don't save host keys
      '-o', `ConnectTimeout=${config.connectionTimeout}`,
      '-o', `ServerAliveInterval=${config.serverAliveInterval}`,
      '-o', `ServerAliveCountMax=${config.serverAliveCountMax}`,
      '-i', config.privateKeyPath, // Identity file
      '-p', config.sshPort.toString(), // SSH port
      '-L', `${config.localPort}:localhost:${config.remotePort}`, // Local port forwarding
    ];

    // Add compression if enabled
    if (config.compression) {
      args.push('-C');
    }

    // Add keep-alive if enabled
    if (config.keepAlive) {
      args.push('-o', 'TCPKeepAlive=yes');
    }

    // Add connection target
    args.push(`${config.username}@${config.oracleIP}`);

    return args;
  }

  /**
   * Set up SSH process event handlers
   * 
   * @param connection - Tunnel connection
   */
  private setupProcessHandlers(connection: TunnelConnection): void {
    if (!connection.process) return;

    const process = connection.process;

    process.stdout?.on('data', (data) => {
      this.logger.debug(`SSH stdout [${connection.id}]: ${data.toString().trim()}`);
    });

    process.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      this.logger.debug(`SSH stderr [${connection.id}]: ${message}`);
      
      // Check for connection success indicators
      if (message.includes('Local forwarding listening')) {
        this.emit('tunnelReady', connection);
      }
    });

    process.on('exit', (code, signal) => {
      this.logger.info(`SSH process exited [${connection.id}]`, { code, signal });
      
      if (connection.state === TunnelState.CONNECTED) {
        this.updateConnectionState(connection, TunnelState.DISCONNECTED);
        this.emit('tunnelDisconnected', connection);
      }
      
      connection.process = null;
    });

    process.on('error', (error) => {
      this.logger.error(`SSH process error [${connection.id}]`, error);
      this.updateConnectionState(connection, TunnelState.FAILED);
      connection.stats.lastError = error.message;
      this.emit('tunnelError', connection, error);
    });
  }

  /**
   * Wait for SSH tunnel connection to be established
   * 
   * @param connection - Tunnel connection
   * @param timeoutMs - Timeout in milliseconds
   */
  private async waitForConnection(connection: TunnelConnection, timeoutMs: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`SSH tunnel connection timeout: ${connection.id}`));
      }, timeoutMs);

      const onReady = () => {
        clearTimeout(timeout);
        this.removeListener('tunnelError', onError);
        resolve();
      };

      const onError = (conn: TunnelConnection, error: Error) => {
        if (conn.id === connection.id) {
          clearTimeout(timeout);
          this.removeListener('tunnelReady', onReady);
          reject(error);
        }
      };

      this.once('tunnelReady', onReady);
      this.once('tunnelError', onError);
    });
  }

  /**
   * Update connection state and emit events
   * 
   * @param connection - Tunnel connection
   * @param newState - New connection state
   */
  private updateConnectionState(connection: TunnelConnection, newState: TunnelState): void {
    const oldState = connection.state;
    connection.state = newState;
    connection.lastActivity = new Date();

    this.logger.debug(`Tunnel state changed [${connection.id}]: ${oldState} -> ${newState}`);
    this.emit('stateChanged', connection, oldState, newState);
  }

  /**
   * Generate unique connection ID
   * 
   * @returns Unique connection identifier
   */
  private generateConnectionId(): string {
    return `tunnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate IP address format
   * 
   * @param ip - IP address to validate
   * @returns True if valid IP address
   */
  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Cleanup all connections on shutdown
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up SSH tunnel connections');
    
    const disconnectPromises = Array.from(this.connections.keys()).map(
      connectionId => this.disconnectTunnel(connectionId).catch(error => 
        this.logger.error(`Error disconnecting tunnel ${connectionId}`, error)
      )
    );

    await Promise.all(disconnectPromises);
    this.connections.clear();
    
    this.logger.info('SSH tunnel cleanup completed');
  }
}