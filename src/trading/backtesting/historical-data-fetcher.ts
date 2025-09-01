/**
 * =============================================================================
 * HISTORICAL DATA FETCHER - REAL MARKET DATA ONLY
 * =============================================================================
 * 
 * This module fetches and validates historical market data from Gate.io API
 * for backtesting purposes. CRITICAL: NO MOCK DATA ALLOWED - only real
 * historical market data is used to ensure accurate backtesting results.
 * 
 * SECURITY FEATURES:
 * - Data integrity verification with cryptographic hashes
 * - Comprehensive data validation and gap detection
 * - Rate limiting and API health monitoring
 * - Audit logging for all data fetching operations
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import crypto from 'crypto';
import { logger } from '@/core/logging/logger';
import { AuditService } from '@/security/audit-service';
import { GateIOClient } from '../api/gate-io-client';
import { 
  HistoricalMarketData, 
  DataValidationResult, 
  DataGap,
  BacktestConfig 
} from './types';
import { MarketData } from '../strategies/types';
import { Candlestick } from '../api/types';

/**
 * Time intervals supported by Gate.io API
 */
export type TimeInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '8h' | '1d';

/**
 * Data fetching configuration
 */
interface DataFetchConfig {
  symbol: string;
  interval: TimeInterval;
  startTime: Date;
  endTime: Date;
  maxRetries: number;
  batchSize: number; // Number of candles per request
  validateIntegrity: boolean;
}

/**
 * Data fetching statistics
 */
interface FetchStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDataPoints: number;
  validDataPoints: number;
  duplicatesRemoved: number;
  gapsDetected: number;
  fetchDuration: number; // in milliseconds
  averageRequestTime: number;
}

/**
 * Historical Data Fetcher with comprehensive validation
 */
export class HistoricalDataFetcher {
  private gateIOClient: GateIOClient;
  private auditService: AuditService;
  private fetchStatistics: FetchStatistics;

  constructor(gateIOClient: GateIOClient) {
    this.gateIOClient = gateIOClient;
    this.auditService = new AuditService();
    this.resetStatistics();
    
    logger.info('📊 Historical Data Fetcher initialized - REAL DATA ONLY');
  }

