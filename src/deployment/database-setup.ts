/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - DATABASE SETUP AND MIGRATION
 * =============================================================================
 * 
 * This module handles database initialization, schema creation, and migrations
 * for the AI crypto trading agent production deployment.
 */

import { Database } from 'sqlite3';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../core/logger';

interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export class DatabaseSetup {
  private db: Database;
  private dbPath: string;

  constructor(dbPath: string = 'data/trading.db') {
    this.dbPath = dbPath;
    
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    this.db = new Database(this.dbPath);
  }

  /**
   * Initialize database with all required tables
   */
  async initialize(): Promise<void> {
    logger.info('🗄️ Initializing database...');

    try {
      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Create migrations table
      await this.createMigrationsTable();
      
      // Run all migrations
      await this.runMigrations();
      
      // Create indexes for performance
      await this.createIndexes();
      
      // Insert default data
      await this.insertDefaultData();
      
      logger.info('✅ Database initialization completed');
    } catch (error) {
      logger.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create migrations tracking table
   */
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await this.run(sql);
  }

  /**
   * Get all available migrations
   */
  private getMigrations(): Migration[] {
    return [
      {
        version: 1,
        name: 'create_trades_table',
        up: `
          CREATE TABLE trades (
            id TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            timestamp DATETIME NOT NULL,
            strategy TEXT NOT NULL,
            risk_reward REAL NOT NULL,
            stop_loss REAL,
            take_profit REAL,
            status TEXT NOT NULL CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED', 'FAILED')),
            pnl REAL DEFAULT 0,
            fees REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE trades'
      },
      {
        version: 2,
        name: 'create_positions_table',
        up: `
          CREATE TABLE positions (
            id TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            quantity REAL NOT NULL,
            average_price REAL NOT NULL,
            current_price REAL NOT NULL,
            unrealized_pnl REAL NOT NULL,
            realized_pnl REAL DEFAULT 0,
            stop_loss REAL,
            take_profit REAL,
            trailing_stop REAL,
            status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE positions'
      },
      {
        version: 3,
        name: 'create_market_data_table',
        up: `
          CREATE TABLE market_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE market_data'
      },
      {
        version: 4,
        name: 'create_technical_indicators_table',
        up: `
          CREATE TABLE technical_indicators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            indicator_type TEXT NOT NULL,
            value REAL NOT NULL,
            metadata TEXT, -- JSON string for additional data
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE technical_indicators'
      },
      {
        version: 5,
        name: 'create_sentiment_data_table',
        up: `
          CREATE TABLE sentiment_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            symbol TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            score REAL NOT NULL,
            confidence REAL NOT NULL,
            volume INTEGER DEFAULT 0,
            metadata TEXT, -- JSON string for additional data
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE sentiment_data'
      },
      {
        version: 6,
        name: 'create_security_events_table',
        up: `
          CREATE TABLE security_events (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
            source TEXT NOT NULL,
            description TEXT NOT NULL,
            metadata TEXT, -- JSON string for additional data
            status TEXT NOT NULL CHECK (status IN ('DETECTED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE security_events'
      },
      {
        version: 7,
        name: 'create_system_metrics_table',
        up: `
          CREATE TABLE system_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            metric_type TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT,
            metadata TEXT, -- JSON string for additional data
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE system_metrics'
      },
      {
        version: 8,
        name: 'create_audit_logs_table',
        up: `
          CREATE TABLE audit_logs (
            id TEXT PRIMARY KEY,
            timestamp DATETIME NOT NULL,
            user_id TEXT,
            action TEXT NOT NULL,
            resource TEXT NOT NULL,
            details TEXT, -- JSON string for additional data
            ip_address TEXT,
            user_agent TEXT,
            success BOOLEAN NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE audit_logs'
      },
      {
        version: 9,
        name: 'create_configuration_table',
        up: `
          CREATE TABLE configuration (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            is_encrypted BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE configuration'
      },
      {
        version: 10,
        name: 'create_backtest_results_table',
        up: `
          CREATE TABLE backtest_results (
            id TEXT PRIMARY KEY,
            strategy_name TEXT NOT NULL,
            symbol TEXT NOT NULL,
            start_date DATETIME NOT NULL,
            end_date DATETIME NOT NULL,
            initial_capital REAL NOT NULL,
            final_capital REAL NOT NULL,
            total_return REAL NOT NULL,
            sharpe_ratio REAL,
            max_drawdown REAL,
            win_rate REAL,
            total_trades INTEGER,
            metadata TEXT, -- JSON string for detailed results
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
        down: 'DROP TABLE backtest_results'
      }
    ];
  }

  /**
   * Run all pending migrations
   */
  private async runMigrations(): Promise<void> {
    const migrations = this.getMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.version)) {
        logger.info(`📦 Running migration ${migration.version}: ${migration.name}`);
        
        try {
          await this.run(migration.up);
          await this.run(
            'INSERT INTO migrations (version, name) VALUES (?, ?)',
            [migration.version, migration.name]
          );
          
          logger.info(`✅ Migration ${migration.version} completed`);
        } catch (error) {
          logger.error(`❌ Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Get list of executed migration versions
   */
  private async getExecutedMigrations(): Promise<number[]> {
    try {
      const rows = await this.all('SELECT version FROM migrations ORDER BY version');
      return rows.map((row: any) => row.version);
    } catch (error) {
      // Migrations table doesn't exist yet
      return [];
    }
  }

  /**
   * Create database indexes for performance
   */
  private async createIndexes(): Promise<void> {
    logger.info('📊 Creating database indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)',
      'CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)',
      'CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol)',
      'CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status)',
      'CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol_timestamp ON technical_indicators(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_sentiment_data_symbol_timestamp ON sentiment_data(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)',
      'CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_configuration_category ON configuration(category)'
    ];

    for (const indexSql of indexes) {
      await this.run(indexSql);
    }

    logger.info('✅ Database indexes created');
  }

  /**
   * Insert default configuration data
   */
  private async insertDefaultData(): Promise<void> {
    logger.info('📝 Inserting default configuration data...');

    const defaultConfigs = [
      {
        key: 'risk_per_trade',
        value: '0.02',
        description: 'Risk percentage per trade (2%)',
        category: 'risk_management'
      },
      {
        key: 'stop_loss_percentage',
        value: '0.01',
        description: 'Default stop loss percentage (1%)',
        category: 'risk_management'
      },
      {
        key: 'min_risk_reward_ratio',
        value: '1.3',
        description: 'Minimum risk-reward ratio',
        category: 'risk_management'
      },
      {
        key: 'max_positions',
        value: '5',
        description: 'Maximum number of open positions',
        category: 'risk_management'
      },
      {
        key: 'trading_enabled',
        value: 'false',
        description: 'Enable/disable live trading',
        category: 'trading'
      },
      {
        key: 'supported_symbols',
        value: '["BTC_USDT", "ETH_USDT"]',
        description: 'List of supported trading symbols',
        category: 'trading'
      },
      {
        key: 'sentiment_weight',
        value: '0.3',
        description: 'Weight of sentiment analysis in trading decisions',
        category: 'ai'
      },
      {
        key: 'technical_weight',
        value: '0.7',
        description: 'Weight of technical analysis in trading decisions',
        category: 'ai'
      }
    ];

    for (const config of defaultConfigs) {
      await this.run(
        `INSERT OR IGNORE INTO configuration (key, value, description, category) 
         VALUES (?, ?, ?, ?)`,
        [config.key, config.value, config.description, config.category]
      );
    }

    logger.info('✅ Default configuration data inserted');
  }

  /**
   * Backup database
   */
  async backup(backupPath: string): Promise<void> {
    logger.info(`💾 Creating database backup: ${backupPath}`);

    return new Promise((resolve, reject) => {
      const backup = new Database(backupPath);
      
      this.db.backup(backup, (error) => {
        backup.close();
        
        if (error) {
          logger.error('❌ Database backup failed:', error);
          reject(error);
        } else {
          logger.info('✅ Database backup completed');
          resolve();
        }
      });
    });
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath: string): Promise<void> {
    logger.info(`📥 Restoring database from backup: ${backupPath}`);

    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    return new Promise((resolve, reject) => {
      const backup = new Database(backupPath);
      
      backup.backup(this.db, (error) => {
        backup.close();
        
        if (error) {
          logger.error('❌ Database restore failed:', error);
          reject(error);
        } else {
          logger.info('✅ Database restore completed');
          resolve();
        }
      });
    });
  }

  /**
   * Validate database integrity
   */
  async validateIntegrity(): Promise<boolean> {
    logger.info('🔍 Validating database integrity...');

    try {
      const result = await this.get('PRAGMA integrity_check');
      const isValid = result.integrity_check === 'ok';
      
      if (isValid) {
        logger.info('✅ Database integrity check passed');
      } else {
        logger.error('❌ Database integrity check failed:', result);
      }
      
      return isValid;
    } catch (error) {
      logger.error('❌ Database integrity check error:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<any> {
    const stats = {
      tables: {},
      size: 0,
      pageCount: 0,
      pageSize: 0
    };

    try {
      // Get table row counts
      const tables = await this.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );

      for (const table of tables) {
        const result = await this.get(`SELECT COUNT(*) as count FROM ${table.name}`);
        stats.tables[table.name] = result.count;
      }

      // Get database size info
      const sizeInfo = await this.get('PRAGMA page_count');
      const pageSizeInfo = await this.get('PRAGMA page_size');
      
      stats.pageCount = sizeInfo.page_count;
      stats.pageSize = pageSizeInfo.page_size;
      stats.size = stats.pageCount * stats.pageSize;

      return stats;
    } catch (error) {
      logger.error('❌ Failed to get database statistics:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  // Helper methods for database operations
  private run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(error) {
        if (error) {
          reject(error);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  private get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }

  private all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

// Export singleton instance
export const databaseSetup = new DatabaseSetup();