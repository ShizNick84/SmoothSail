/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - DATABASE PERFORMANCE TESTING
 * =============================================================================
 * Comprehensive database performance testing for PostgreSQL
 * Tests query performance, connection pooling, and concurrent access
 * =============================================================================
 */

import { performance } from 'perf_hooks';
import { Pool, Client } from 'pg';
import { promises as fs } from 'fs';
import { logger } from '@/core/logging/logger';

interface DatabasePerformanceMetrics {
  connectionTimes: number[];
  queryTimes: number[];
  insertTimes: number[];
  updateTimes: number[];
  selectTimes: number[];
  concurrentQueryTimes: number[];
  errors: string[];
  timestamp: number[];
}

interface DatabaseTestResults {
  avgConnectionTime: number;
  avgQueryTime: number;
  avgInsertTime: number;
  avgUpdateTime: number;
  avgSelectTime: number;
  maxConcurrentConnections: number;
  throughput: number; // queries per second
  performanceScore: number;
  recommendations: string[];
}

export class DatabasePerformanceTester {
  private metrics: DatabasePerformanceMetrics = {
    connectionTimes: [],
    queryTimes: [],
    insertTimes: [],
    updateTimes: [],
    selectTimes: [],
    concurrentQueryTimes: [],
    errors: [],
    timestamp: []
  };

  private pool: Pool;
  private readonly connectionConfig = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'trading_agent',
    user: process.env.DATABASE_USER || 'trading_user',
    password: process.env.DATABASE_PASSWORD || 'secure_password',
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  constructor() {
    this.pool = new Pool(this.connectionConfig);
  }

  /**
   * Run comprehensive database performance test
   */
  async runPerformanceTest(): Promise<DatabaseTestResults> {
    logger.info('🚀 Starting Database Performance Test');
    
    const startTime = performance.now();
    
    try {
      // Test connection performance
      await this.testConnectionPerformance();
      
      // Test basic query performance
      await this.testQueryPerformance();
      
      // Test CRUD operations
      await this.testCrudPerformance();
      
      // Test concurrent access
      await this.testConcurrentAccess();
      
      // Test connection pooling
      await this.testConnectionPooling();
      
      const results = this.calculateResults();
      await this.saveResults(results);
      
      const testDuration = (performance.now() - startTime) / 1000;
      logger.info('✅ Database Performance Test Completed', { 
        duration: testDuration,
        performanceScore: results.performanceScore 
      });
      
      return results;
      
    } catch (error) {
      logger.error('❌ Database Performance Test Failed', { error });
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}  /*
*
   * Test database connection performance
   */
  private async testConnectionPerformance(): Promise<void> {
    logger.info('🔧 Testing database connection performance...');
    
    for (let i = 0; i < 10; i++) {
      try {
        const startTime = performance.now();
        const client = await this.pool.connect();
        const connectionTime = performance.now() - startTime;
        
        this.metrics.connectionTimes.push(connectionTime);
        this.metrics.timestamp.push(Date.now());
        
        client.release();
        
      } catch (error) {
        this.metrics.errors.push(`Connection test ${i} failed: ${error.message}`);
      }
    }
    
    logger.info('✅ Database connection test completed', { 
      connections: this.metrics.connectionTimes.length 
    });
  }

  /**
   * Test basic query performance
   */
  private async testQueryPerformance(): Promise<void> {
    logger.info('🔧 Testing database query performance...');
    
    const testQueries = [
      'SELECT NOW()',
      'SELECT version()',
      'SELECT COUNT(*) FROM information_schema.tables',
      'SELECT pg_database_size(current_database())',
      'SELECT current_user'
    ];
    
    for (const query of testQueries) {
      try {
        const startTime = performance.now();
        await this.pool.query(query);
        const queryTime = performance.now() - startTime;
        
        this.metrics.queryTimes.push(queryTime);
        this.metrics.timestamp.push(Date.now());
        
      } catch (error) {
        this.metrics.errors.push(`Query failed: ${query} - ${error.message}`);
      }
    }
    
    logger.info('✅ Database query test completed');
  }

  /**
   * Test CRUD operations performance
   */
  private async testCrudPerformance(): Promise<void> {
    logger.info('🔧 Testing CRUD operations performance...');
    
    try {
      // Create test table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS performance_test (
          id SERIAL PRIMARY KEY,
          data TEXT,
          timestamp TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Test INSERT performance
      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();
        await this.pool.query(
          'INSERT INTO performance_test (data) VALUES ($1)',
          [`Test data ${i}`]
        );
        const insertTime = performance.now() - startTime;
        this.metrics.insertTimes.push(insertTime);
      }
      
      // Test SELECT performance
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        await this.pool.query('SELECT * FROM performance_test LIMIT 10');
        const selectTime = performance.now() - startTime;
        this.metrics.selectTimes.push(selectTime);
      }
      
      // Test UPDATE performance
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        await this.pool.query(
          'UPDATE performance_test SET data = $1 WHERE id = $2',
          [`Updated data ${i}`, i + 1]
        );
        const updateTime = performance.now() - startTime;
        this.metrics.updateTimes.push(updateTime);
      }
      
