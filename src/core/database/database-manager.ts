/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - DATABASE MANAGER
 * =============================================================================
 * 
 * Core database management service that handles all data persistence,
 * connection management, and database operations for the trading system.
 * 
 * Features:
 * - PostgreSQL connection management
 * - Schema management and migrations
 * - Trade history storage
 * - Portfolio state persistence
 * - AI analysis results storage
 * - System metrics logging
 * - Connection pooling
 * - Backup and recovery
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { Logger } from '../logging/logger';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  type: 'postgresql' | 'sqlite';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
}

/**
 * Database health interface
 */
export interface DatabaseHealth {
  isHealthy: boolean;
  connectionCount: number;
  activeConnections: number;
  idleConnections: number;
  totalQueries: number;
  averageQueryTime: number;
  lastError: string | null;
  error?: string; // For compatibility with main.ts error handling
  uptime: number;
  timestamp: Date;
}

/**
 * Trade record interface
 */
export interface TradeRecord {
  id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  fee: number;
  timestamp: Date;
  orderId: string;
  strategy?: string;
  pnl?: number;
  status: 'pending' | 'filled' | 'cancelled';
}

/**
 * Portfolio snapshot interface
 */
export interface PortfolioSnapshot {
  id?: string;
  timestamp: Date;
  totalValue: number;
  balances: Record<string, number>;
  positions: Record<string, any>;
  pnl: number;
  drawdown: number;
}

/**
 * AI analysis record interface
 */
export interface AIAnalysisRecord {
  id?: string;
  symbol: string;
  timestamp: Date;
  analysisType: string;
  result: any;
  confidence: number;
  executionTime: number;
}

/**
 * Main Database Manager class
 * Handles all database operations and connection management
 */
export class DatabaseManager {
  private logger: Logger;
  private config: DatabaseConfig;
  private pool: Pool | null = null;
  private isInitialized: boolean = false;
  private queryCount: number = 0;
  private totalQueryTime: number = 0;
  private startTime: Date = new Date();

  constructor(config: DatabaseConfig) {
    this.logger = new Logger('DatabaseManager');
    this.config = config;

    this.logger.info('Database Manager created', {
      type: config.type,
      host: config.host,
      database: config.database
    });
  }

