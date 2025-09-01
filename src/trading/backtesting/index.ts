/**
 * =============================================================================
 * BACKTESTING MODULE EXPORTS
 * =============================================================================
 * 
 * This module exports all backtesting components for easy import and use
 * throughout the trading system. The backtesting system provides comprehensive
 * strategy validation using real historical market data only.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

// Core backtesting engine
export { BacktestingEngine } from './backtesting-engine';

// Historical data fetching with validation
export { HistoricalDataFetcher } from './historical-data-fetcher';

// Performance metrics calculation
export { PerformanceCalculator } from './performance-calculator';

// Report generation
export { BacktestReportGenerator } from './report-generator';

// Type definitions
export * from './types';

// Re-export commonly used types for convenience
export type {
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  BacktestPortfolio,
  HistoricalMarketData,
  BacktestProgress,
  DataValidationResult,
  BacktestReportConfig,
} from './types';