  /**
   * Fetch historical market data for backtesting
   * CRITICAL: Only real market data from Gate.io API - NO MOCK DATA
   */
  public async fetchHistoricalData(config: DataFetchConfig): Promise<HistoricalMarketData[]> {
    const startTime = Date.now();
    this.resetStatistics();
    
    try {
      logger.info(`📈 Fetching historical data for ${config.symbol} from ${config.startTime.toISOString()} to ${config.endTime.toISOString()}`);
      
      // Validate configuration
      this.validateFetchConfig(config);
      
      // Calculate time range and batch requests
      const batches = this.calculateBatches(config);
      logger.info(`📦 Splitting request into ${batches.length} batches`);
      
      // Fetch data in batches to respect API limits
      const allData: HistoricalMarketData[] = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(`📥 Fetching batch ${i + 1}/${batches.length}: ${batch.start.toISOString()} to ${batch.end.toISOString()}`);
        
        try {
          const batchData = await this.fetchBatch(config.symbol, config.interval, batch.start, batch.end);
          allData.push(...batchData);
          this.fetchStatistics.successfulRequests++;
          
          // Add delay between batches to respect rate limits
          if (i < batches.length - 1) {
            await this.delay(1000); // 1 second delay
          }
          
        } catch (error) {
          logger.error(`❌ Failed to fetch batch ${i + 1}:`, error);
          this.fetchStatistics.failedRequests++;
          
          // Retry failed batch
          if (this.fetchStatistics.failedRequests <= config.maxRetries) {
            logger.info(`🔄 Retrying batch ${i + 1} (attempt ${this.fetchStatistics.failedRequests})`);
            i--; // Retry current batch
            await this.delay(2000); // 2 second delay before retry
          } else {
            throw new Error(`Failed to fetch batch after ${config.maxRetries} retries`);
          }
        }
      }
      
      // Sort data by timestamp
      allData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Remove duplicates
      const uniqueData = this.removeDuplicates(allData);
      this.fetchStatistics.duplicatesRemoved = allData.length - uniqueData.length;
      
      // Validate data integrity
      const validatedData = config.validateIntegrity 
        ? await this.validateDataIntegrity(uniqueData)
        : uniqueData;
      
      // Update statistics
      this.fetchStatistics.totalDataPoints = validatedData.length;
      this.fetchStatistics.validDataPoints = validatedData.filter(d => d.validated).length;
      this.fetchStatistics.fetchDuration = Date.now() - startTime;
      this.fetchStatistics.averageRequestTime = this.fetchStatistics.fetchDuration / this.fetchStatistics.totalRequests;
      
      // Log audit event
      await this.auditService.logSecurityEvent({
        type: 'HISTORICAL_DATA_FETCHED',
        severity: 'INFO',
        details: {
          symbol: config.symbol,
          interval: config.interval,
          dataPoints: validatedData.length,
          statistics: this.fetchStatistics,
        },
        timestamp: new Date(),
      });
      
      logger.info(`✅ Successfully fetched ${validatedData.length} historical data points for ${config.symbol}`);
      logger.info(`📊 Fetch Statistics:`, this.fetchStatistics);
      
      return validatedData;
      
    } catch (error) {
      logger.error('❌ Failed to fetch historical data:', error);
      
      await this.auditService.logSecurityEvent({
        type: 'HISTORICAL_DATA_FETCH_FAILED',
        severity: 'ERROR',
        details: {
          symbol: config.symbol,
          error: error.message,
          statistics: this.fetchStatistics,
        },
        timestamp: new Date(),
      });
      
      throw error;
    }
  }

  /**
   * Fetch historical data for backtesting configuration
   */
  public async fetchForBacktest(backtestConfig: BacktestConfig): Promise<HistoricalMarketData[]> {
    // Determine appropriate interval based on backtest duration
    const durationDays = (backtestConfig.endDate.getTime() - backtestConfig.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const interval = this.determineOptimalInterval(durationDays);
    
    const fetchConfig: DataFetchConfig = {
      symbol: backtestConfig.symbol,
      interval,
      startTime: backtestConfig.startDate,
      endTime: backtestConfig.endDate,
      maxRetries: 3,
      batchSize: 1000,
      validateIntegrity: backtestConfig.dataValidation.requireRealData,
    };
    
    return this.fetchHistoricalData(fetchConfig);
  }

  /**
   * Validate fetched data for backtesting requirements
   * CRITICAL: Enforces NO MOCK DATA policy
   */
  public async validateForBacktesting(
    data: HistoricalMarketData[], 
    config: BacktestConfig
  ): Promise<DataValidationResult> {
    logger.info('🔍 Validating historical data for backtesting - REAL DATA ONLY...');
    
    const validation: DataValidationResult = {
      isValid: true,
      totalPoints: data.length,
      validPoints: 0,
      invalidPoints: 0,
      gaps: [],
      integrityScore: 0,
      errors: [],
      warnings: [],
    };
    
    // CRITICAL: Enforce real data only policy
    if (config.dataValidation.requireRealData) {
      const mockDataPoints = data.filter(d => d.source !== 'GATE_IO' || !d.validated);
      if (mockDataPoints.length > 0) {
        validation.isValid = false;
        validation.errors.push(`CRITICAL: Mock data detected - ${mockDataPoints.length} invalid points. Only real Gate.io data allowed.`);
        
        // Log details of mock data for debugging
        for (const mockPoint of mockDataPoints.slice(0, 5)) { // Log first 5 for debugging
          logger.error(`❌ Mock data point: ${mockPoint.symbol} at ${mockPoint.timestamp.toISOString()}, source: ${mockPoint.source}, validated: ${mockPoint.validated}`);
        }
      }
    }
    
    // Check minimum data points requirement
    if (data.length < config.dataValidation.minDataPoints) {
      validation.isValid = false;
      validation.errors.push(`Insufficient data points: ${data.length} < ${config.dataValidation.minDataPoints}`);
    }
    
    // Validate each data point for market data integrity
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      
      if (this.isValidDataPoint(point) && this.isRealMarketData(point)) {
        validation.validPoints++;
      } else {
        validation.invalidPoints++;
        validation.warnings.push(`Invalid data point at index ${i}: ${point.timestamp.toISOString()}`);
      }
    }
    
    // Detect gaps in data
    validation.gaps = this.detectDataGaps(data, config.dataValidation.maxGapMinutes);
    
    // Check for critical gaps that could affect backtesting accuracy
    const criticalGaps = validation.gaps.filter(gap => gap.severity === 'HIGH');
    if (criticalGaps.length > 0) {
      validation.isValid = false;
      validation.errors.push(`Critical data gaps detected: ${criticalGaps.length} gaps > ${config.dataValidation.maxGapMinutes * 3} minutes`);
    }
    
    // Calculate integrity score
    validation.integrityScore = this.calculateIntegrityScore(validation);
    
    // Additional validation for backtesting quality
    const dataQualityScore = this.calculateDataQualityScore(data);
    if (dataQualityScore < 90) {
      validation.warnings.push(`Data quality score below threshold: ${dataQualityScore}% < 90%`);
    }
    
    // Validate data source authenticity (redundant check for extra security)
    const realDataPoints = data.filter(d => d.source === 'GATE_IO' && d.validated).length;
    if (config.dataValidation.requireRealData && realDataPoints < data.length) {
      validation.isValid = false;
      validation.errors.push(`SECURITY VIOLATION: Mock or tampered data detected: ${data.length - realDataPoints} suspicious points`);
    }
    
    // Log comprehensive validation results
    logger.info(`✅ Data validation completed: ${validation.isValid ? 'VALID' : 'INVALID'}`);
    logger.info(`📊 Validation Results:`, {
      totalPoints: validation.totalPoints,
      validPoints: validation.validPoints,
      invalidPoints: validation.invalidPoints,
      gaps: validation.gaps.length,
      integrityScore: validation.integrityScore,
      dataQualityScore,
      realDataPercentage: (realDataPoints / data.length * 100).toFixed(2) + '%',
    });
    
    if (!validation.isValid) {
      logger.error('❌ Data validation failed:', validation.errors);
    }
    
    return validation;
  }

  /**
   * Verify that data point is real market data from Gate.io
   */
  private isRealMarketData(point: HistoricalMarketData): boolean {
    // Check source authenticity
    if (point.source !== 'GATE_IO') {
      return false;
    }
    
    // Check validation flag
    if (!point.validated) {
      return false;
    }
    
    // Check integrity hash exists
    if (!point.integrity || point.integrity.length < 10) {
      return false;
    }
    
    // Check fetch timestamp is reasonable
    if (!point.fetchedAt || point.fetchedAt > new Date()) {
      return false;
    }
    
    // Additional checks for realistic market data patterns
    if (!this.hasRealisticMarketPatterns(point)) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if data point has realistic market patterns
   */
  private hasRealisticMarketPatterns(point: HistoricalMarketData): boolean {
    // Check for unrealistic price movements (> 50% in one candle)
    const priceRange = point.high - point.low;
    const midPrice = (point.high + point.low) / 2;
    if (priceRange / midPrice > 0.5) {
      return false;
    }
    
    // Check OHLC relationships are valid
    if (point.high < Math.max(point.open, point.close) || 
        point.low > Math.min(point.open, point.close)) {
      return false;
    }
    
    // Check for reasonable volume (not zero or extremely high)
    if (point.volume <= 0 || point.volume > 1e12) {
      return false;
    }
    
    // Check prices are positive and reasonable
    if (point.open <= 0 || point.high <= 0 || point.low <= 0 || point.close <= 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate overall data quality score
   */
  private calculateDataQualityScore(data: HistoricalMarketData[]): number {
    if (data.length === 0) return 0;
    
    let qualityScore = 100;
    
    // Check for data completeness
    const validPoints = data.filter(d => this.isValidDataPoint(d) && this.isRealMarketData(d)).length;
    const completenessScore = (validPoints / data.length) * 100;
    qualityScore = Math.min(qualityScore, completenessScore);
    
    // Check for data consistency (no extreme outliers)
    const prices = data.map(d => d.close);
    const outliers = this.detectPriceOutliers(prices);
    const outlierPenalty = (outliers.length / data.length) * 50;
    qualityScore -= outlierPenalty;
    
    // Check for temporal consistency
    const temporalGaps = this.detectDataGaps(data, 60); // 1 hour max gap
    const gapPenalty = Math.min(temporalGaps.length * 5, 30);
    qualityScore -= gapPenalty;
    
    return Math.max(0, Math.round(qualityScore));
  }

  /**
   * Detect price outliers that might indicate bad data
   */
  private detectPriceOutliers(prices: number[]): number[] {
    if (prices.length < 10) return [];
    
    const outliers: number[] = [];
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
    const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    for (let i = 0; i < prices.length; i++) {
      if (prices[i] < lowerBound || prices[i] > upperBound) {
        outliers.push(i);
      }
    }
    
    return outliers;
  }

  /**
   * Validate fetch configuration
   */
  private validateFetchConfig(config: DataFetchConfig): void {
    if (!config.symbol || config.symbol.trim() === '') {
      throw new Error('Symbol is required');
    }
    
    if (config.startTime >= config.endTime) {
      throw new Error('Start time must be before end time');
    }
    
    if (config.endTime > new Date()) {
      throw new Error('End time cannot be in the future');
    }
    
    const maxHistoryDays = 365; // 1 year maximum
    const durationDays = (config.endTime.getTime() - config.startTime.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays > maxHistoryDays) {
      throw new Error(`Date range too large: ${durationDays} days > ${maxHistoryDays} days`);
    }
    
    if (config.batchSize <= 0 || config.batchSize > 1000) {
      throw new Error('Batch size must be between 1 and 1000');
    }
  }

  /**
   * Calculate batches for data fetching
   */
  private calculateBatches(config: DataFetchConfig): Array<{ start: Date; end: Date }> {
    const batches: Array<{ start: Date; end: Date }> = [];
    const intervalMs = this.getIntervalMilliseconds(config.interval);
    const batchDuration = config.batchSize * intervalMs;
    
    let currentStart = new Date(config.startTime);
    
    while (currentStart < config.endTime) {
      const currentEnd = new Date(Math.min(
        currentStart.getTime() + batchDuration,
        config.endTime.getTime()
      ));
      
      batches.push({
        start: new Date(currentStart),
        end: new Date(currentEnd),
      });
      
      currentStart = new Date(currentEnd.getTime() + intervalMs);
    }
    
    return batches;
  }

  /**
   * Fetch a single batch of data from Gate.io API
   */
  private async fetchBatch(
    symbol: string, 
    interval: TimeInterval, 
    startTime: Date, 
    endTime: Date
  ): Promise<HistoricalMarketData[]> {
    this.fetchStatistics.totalRequests++;
    
    try {
      // Convert to Gate.io API format
      const gateSymbol = symbol.replace('_', '_'); // Ensure correct format
      const from = Math.floor(startTime.getTime() / 1000);
      const to = Math.floor(endTime.getTime() / 1000);
      
      // Make API request for candlestick data
      const response = await this.gateIOClient.makeRequest<Candlestick[]>({
        method: 'GET',
        url: `/spot/candlesticks`,
        params: {
          currency_pair: gateSymbol,
          interval: interval,
          from: from,
          to: to,
        },
        requestType: 'PUBLIC' as any,
        skipAuth: true,
      });
      
      // Convert Gate.io candlestick data to our format
      const historicalData: HistoricalMarketData[] = response.map((candle: Candlestick) => {
        const marketData: HistoricalMarketData = {
          symbol: symbol,
          timestamp: new Date(candle.timestamp * 1000),
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume),
          validated: true,
          source: 'GATE_IO',
          integrity: this.calculateDataHash(candle),
          fetchedAt: new Date(),
        };
        
        return marketData;
      });
      
      logger.debug(`📥 Fetched ${historicalData.length} data points for ${symbol} (${interval})`);
      
      return historicalData;
      
    } catch (error) {
      logger.error(`❌ Failed to fetch batch for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Remove duplicate data points
   */
  private removeDuplicates(data: HistoricalMarketData[]): HistoricalMarketData[] {
    const seen = new Set<string>();
    const unique: HistoricalMarketData[] = [];
    
    for (const point of data) {
      const key = `${point.symbol}_${point.timestamp.getTime()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(point);
      }
    }
    
    return unique;
  }

  /**
   * Validate data integrity with cryptographic verification
   */
  private async validateDataIntegrity(data: HistoricalMarketData[]): Promise<HistoricalMarketData[]> {
    logger.info('🔐 Validating data integrity...');
    
    const validatedData: HistoricalMarketData[] = [];
    
    for (const point of data) {
      // Recalculate hash to verify integrity
      const expectedHash = this.calculateDataHash({
        timestamp: Math.floor(point.timestamp.getTime() / 1000),
        open: point.open.toString(),
        high: point.high.toString(),
        low: point.low.toString(),
        close: point.close.toString(),
        volume: point.volume.toString(),
        quote_volume: '0', // Not used in our calculation
      });
      
      if (point.integrity === expectedHash) {
        validatedData.push({
          ...point,
          validated: true,
        });
      } else {
        logger.warn(`⚠️ Data integrity check failed for ${point.symbol} at ${point.timestamp.toISOString()}`);
        validatedData.push({
          ...point,
          validated: false,
        });
      }
    }
    
    logger.info(`✅ Data integrity validation completed: ${validatedData.filter(d => d.validated).length}/${validatedData.length} valid`);
    
    return validatedData;
  }

  /**
   * Calculate cryptographic hash for data integrity
   */
  private calculateDataHash(candle: any): string {
    const dataString = `${candle.timestamp}_${candle.open}_${candle.high}_${candle.low}_${candle.close}_${candle.volume}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Check if a data point is valid
   */
  private isValidDataPoint(point: HistoricalMarketData): boolean {
    // Check for valid OHLCV data
    if (point.open <= 0 || point.high <= 0 || point.low <= 0 || point.close <= 0) {
      return false;
    }
    
    // Check OHLC relationships
    if (point.high < Math.max(point.open, point.close) || 
        point.low > Math.min(point.open, point.close)) {
      return false;
    }
    
    // Check for reasonable volume
    if (point.volume < 0) {
      return false;
    }
    
    // Check timestamp validity
    if (point.timestamp > new Date() || point.timestamp < new Date('2009-01-01')) {
      return false;
    }
    
    return true;
  }

  /**
   * Detect gaps in historical data
   */
  private detectDataGaps(data: HistoricalMarketData[], maxGapMinutes: number): DataGap[] {
    const gaps: DataGap[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const prevTime = data[i - 1].timestamp.getTime();
      const currTime = data[i].timestamp.getTime();
      const gapMinutes = (currTime - prevTime) / (1000 * 60);
      
      if (gapMinutes > maxGapMinutes) {
        const severity = gapMinutes > maxGapMinutes * 3 ? 'HIGH' : 
                        gapMinutes > maxGapMinutes * 2 ? 'MEDIUM' : 'LOW';
        
        gaps.push({
          startTime: data[i - 1].timestamp,
          endTime: data[i].timestamp,
          durationMinutes: gapMinutes,
          severity,
          impact: `Missing ${Math.floor(gapMinutes / maxGapMinutes)} expected data points`,
        });
      }
    }
    
    return gaps;
  }

  /**
   * Calculate data integrity score
   */
  private calculateIntegrityScore(validation: DataValidationResult): number {
    if (validation.totalPoints === 0) return 0;
    
    const validRatio = validation.validPoints / validation.totalPoints;
    const gapPenalty = Math.min(validation.gaps.length * 0.1, 0.5);
    const errorPenalty = Math.min(validation.errors.length * 0.2, 0.8);
    
    return Math.max(0, (validRatio - gapPenalty - errorPenalty) * 100);
  }

  /**
   * Determine optimal interval based on backtest duration
   */
  private determineOptimalInterval(durationDays: number): TimeInterval {
    if (durationDays <= 7) return '1m';
    if (durationDays <= 30) return '5m';
    if (durationDays <= 90) return '15m';
    if (durationDays <= 180) return '1h';
    return '4h';
  }

  /**
   * Get interval duration in milliseconds
   */
  private getIntervalMilliseconds(interval: TimeInterval): number {
    const intervals: Record<TimeInterval, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    
    return intervals[interval];
  }

  /**
   * Reset fetch statistics
   */
  private resetStatistics(): void {
    this.fetchStatistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDataPoints: 0,
      validDataPoints: 0,
      duplicatesRemoved: 0,
      gapsDetected: 0,
      fetchDuration: 0,
      averageRequestTime: 0,
    };
  }

  /**
   * Delay execution for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get fetch statistics
   */
  public getFetchStatistics(): FetchStatistics {
    return { ...this.fetchStatistics };
  }
}