  /**
   * Initialize the database connection and schema
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('💾 Initializing Database Manager...');

      if (this.config.type === 'postgresql') {
        await this.initializePostgreSQL();
      } else {
        throw new Error(`Database type ${this.config.type} not yet implemented`);
      }

      // Create tables if they don't exist
      await this.createTables();

      // Run any pending migrations
      await this.runMigrations();

      this.isInitialized = true;
      this.logger.info('✅ Database Manager initialization complete');

    } catch (error) {
      this.logger.error('❌ Database Manager initialization failed:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  private async initializePostgreSQL(): Promise<void> {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
      max: this.config.maxConnections || 20,
      idleTimeoutMillis: this.config.idleTimeout || 30000,
      connectionTimeoutMillis: this.config.connectionTimeout || 60000
    };

    this.pool = new Pool(poolConfig);

    // Test connection
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      this.logger.info('✅ PostgreSQL connection established', {
        serverTime: result.rows[0].now
      });
    } finally {
      client.release();
    }

    // Set up error handling
    this.pool.on('error', (err) => {
      this.logger.error('PostgreSQL pool error:', err);
    });

    this.pool.on('connect', () => {
      this.logger.debug('New PostgreSQL client connected');
    });

    this.pool.on('remove', () => {
      this.logger.debug('PostgreSQL client removed from pool');
    });
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      // Trades table
      `CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(20) NOT NULL,
        side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
        amount DECIMAL(20, 8) NOT NULL,
        price DECIMAL(20, 8) NOT NULL,
        fee DECIMAL(20, 8) DEFAULT 0,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        order_id VARCHAR(100) NOT NULL,
        strategy VARCHAR(50),
        pnl DECIMAL(20, 8),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Portfolio snapshots table
      `CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        total_value DECIMAL(20, 8) NOT NULL,
        balances JSONB NOT NULL,
        positions JSONB NOT NULL,
        pnl DECIMAL(20, 8) NOT NULL,
        drawdown DECIMAL(10, 4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // AI analysis results table
      `CREATE TABLE IF NOT EXISTS ai_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        analysis_type VARCHAR(50) NOT NULL,
        result JSONB NOT NULL,
        confidence DECIMAL(5, 4) NOT NULL,
        execution_time INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // System metrics table
      `CREATE TABLE IF NOT EXISTS system_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        metric_type VARCHAR(50) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        value DECIMAL(20, 8) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR(100) UNIQUE NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        price DECIMAL(20, 8),
        filled_amount DECIMAL(20, 8) DEFAULT 0,
        status VARCHAR(20) NOT NULL,
        strategy VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];

    for (const tableSQL of tables) {
      await this.executeQuery(tableSQL);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_trades_symbol_timestamp ON trades(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_portfolio_timestamp ON portfolio_snapshots(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_ai_analysis_symbol_timestamp ON ai_analysis(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol)'
    ];

    for (const indexSQL of indexes) {
      await this.executeQuery(indexSQL);
    }

    this.logger.info('✅ Database tables and indexes created');
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.executeQuery(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Add any migrations here
    const migrations = [
      // Example migration
      // {
      //   name: '001_add_user_preferences',
      //   sql: 'ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT \'{}\'::jsonb'
      // }
    ];

    for (const migration of migrations) {
      const exists = await this.executeQuery(
        'SELECT 1 FROM migrations WHERE name = $1',
        [migration.name]
      );

      if (exists.rows.length === 0) {
        await this.executeQuery(migration.sql);
        await this.executeQuery(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name]
        );
        this.logger.info(`✅ Migration executed: ${migration.name}`);
      }
    }
  }

  /**
   * Execute a database query
   */
  async executeQuery(query: string, params: any[] = []): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      const result = await client.query(query, params);
      const executionTime = Date.now() - startTime;
      
      this.queryCount++;
      this.totalQueryTime += executionTime;

      this.logger.debug('Query executed', {
        query: query.substring(0, 100),
        params: params.length,
        rows: result.rows?.length || 0,
        executionTime
      });

