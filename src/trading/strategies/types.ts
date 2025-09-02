/**
 * Trading Strategy Types
 * 
 * Common interfaces and types used across trading strategies
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

export interface TradingSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  confidence: number;
  indicators: string[];
  reasoning: string;
  riskReward: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface MovingAverageSignal {
  name: string;
  value: number;
  timestamp: Date;
  period: number;
  parameters: {
    fastPeriod: number;
    slowPeriod: number;
    slowEMA: number;
  };
  crossover?: {
    type: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'NONE';
    strength: number;
    volumeConfirmed: boolean;
  };
}

export interface SignalConfidence {
  overall: number;
  technical: number;
  volume: number;
  momentum: number;
  factors: string[];
}

export interface MACDSignal {
  name: string;
  value: number;
  timestamp: Date;
  parameters: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
  macd: number;
  signal: number;
  histogram: number;
  crossover?: {
    type: 'BULLISH' | 'BEARISH' | 'NONE';
    strength: number;
  };
}

export interface RSISignal {
  name: string;
  value: number;
  timestamp: Date;
  parameters: {
    period: number;
    overboughtLevel: number;
    oversoldLevel: number;
  };
  condition: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
}

export interface StrategyConfig {
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  period?: number;
  overboughtLevel?: number;
  oversoldLevel?: number;
}

export interface StrategyResult {
  signal: TradingSignal | null;
  confidence: SignalConfidence;
  indicators: Record<string, any>;
}
