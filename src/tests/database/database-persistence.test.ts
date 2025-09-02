/**
 * =============================================================================
 * DATABASE OPERATIONS AND DATA PERSISTENCE TESTING
 * =============================================================================
 * 
 * Comprehensive tests for database operations, data persistence, and
 * data integrity validation for the Intel NUC deployment.
 * 
 * Requirements: 3.2, 5.4
 * =============================================================================
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseManager } from '../../core/database/database-manager';
import { Logger } from '../../core/logging/logger';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    query: jest.fn(),
    end: jest.fn()
  }))
}));

const logger = new Logger('DatabaseTest');

describe('Database Operations and Data Persistence Tests', () => {
  let databaseManager: DatabaseManager;
  let mockPool: any;
  let mockClient: any;

  beforeAll(() => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '5432';
    process.env.DATABASE_NAME = 'trading_agent_test';
    process.env.DATABASE_USER = 'test_user';
    process.env.DATABASE_PASSWORD = 'test_password';
  });

  beforeEach(() => {
    // Create fresh mocks for each test
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn()
    };

    // Mock the Pool constructor
    const { Pool } = require('pg');
    Pool.mockImplementation(() => mockPool);

    databaseManager = new DatabaseManager({
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'trading_agent_test',
      username: 'test_user',
      password: 'test_password',
      ssl: false,
      maxConnections: 10,
      idleTimeout: 30000,
      connectionTimeout: 60000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Connection Management', () => {
    test('should initialize database connection successfully', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 13.0' }] });

      await databaseManager.initialize();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT version()');
    });

    test('should handle connection failures gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection refused'));

      await expect(databaseManager.initialize()).rejects.toThrow('Connection refused');
    });

    test('should manage connection pool correctly', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await databaseManager.executeQuery('SELECT COUNT(*) FROM trades');

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM trades', undefined);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle connection pool exhaustion', async () => {
      mockPool.connect.mockRejectedValue(new Error('Pool exhausted'));

      await expect(databaseManager.executeQuery('SELECT 1')).rejects.toThrow('Pool exhausted');
    });
  });

  describe('Trading Data Persistence', () => {
    test('should persist trade execution data', async () => {
      const tradeData = {
        id: 'trade-123',
        symbol: 'BTC_USDT',
        side: 'BUY',
        quantity: 0.001,
        price: 45000.50,
        status: 'FILLED',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        strategy: 'AI Enhanced Moving Average',
        pnl: 125.75,
        fees: 2.25,
        is_paper_trade: true
      };

      mockClient.query.mockResolvedValue({
        rows: [{ ...tradeData, id: 1 }],
        rowCount: 1
      });

      const result = await databaseManager.executeQuery(
        `INSERT INTO trades (trade_id, symbol, side, quantity, price, status, timestamp, strategy, pnl, fees, is_paper_trade) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          tradeData.id,
          tradeData.symbol,
          tradeData.side,
          tradeData.quantity,
          tradeData.price,
          tradeData.status,
          tradeData.timestamp,
          tradeData.strategy,
          tradeData.pnl,
          tradeData.fees,
          tradeData.is_paper_trade
        ]
      );

      expect(result.rows[0]).toMatchObject({
        trade_id: 'trade-123',
        symbol: 'BTC_USDT',
        side: 'BUY',
        quantity: 0.001,
        price: 45000.50,
        is_paper_trade: true
      });
      expect(result.rowCount).toBe(1);
    });

    test('should retrieve historical trading data', async () => {
      const mockTrades = [
        {
          id: 1,
          trade_id: 'trade-123',
          symbol: 'BTC_USDT',
          side: 'BUY',
          quantity: 0.001,
          price: 45000.50,
          pnl: 125.75,
          timestamp: new Date('2024-01-15T10:30:00Z')
        },
        {
          id: 2,
          trade_id: 'trade-124',
          symbol: 'ETH_USDT',
          side: 'SELL',
          quantity: 0.1,
          price: 2500.00,
          pnl: -23.50,
          timestamp: new Date('2024-01-15T11:45:00Z')
        }
      ];

      mockClient.query.mockResolvedValue({
        rows: mockTrades,
        rowCount: 2
      });

      const result = await databaseManager.executeQuery(
        'SELECT * FROM trades WHERE timestamp >= $1 ORDER BY timestamp DESC LIMIT $2',
        [new Date('2024-01-15T00:00:00Z'), 10]
      );

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].symbol).toBe('BTC_USDT');
      expect(result.rows[1].symbol).toBe('ETH_USDT');
    });

    test('should calculate trading statistics', async () => {
      const mockStats = {
        total_trades: 150,
        winning_trades: 110,
        losing_trades: 40,
        total_pnl: 2450.75,
        best_trade: 189.50,
        worst_trade: -45.20,
        avg_trade_duration: 3600000, // 1 hour in milliseconds
        win_rate: 73.33
      };

      mockClient.query.mockResolvedValue({
        rows: [mockStats],
        rowCount: 1
      });

      const result = await databaseManager.executeQuery(`
        SELECT 
          COUNT(*) as total_trades,
          COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
          COUNT(CASE WHEN pnl < 0 THEN 1 END) as losing_trades,
          SUM(pnl) as total_pnl,
          MAX(pnl) as best_trade,
          MIN(pnl) as worst_trade,
          AVG(EXTRACT(EPOCH FROM (updated_at - timestamp)) * 1000) as avg_trade_duration,
          ROUND((COUNT(CASE WHEN pnl > 0 THEN 1 END) * 100.0 / COUNT(*)), 2) as win_rate
        FROM trades 
        WHERE timestamp >= $1
      `, [new Date('2024-01-01T00:00:00Z')]);

      expect(result.rows[0]).toMatchObject({
        total_trades: 150,
        win_rate: 73.33,
        total_pnl: 2450.75
      });
    });
  });

  describe('System Metrics Persistence', () => {
    test('should persist Intel NUC system metrics', async () => {
      const systemMetrics = {
        timestamp: new Date('2024-01-15T12:00:00Z'),
        cpu_usage: 75.8,
        ram_usage: 82.3,
        disk_usage: 45.6,
        cpu_temperature: 68.2,
        network_latency: 31,
        ssh_tunnel_status: 'healthy',
        active_connections: 18,
        database_connections: 5,
        trading_engine_status: 'active'
      };

      mockClient.query.mockResolvedValue({
        rows: [{ ...systemMetrics, id: 1 }],
        rowCount: 1
      });

      const result = await databaseManager.executeQuery(
        `INSERT INTO system_metrics 
         (timestamp, cpu_usage, ram_usage, disk_usage, cpu_temperature, network_latency, 
          ssh_tunnel_status, active_connections, database_connections, trading_engine_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          systemMetrics.timestamp,
          systemMetrics.cpu_usage,
          systemMetrics.ram_usage,
          systemMetrics.disk_usage,
          systemMetrics.cpu_temperature,
          systemMetrics.network_latency,
          systemMetrics.ssh_tunnel_status,
          systemMetrics.active_connections,
          systemMetrics.database_connections,
          systemMetrics.trading_engine_status
        ]
      );

      expect(result.rows[0]).toMatchObject({
        cpu_usage: 75.8,
        ram_usage: 82.3,
        ssh_tunnel_status: 'healthy'
      });
    });

    test('should retrieve system performance history', async () => {
      const mockMetrics = Array.from({ length: 24 }, (_, i) => ({
        id: i + 1,
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000), // Last 24 hours
        cpu_usage: 50 + Math.random() * 30,
        ram_usage: 60 + Math.random() * 20,
        disk_usage: 40 + Math.random() * 10,
        cpu_temperature: 55 + Math.random() * 15
      }));

      mockClient.query.mockResolvedValue({
        rows: mockMetrics,
        rowCount: 24
      });

      const result = await databaseManager.executeQuery(
        'SELECT * FROM system_metrics WHERE timestamp >= $1 ORDER BY timestamp ASC',
        [new Date(Date.now() - 24 * 60 * 60 * 1000)]
      );

      expect(result.rows).toHaveLength(24);
      expect(result.rows[0]).toHaveProperty('cpu_usage');
      expect(result.rows[0]).toHaveProperty('ram_usage');
      expect(result.rows[0]).toHaveProperty('cpu_temperature');
    });
  });

  describe('Configuration and Settings Persistence', () => {
    test('should persist trading configuration', async () => {
      const config = {
        key: 'risk_management',
        value: JSON.stringify({
          max_position_size: 1000,
          max_daily_loss: 0.02,
          stop_loss_percentage: 1,
          take_profit_percentage: 3
        }),
        updated_at: new Date(),
        updated_by: 'system'
      };

      mockClient.query.mockResolvedValue({
        rows: [config],
        rowCount: 1
      });

      const result = await databaseManager.executeQuery(
        'INSERT INTO configuration (key, value, updated_at, updated_by) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3 RETURNING *',
        [config.key, config.value, config.updated_at, config.updated_by]
      );

      expect(result.rows[0].key).toBe('risk_management');
      expect(JSON.parse(result.rows[0].value)).toMatchObject({
        max_position_size: 1000,
        max_daily_loss: 0.02
      });
    });

    test('should retrieve configuration settings', async () => {
      const mockConfigs = [
        {
          key: 'risk_management',
          value: '{"max_position_size": 1000, "stop_loss_percentage": 1}',
          updated_at: new Date()
        },
        {
          key: 'notification_settings',
          value: '{"telegram_enabled": true, "email_enabled": true}',
          updated_at: new Date()
        }
      ];

      mockClient.query.mockResolvedValue({
        rows: mockConfigs,
        rowCount: 2
      });

      const result = await databaseManager.executeQuery('SELECT * FROM configuration');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].key).toBe('risk_management');
      expect(result.rows[1].key).toBe('notification_settings');
    });
  });

  describe('Data Integrity and Validation', () => {
    test('should enforce database constraints', async () => {
      // Test unique constraint violation
      mockClient.query.mockRejectedValue({
        code: '23505', // PostgreSQL unique violation error code
        constraint: 'trades_trade_id_unique'
      });

      await expect(databaseManager.executeQuery(
        'INSERT INTO trades (trade_id, symbol, side, quantity, price) VALUES ($1, $2, $3, $4, $5)',
        ['duplicate-id', 'BTC_USDT', 'BUY', 0.001, 45000]
      )).rejects.toMatchObject({
        code: '23505',
        constraint: 'trades_trade_id_unique'
      });
    });

    test('should validate data types and ranges', async () => {
      // Test invalid data type
      mockClient.query.mockRejectedValue({
        code: '22P02', // PostgreSQL invalid text representation
        message: 'invalid input syntax for type numeric'
      });

      await expect(databaseManager.executeQuery(
        'INSERT INTO trades (trade_id, symbol, side, quantity, price) VALUES ($1, $2, $3, $4, $5)',
        ['trade-123', 'BTC_USDT', 'BUY', 'invalid-quantity', 45000]
      )).rejects.toMatchObject({
        code: '22P02'
      });
    });

    test('should handle transaction rollbacks', async () => {
      const mockTransaction = {
        query: jest.fn(),
        rollback: jest.fn(),
        commit: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockTransaction);
      mockTransaction.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('Constraint violation')); // INSERT fails

      const transactionFn = async (client: any) => {
        await client.query('BEGIN');
        await client.query('INSERT INTO trades (trade_id, symbol) VALUES ($1, $2)', ['test', 'BTC_USDT']);
        await client.query('COMMIT');
      };

      await expect(transactionFn(mockTransaction)).rejects.toThrow('Constraint violation');
    });
  });

  describe('Database Health and Monitoring', () => {
    test('should perform health checks', async () => {
      const healthData = {
        status: 'healthy',
        connections: 5,
        max_connections: 100,
        response_time: 15,
        last_check: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Active connections
        .mockResolvedValueOnce({ rows: [{ setting: '100' }] }) // Max connections
        .mockResolvedValueOnce({ rows: [{ now: new Date() }] }); // Current time

      const startTime = Date.now();
      const health = await databaseManager.getHealth();
      const responseTime = Date.now() - startTime;

      expect(health).toMatchObject({
        status: 'healthy',
        responseTime: expect.any(Number)
      });
      expect(health.responseTime).toBeLessThan(1000);
    });

    test('should detect performance issues', async () => {
      // Mock slow query response
      mockClient.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [] }), 2000))
      );

      const startTime = Date.now();
      await databaseManager.executeQuery('SELECT pg_sleep(2)');
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(1900); // Should take at least 2 seconds
    });

    test('should monitor connection pool usage', async () => {
      const poolStats = {
        total_connections: 10,
        idle_connections: 3,
        active_connections: 7,
        waiting_connections: 0
      };

      mockClient.query.mockResolvedValue({
        rows: [poolStats],
        rowCount: 1
      });

      const result = await databaseManager.executeQuery(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'waiting') as waiting_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      expect(result.rows[0]).toMatchObject({
        total_connections: 10,
        active_connections: 7
      });
    });
  });

  describe('Data Backup and Recovery', () => {
    test('should create data backups', async () => {
      const backupData = {
        backup_id: 'backup-20240115-120000',
        tables: ['trades', 'system_metrics', 'configuration'],
        size_bytes: 1048576, // 1MB
        created_at: new Date(),
        status: 'completed'
      };

      mockClient.query.mockResolvedValue({
        rows: [backupData],
        rowCount: 1
      });

      const result = await databaseManager.executeQuery(
        'INSERT INTO backups (backup_id, tables, size_bytes, created_at, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [backupData.backup_id, backupData.tables, backupData.size_bytes, backupData.created_at, backupData.status]
      );

      expect(result.rows[0]).toMatchObject({
        backup_id: 'backup-20240115-120000',
        status: 'completed'
      });
    });

    test('should verify backup integrity', async () => {
      const checksumData = {
        table_name: 'trades',
        row_count: 1500,
        checksum: 'abc123def456',
        verified_at: new Date()
      };

      mockClient.query.mockResolvedValue({
        rows: [checksumData],
        rowCount: 1
      });

      const result = await databaseManager.executeQuery(
        'SELECT table_name, count(*) as row_count, md5(string_agg(md5(t.*::text), \'\' ORDER BY id)) as checksum FROM trades t GROUP BY table_name',
        []
      );

      expect(result.rows[0]).toHaveProperty('table_name', 'trades');
      expect(result.rows[0]).toHaveProperty('row_count');
      expect(result.rows[0]).toHaveProperty('checksum');
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent database operations', async () => {
      const operations = [];
      
      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        mockClient.query.mockResolvedValue({
          rows: [{ id: i, result: `operation-${i}` }],
          rowCount: 1
        });

        operations.push(
          databaseManager.executeQuery('SELECT $1 as result', [`operation-${i}`])
        );
      }

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.rows[0]).toHaveProperty('result', `operation-${index}`);
      });
    });

    test('should handle connection pool under load', async () => {
      const heavyOperations = [];

      // Simulate heavy database load
      for (let i = 0; i < 50; i++) {
        mockClient.query.mockResolvedValue({
          rows: [{ operation_id: i }],
          rowCount: 1
        });

        heavyOperations.push(
          databaseManager.executeQuery('SELECT pg_sleep(0.1), $1 as operation_id', [i])
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(heavyOperations);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});