      return result;

    } catch (error) {
      this.logger.error('Query execution failed', {
        query: query.substring(0, 100),
        params,
        error: error
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save trade record
   */
  async saveTrade(trade: TradeRecord): Promise<string> {
    const query = `
      INSERT INTO trades (symbol, side, amount, price, fee, timestamp, order_id, strategy, pnl, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const params = [
      trade.symbol,
      trade.side,
      trade.amount,
      trade.price,
      trade.fee || 0,
      trade.timestamp,
      trade.orderId,
      trade.strategy,
      trade.pnl,
      trade.status
    ];

    const result = await this.executeQuery(query, params);
    return result.rows[0].id;
  }

  /**
   * Get trade history
   */
  async getTradeHistory(symbol?: string, limit: number = 100): Promise<TradeRecord[]> {
    let query = 'SELECT * FROM trades';
    const params: any[] = [];

    if (symbol) {
      query += ' WHERE symbol = $1';
      params.push(symbol);
    }

    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.executeQuery(query, params);
    return result.rows.map(this.mapTradeRecord);
  }

  /**
   * Save portfolio snapshot
   */
  async savePortfolioSnapshot(snapshot: PortfolioSnapshot): Promise<string> {
    const query = `
      INSERT INTO portfolio_snapshots (timestamp, total_value, balances, positions, pnl, drawdown)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const params = [
      snapshot.timestamp,
      snapshot.totalValue,
      JSON.stringify(snapshot.balances),
      JSON.stringify(snapshot.positions),
      snapshot.pnl,
      snapshot.drawdown
    ];

    const result = await this.executeQuery(query, params);
    return result.rows[0].id;
  }

  /**
   * Get portfolio history
   */
  async getPortfolioHistory(limit: number = 100): Promise<PortfolioSnapshot[]> {
    const query = 'SELECT * FROM portfolio_snapshots ORDER BY timestamp DESC LIMIT $1';
    const result = await this.executeQuery(query, [limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      totalValue: parseFloat(row.total_value),
      balances: row.balances,
      positions: row.positions,
      pnl: parseFloat(row.pnl),
      drawdown: parseFloat(row.drawdown)
    }));
  }

  /**
   * Save AI analysis result
   */
  async saveAIAnalysis(analysis: AIAnalysisRecord): Promise<string> {
    const query = `
      INSERT INTO ai_analysis (symbol, timestamp, analysis_type, result, confidence, execution_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const params = [
      analysis.symbol,
      analysis.timestamp,
      analysis.analysisType,
      JSON.stringify(analysis.result),
      analysis.confidence,
      analysis.executionTime
    ];

    const result = await this.executeQuery(query, params);
    return result.rows[0].id;
  }

  /**
   * Get AI analysis history
   */
  async getAIAnalysisHistory(symbol?: string, analysisType?: string, limit: number = 100): Promise<AIAnalysisRecord[]> {
    let query = 'SELECT * FROM ai_analysis WHERE 1=1';
    const params: any[] = [];

    if (symbol) {
      query += ' AND symbol = $' + (params.length + 1);
      params.push(symbol);
    }

    if (analysisType) {
      query += ' AND analysis_type = $' + (params.length + 1);
      params.push(analysisType);
    }

    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.executeQuery(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      timestamp: row.timestamp,
      analysisType: row.analysis_type,
      result: row.result,
      confidence: parseFloat(row.confidence),
      executionTime: row.execution_time
    }));
  }

  /**
   * Save system metric
   */
  async saveSystemMetric(metricType: string, metricName: string, value: number, metadata?: any): Promise<void> {
    const query = `
      INSERT INTO system_metrics (timestamp, metric_type, metric_name, value, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const params = [
      new Date(),
      metricType,
      metricName,
      value,
      metadata ? JSON.stringify(metadata) : null
    ];

    await this.executeQuery(query, params);
  }

  /**
   * Get database health status
   */
  async getHealth(): Promise<DatabaseHealth> {
    if (!this.pool) {
      return {
        isHealthy: false,
        connectionCount: 0,
        activeConnections: 0,
        idleConnections: 0,
        totalQueries: this.queryCount,
        averageQueryTime: 0,
        lastError: 'Database not initialized',
        uptime: 0,
        timestamp: new Date()
      };
    }

    try {
      const health: DatabaseHealth = {
        isHealthy: true,
        connectionCount: this.pool.totalCount,
        activeConnections: this.pool.totalCount - this.pool.idleCount,
        idleConnections: this.pool.idleCount,
        totalQueries: this.queryCount,
        averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
        lastError: null,
        uptime: Date.now() - this.startTime.getTime(),
        timestamp: new Date()
      };

      // Test connection
      await this.executeQuery('SELECT 1');

      return health;

    } catch (error) {
      return {
        isHealthy: false,
        connectionCount: 0,
        activeConnections: 0,
        idleConnections: 0,
        totalQueries: this.queryCount,
        averageQueryTime: 0,
        lastError: error instanceof Error ? error.message : String(error),
        uptime: Date.now() - this.startTime.getTime(),
        timestamp: new Date()
      };
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.info('✅ Database connection closed');
    }
  }

  /**
   * Map database row to trade record
   */
  private mapTradeRecord(row: any): TradeRecord {
    return {
      id: row.id,
      symbol: row.symbol,
      side: row.side,
      amount: parseFloat(row.amount),
      price: parseFloat(row.price),
      fee: parseFloat(row.fee || 0),
      timestamp: row.timestamp,
      orderId: row.order_id,
      strategy: row.strategy,
      pnl: row.pnl ? parseFloat(row.pnl) : undefined,
      status: row.status
    };
  }

  /**
   * Get database manager status for monitoring
   */
  getStatus(): {
    isInitialized: boolean;
    connectionCount: number;
    totalQueries: number;
    timestamp: number;
  } {
    return {
      isInitialized: this.isInitialized,
      connectionCount: this.pool?.totalCount || 0,
      totalQueries: this.queryCount,
      timestamp: Date.now()
    };
  }
}

export default DatabaseManager;