      // Cleanup
      await this.pool.query('DROP TABLE IF EXISTS performance_test');
      
      logger.info('✅ CRUD operations test completed');
      
    } catch (error) {
      this.metrics.errors.push(`CRUD test failed: ${error.message}`);
      logger.error('❌ CRUD operations test failed', { error });
    }
  }

  /**
   * Test concurrent database access
   */
  private async testConcurrentAccess(): Promise<void> {
    logger.info('🔧 Testing concurrent database access...');
    
    const concurrentQueries = 20;
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrentQueries; i++) {
      promises.push(this.executeConcurrentQuery(i));
    }
    
    try {
      await Promise.all(promises);
      logger.info('✅ Concurrent access test completed');
    } catch (error) {
      this.metrics.errors.push(`Concurrent access test failed: ${error.message}`);
      logger.error('❌ Concurrent access test failed', { error });
    }
  }

  /**
   * Execute concurrent query
   */
  private async executeConcurrentQuery(queryId: number): Promise<void> {
    try {
      const startTime = performance.now();
      await this.pool.query('SELECT pg_sleep(0.1), $1 as query_id', [queryId]);
      const queryTime = performance.now() - startTime;
      
      this.metrics.concurrentQueryTimes.push(queryTime);
      
    } catch (error) {
      this.metrics.errors.push(`Concurrent query ${queryId} failed: ${error.message}`);
    }
  }

  /**
   * Test connection pooling performance
   */
  private async testConnectionPooling(): Promise<void> {
    logger.info('🔧 Testing connection pooling performance...');
    
    try {
      // Test pool efficiency with rapid connections
      const poolTests = [];
      
      for (let i = 0; i < 50; i++) {
        poolTests.push(this.testPoolConnection());
      }
      
      await Promise.all(poolTests);
      
      logger.info('✅ Connection pooling test completed');
      
    } catch (error) {
      this.metrics.errors.push(`Connection pooling test failed: ${error.message}`);
      logger.error('❌ Connection pooling test failed', { error });
    }
  }

  /**
   * Test single pool connection
   */
  private async testPoolConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  /**
   * Calculate test results
   */
  private calculateResults(): DatabaseTestResults {
    const avgConnectionTime = this.average(this.metrics.connectionTimes);
    const avgQueryTime = this.average(this.metrics.queryTimes);
    const avgInsertTime = this.average(this.metrics.insertTimes);
    const avgUpdateTime = this.average(this.metrics.updateTimes);
    const avgSelectTime = this.average(this.metrics.selectTimes);
    
    // Calculate throughput (queries per second)
    const totalQueries = this.metrics.queryTimes.length + 
                        this.metrics.insertTimes.length + 
                        this.metrics.updateTimes.length + 
                        this.metrics.selectTimes.length;
    const totalTime = this.metrics.queryTimes.reduce((a, b) => a + b, 0) +
                     this.metrics.insertTimes.reduce((a, b) => a + b, 0) +
                     this.metrics.updateTimes.reduce((a, b) => a + b, 0) +
                     this.metrics.selectTimes.reduce((a, b) => a + b, 0);
    const throughput = totalQueries / (totalTime / 1000); // queries per second
    
    // Calculate performance score (0-100)
    let performanceScore = 100;
    if (avgConnectionTime > 100) performanceScore -= 20;
    if (avgQueryTime > 50) performanceScore -= 20;
    if (avgInsertTime > 100) performanceScore -= 20;
    if (this.metrics.errors.length > 5) performanceScore -= 40;
    
    const recommendations = this.generateRecommendations(
      avgConnectionTime, avgQueryTime, avgInsertTime, this.metrics.errors.length
    );
    
    return {
      avgConnectionTime,
      avgQueryTime,
      avgInsertTime,
      avgUpdateTime,
      avgSelectTime,
      maxConcurrentConnections: this.metrics.concurrentQueryTimes.length,
      throughput,
      performanceScore: Math.max(performanceScore, 0),
      recommendations
    };
  }

  /**
   * Calculate average of array
   */
  private average(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    avgConnectionTime: number, 
    avgQueryTime: number, 
    avgInsertTime: number, 
    errorCount: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (avgConnectionTime > 100) {
      recommendations.push('High connection time - optimize connection pooling');
      recommendations.push('Consider increasing pool size or connection timeout');
    }
    
    if (avgQueryTime > 50) {
      recommendations.push('Slow query performance - add database indexes');
      recommendations.push('Consider query optimization and EXPLAIN ANALYZE');
    }
    
    if (avgInsertTime > 100) {
      recommendations.push('Slow insert performance - consider batch inserts');
      recommendations.push('Optimize table structure and indexes');
    }
    
    if (errorCount > 5) {
      recommendations.push('High error rate - check database configuration');
      recommendations.push('Verify connection parameters and permissions');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Database performance is optimal');
    }
    
    return recommendations;
  }

  /**
   * Save test results
   */
  private async saveResults(results: DatabaseTestResults): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-performance-${timestamp}.json`;
    const filepath = `tests/reports/${filename}`;
    
    const fullResults = {
      results,
      metrics: this.metrics,
      testInfo: {
        connectionConfig: {
          ...this.connectionConfig,
          password: '***' // Hide password
        },
        timestamp: new Date().toISOString()
      }
    };
    
    await fs.writeFile(filepath, JSON.stringify(fullResults, null, 2));
    logger.info('📊 Database performance results saved', { filepath });
  }
}

/**
 * Run database performance test
 */
export async function runDatabasePerformanceTest(): Promise<void> {
  const tester = new DatabasePerformanceTester();
  
  try {
    const results = await tester.runPerformanceTest();
    
    console.log('\n🎯 Database Performance Results:');
    console.log(`🔗 Average Connection Time: ${results.avgConnectionTime.toFixed(1)}ms`);
    console.log(`📊 Average Query Time: ${results.avgQueryTime.toFixed(1)}ms`);
    console.log(`➕ Average Insert Time: ${results.avgInsertTime.toFixed(1)}ms`);
    console.log(`✏️  Average Update Time: ${results.avgUpdateTime.toFixed(1)}ms`);
    console.log(`🔍 Average Select Time: ${results.avgSelectTime.toFixed(1)}ms`);
    console.log(`🔄 Max Concurrent Connections: ${results.maxConcurrentConnections}`);
    console.log(`🚀 Throughput: ${results.throughput.toFixed(1)} queries/second`);
    console.log(`🎯 Performance Score: ${results.performanceScore.toFixed(1)}/100`);
    
    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
  } catch (error) {
    console.error('❌ Database performance test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runDatabasePerformanceTest();
}