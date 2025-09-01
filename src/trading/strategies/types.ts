/**
 * Trading Strategy Types and Interfaces
 * 
 * This module defines the core types and interfaces for the trading strategy engine.
 * All strategies implement these interfaces to ensure consistency and interoperability.
 */

export interface MarketData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  timestamp: Date;
  parameters: Record<string, any>;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0-100
  confidence: number; // 0-100
  indicators: string[];
  reasoning: string;
  riskReward: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SignalConfidence {
  overall: number; // 0-100
  technical: number; // 0-100
  volume: number; // 0-100
  momentum: number; // 0-100
  factors: string[];
}

export interface MovingAverageSignal extends TechnicalIndicator {
  name: 'SMA' | 'EMA';
  period: number;
  crossover?: {
    type: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'NONE';
    strength: number;
    volumeConfirmed: boolean;
  };
}

export interface RSISignal extends TechnicalIndicator {
  name: 'RSI';
  period: number;
  overbought: boolean;
  oversold: boolean;
  divergence?: {
    type: 'BULLISH' | 'BEARISH' | 'NONE';
    strength: number;
  };
}

export interface MACDSignal extends TechnicalIndicator {
  name: 'MACD';
  macd: number;
  signal: number;
  histogram: number;
  crossover?: {
    type: 'BULLISH' | 'BEARISH' | 'NONE';
    strength: number;
  };
}

export interface FibonacciLevels {
  high: number;
  low: number;
  levels: {
    '23.6': number;
    '38.2': number;
    '50.0': number;
    '61.8': number;
    '78.6': number;
  };
  support: number[];
  resistance: number[];
}

export interface BreakoutSignal extends TechnicalIndicator {
  name: 'BREAKOUT';
  direction: 'UP' | 'DOWN';
  volumeConfirmed: boolean;
  strength: number;
  falseBreakoutProbability: number;
}

export interface HarmonizedSignal {
  symbol: string;
  timestamp: Date;
  overallSignal: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0-100
  confidence: number; // 0-100
  indicators: TechnicalIndicator[];
  weights: Record<string, number>;
  conflicts: string[];
  reasoning: string;
}

export interface StrategyConfig {
  name: string;
  enabled: boolean;
  weight: number; // 0-1 for harmonization
  parameters: Record<string, any>;
}

export interface BacktestResult {
  strategy: string;
  period: {
    start: Date;
    end: Date;
  };
  trades: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface StrategyPerformance {
  accuracy: number;
  profitability: number;
  consistency: number;
  riskAdjustedReturn: number;
  drawdownRecovery: number;
}