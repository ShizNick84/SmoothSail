import { SSHTunnelManager, TunnelConfig, TunnelState } from '../ssh-tunnel-manager';
import { Logger } from '../../core/logging/logger';
import { EncryptionService } from '../../security/encryption-service';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    access: jest.fn()
  }
}));

jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock process for SSH
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  
  kill(signal?: string) {
    this.killed = true;
    setTimeout(() => this.emit('exit', 0, signal), 10);
  }
}

describe('SSHTunnelManager', () => {
  let tunnelManager: SSHTunnelManager;
  let mockLogger: jest.Mocked<Logger>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockFs: jest.Mocked<typeof fs>;
  let mockSpawn: jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    // Setup mocks
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    mockEncryptionService = {} as any;

    mockFs = fs as jest.Mocked<typeof fs>;
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

    // Create tunnel manager instance
    tunnelManager = new SSHTunnelManager(mockLogger, mockEncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTunnel', () => {
    const validConfig: Partial<TunnelConfig> = {
      username: 'testuser',
      privateKeyPath: '/path/to/key',
      localPort: 8080,
      remotePort: 3000
    };

    beforeEach(() => {
      // Mock file system calls for validation
      mockFs.stat.mockResolvedValue({
        isFile: () => true
      } as any);
      mockFs.access.mockResolvedValue(undefined);
    });

    it('should create a tunnel with valid configuration', async () => {
      const connection = await tunnelManager.createTunnel(validConfig);

      expect(connection).toBeDefined();
      expect(connection.id).toMatch(/^tunnel_\d+_[a-z0-9]+$/);
      expect(connection.config.oracleIP).toBe('168.138.104.117');
      expect(connection.config.username).toBe('testuser');
      expect(connection.state).toBe(TunnelState.DISCONNECTED);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created SSH tunnel connection'),
        expect.any(Object)
      );
    });

    it('should apply default configuration values', async () => {
      const connection = await tunnelManager.createTunnel(validConfig);

      expect(connection.config.oracleIP).toBe('168.138.104.117');
      expect(connection.config.sshPort).toBe(22);
      expect(connection.config.keepAlive).toBe(true);
      expect(connection.config.compression).toBe(true);
      expect(connection.config.connectionTimeout).toBe(30);
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        username: 'testuser',
        // Missing required fields
      };

      await expect(tunnelManager.createTunnel(invalidConfig)).rejects.toThrow(
        'Missing required tunnel configuration'
      );
    });

    it('should reject invalid IP address', async () => {
      const invalidConfig = {
        ...validConfig,
        oracleIP: 'invalid-ip'
      };

      await expect(tunnelManager.createTunnel(invalidConfig)).rejects.toThrow(
        'Invalid Oracle IP address'
      );
    });

    it('should reject invalid ports', async () => {
      const invalidConfig = {
        ...validConfig,
        localPort: 70000 // Invalid port
      };

      await expect(tunnelManager.createTunnel(invalidConfig)).rejects.toThrow(
        'Invalid local port'
      );
    });
  });

  describe('establishTunnel', () => {
    let connection: any;
    let mockProcess: MockChildProcess;

    beforeEach(async () => {
      // Mock file system calls
      mockFs.stat.mockResolvedValue({
        isFile: () => true
      } as any);
      mockFs.access.mockResolvedValue(undefined);

      // Create a test connection
      connection = await tunnelManager.createTunnel({
        username: 'testuser',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 3000
      });

      // Setup mock SSH process
      mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);
    });

    it('should establish tunnel successfully', async () => {
      // Start establishment
      const establishPromise = tunnelManager.establishTunnel(connection.id);

      // Simulate successful connection
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Local forwarding listening on 8080');
      }, 10);

      await establishPromise;

      const updatedConnection = tunnelManager.getConnection(connection.id);
      expect(updatedConnection?.state).toBe(TunnelState.CONNECTED);
      expect(updatedConnection?.connectedAt).toBeInstanceOf(Date);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('SSH tunnel established successfully')
      );
    });

    it('should handle connection timeout', async () => {
      const establishPromise = tunnelManager.establishTunnel(connection.id);

      // Don't emit success signal - should timeout
      await expect(establishPromise).rejects.toThrow('SSH tunnel connection timeout');

      const updatedConnection = tunnelManager.getConnection(connection.id);
      expect(updatedConnection?.state).toBe(TunnelState.FAILED);
    });

    it('should handle SSH process errors', async () => {
      const establishPromise = tunnelManager.establishTunnel(connection.id);

      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', new Error('SSH connection failed'));
      }, 10);

      await expect(establishPromise).rejects.toThrow('SSH connection failed');

      const updatedConnection = tunnelManager.getConnection(connection.id);
      expect(updatedConnection?.state).toBe(TunnelState.FAILED);
    });

    it('should reject establishment for non-existent connection', async () => {
      await expect(tunnelManager.establishTunnel('invalid-id')).rejects.toThrow(
        'Connection not found'
      );
    });

    it('should handle already connected tunnel', async () => {
      // Manually set state to connected
      connection.state = TunnelState.CONNECTED;

      await tunnelManager.establishTunnel(connection.id);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Tunnel already connected')
      );
    });
  });

  describe('disconnectTunnel', () => {
    let connection: any;
    let mockProcess: MockChildProcess;

    beforeEach(async () => {
      // Mock file system calls
      mockFs.stat.mockResolvedValue({
        isFile: () => true
      } as any);
      mockFs.access.mockResolvedValue(undefined);

      // Create and establish connection
      connection = await tunnelManager.createTunnel({
        username: 'testuser',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 3000
      });

      mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      // Establish tunnel
      const establishPromise = tunnelManager.establishTunnel(connection.id);
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Local forwarding listening on 8080');
      }, 10);
      await establishPromise;
    });

    it('should disconnect tunnel gracefully', async () => {
      await tunnelManager.disconnectTunnel(connection.id);

      const updatedConnection = tunnelManager.getConnection(connection.id);
      expect(updatedConnection?.state).toBe(TunnelState.DISCONNECTED);
      expect(updatedConnection?.process).toBeNull();
      expect(updatedConnection?.connectedAt).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('SSH tunnel disconnected')
      );
    });

    it('should handle already disconnected tunnel', async () => {
      // Disconnect once
      await tunnelManager.disconnectTunnel(connection.id);

      // Try to disconnect again
      await tunnelManager.disconnectTunnel(connection.id);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Tunnel already disconnected')
      );
    });

    it('should reject disconnection for non-existent connection', async () => {
      await expect(tunnelManager.disconnectTunnel('invalid-id')).rejects.toThrow(
        'Connection not found'
      );
    });
  });

  describe('connection management', () => {
    let connection1: any;
    let connection2: any;

    beforeEach(async () => {
      // Mock file system calls
      mockFs.stat.mockResolvedValue({
        isFile: () => true
      } as any);
      mockFs.access.mockResolvedValue(undefined);

      // Create test connections
      connection1 = await tunnelManager.createTunnel({
        username: 'user1',
        privateKeyPath: '/path/to/key1',
        localPort: 8080,
        remotePort: 3000
      });

      connection2 = await tunnelManager.createTunnel({
        username: 'user2',
        privateKeyPath: '/path/to/key2',
        localPort: 8081,
        remotePort: 3001
      });
    });

    it('should get connection by ID', () => {
      const retrieved = tunnelManager.getConnection(connection1.id);
      expect(retrieved).toBe(connection1);
    });

    it('should return undefined for non-existent connection', () => {
      const retrieved = tunnelManager.getConnection('invalid-id');
      expect(retrieved).toBeUndefined();
    });

    it('should get all connections', () => {
      const allConnections = tunnelManager.getAllConnections();
      expect(allConnections).toHaveLength(2);
      expect(allConnections).toContain(connection1);
      expect(allConnections).toContain(connection2);
    });

    it('should get active connections', async () => {
      // Mock SSH process for connection1
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      // Establish connection1
      const establishPromise = tunnelManager.establishTunnel(connection1.id);
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Local forwarding listening on 8080');
      }, 10);
      await establishPromise;

      const activeConnections = tunnelManager.getActiveConnections();
      expect(activeConnections).toHaveLength(1);
      expect(activeConnections[0]).toBe(connection1);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all connections', async () => {
      // Mock file system calls
      mockFs.stat.mockResolvedValue({
        isFile: () => true
      } as any);
      mockFs.access.mockResolvedValue(undefined);

      // Create connections
      const connection1 = await tunnelManager.createTunnel({
        username: 'user1',
        privateKeyPath: '/path/to/key1',
        localPort: 8080,
        remotePort: 3000
      });

      const connection2 = await tunnelManager.createTunnel({
        username: 'user2',
        privateKeyPath: '/path/to/key2',
        localPort: 8081,
        remotePort: 3001
      });

      // Establish connections
      const mockProcess1 = new MockChildProcess();
      const mockProcess2 = new MockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockProcess1 as any)
        .mockReturnValueOnce(mockProcess2 as any);

      const establish1 = tunnelManager.establishTunnel(connection1.id);
      const establish2 = tunnelManager.establishTunnel(connection2.id);

      setTimeout(() => {
        mockProcess1.stderr.emit('data', 'Local forwarding listening on 8080');
        mockProcess2.stderr.emit('data', 'Local forwarding listening on 8081');
      }, 10);

      await Promise.all([establish1, establish2]);

      // Cleanup
      await tunnelManager.cleanup();

      // Verify all connections are cleaned up
      expect(tunnelManager.getAllConnections()).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('SSH tunnel cleanup completed');
    });
  });

  describe('event emission', () => {
    let connection: any;
    let mockProcess: MockChildProcess;

    beforeEach(async () => {
      // Mock file system calls
      mockFs.stat.mockResolvedValue({
        isFile: () => true
      } as any);
      mockFs.access.mockResolvedValue(undefined);

      connection = await tunnelManager.createTunnel({
        username: 'testuser',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 3000
      });

      mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);
    });

    it('should emit tunnelConnected event', async () => {
      const connectedSpy = jest.fn();
      tunnelManager.on('tunnelConnected', connectedSpy);

      const establishPromise = tunnelManager.establishTunnel(connection.id);
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Local forwarding listening on 8080');
      }, 10);
      await establishPromise;

      expect(connectedSpy).toHaveBeenCalledWith(connection);
    });

    it('should emit tunnelError event', async () => {
      const errorSpy = jest.fn();
      tunnelManager.on('tunnelError', errorSpy);

      const establishPromise = tunnelManager.establishTunnel(connection.id);
      const testError = new Error('Test error');
      
      setTimeout(() => {
        mockProcess.emit('error', testError);
      }, 10);

      await expect(establishPromise).rejects.toThrow('Test error');
      expect(errorSpy).toHaveBeenCalledWith(connection, testError);
    });

    it('should emit stateChanged event', async () => {
      const stateChangedSpy = jest.fn();
      tunnelManager.on('stateChanged', stateChangedSpy);

      const establishPromise = tunnelManager.establishTunnel(connection.id);
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Local forwarding listening on 8080');
      }, 10);
      await establishPromise;

      expect(stateChangedSpy).toHaveBeenCalledWith(
        connection,
        TunnelState.DISCONNECTED,
        TunnelState.CONNECTING
      );
    });
  });
});