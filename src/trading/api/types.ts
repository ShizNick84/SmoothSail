/**
 * =============================================================================
 * GATE.IO API TYPES AND INTERFACES
 * =============================================================================
 * 
 * This module defines all TypeScript types and interfaces for Gate.io API
 * integration, ensuring type safety and proper data validation throughout
 * the trading system.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

/**
 * Trading pair symbols supported by the system
 */
export type TradingSymbol = 'BTC_USDT' | 'ETH_USDT';

/**
 * Order types supported by Gate.io
 */
export type OrderType = 'limit' | 'market' | 'stop_limit' | 'stop_market';

/**
 * Order sides
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order status from Gate.io API
 */
export type OrderStatus = 'open' | 'closed' | 'cancelled' | 'expired';

/**
 * Time in force options
 */
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'PO';

/**
 * Account balance information
 */
export interface AccountBalance {
  currency: string;
  available: string;
  locked: string;
  total: string;
  update_time: number;
}

/**
 * Spot account information
 */
export interface SpotAccount {
  currency: string;
  available: string;
  locked: string;
}

/**
 * Market ticker information
 */
export interface MarketTicker {
  currency_pair: string;
  last: string;
  lowest_ask: string;
  highest_bid: string;
  change_percentage: string;
  base_volume: string;
  quote_volume: string;
  high_24h: string;
  low_24h: string;
}

/**
 * Order book entry
 */
export interface OrderBookEntry {
  price: string;
  amount: string;
}

/**
 * Order book data
 */
export interface OrderBook {
  id: number;
  current: number;
  update: number;
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
}

/**
 * Candlestick/OHLCV data
 */
export interface Candlestick {
  timestamp: number;
  volume: string;
  close: string;
  high: string;
  low: string;
  open: string;
  quote_volume: string;
}

/**
 * Trade history entry
 */
export interface TradeHistory {
  id: string;
  create_time: string;
  create_time_ms: string;
  currency_pair: string;
  side: OrderSide;
  role: 'maker' | 'taker';
  amount: string;
  price: string;
  order_id: string;
  fee: string;
  fee_currency: string;
  point_fee: string;
  gt_fee: string;
}

/**
 * Order request parameters
 */
export interface OrderRequest {
  currency_pair: string;
  type: OrderType;
  side: OrderSide;
  amount: string;
  price?: string;
  time_in_force?: TimeInForce;
  iceberg?: string;
  auto_borrow?: boolean;
  auto_repay?: boolean;
  stp_act?: 'cn' | 'co' | 'cb';
  text?: string;
}

/**
 * Order response from Gate.io API
 */
export interface OrderResponse {
  id: string;
  text: string;
  create_time: string;
  update_time: string;
  create_time_ms: number;
  update_time_ms: number;
  status: OrderStatus;
  currency_pair: string;
  type: OrderType;
  account: string;
  side: OrderSide;
  amount: string;
  price: string;
  time_in_force: TimeInForce;
  iceberg: string;
  auto_borrow: boolean;
  auto_repay: boolean;
  left: string;
  filled_total: string;
  fee: string;
  fee_currency: string;
  point_fee: string;
  gt_fee: string;
  gt_discount: boolean;
  rebated_fee: string;
  rebated_fee_currency: string;
}

/**
 * Order modification request
 */
export interface OrderModifyRequest {
  price?: string;
  amount?: string;
  amend_text?: string;
}

/**
 * Server time response
 */
export interface ServerTime {
  server_time: number;
}

/**
 * API error response
 */
export interface APIError {
  label: string;
  message: string;
  detail?: string;
}

/**
 * WebSocket subscription message
 */
export interface WebSocketSubscription {
  time: number;
  channel: string;
  event: 'subscribe' | 'unsubscribe' | 'update';
  payload?: any;
}

/**
 * WebSocket ticker update
 */
export interface WebSocketTicker {
  currency_pair: string;
  last: string;
  change_percentage: string;
  base_volume: string;
  quote_volume: string;
  high_24h: string;
  low_24h: string;
}

/**
 * WebSocket order book update
 */
export interface WebSocketOrderBook {
  t: number; // timestamp
  e: string; // event type
  E: number; // event time
  s: string; // symbol
  U: number; // first update id
  u: number; // final update id
  b: OrderBookEntry[]; // bids
  a: OrderBookEntry[]; // asks
}

/**
 * WebSocket trade update
 */
export interface WebSocketTrade {
  id: number;
  create_time: number;
  create_time_ms: string;
  currency_pair: string;
  side: OrderSide;
  amount: string;
  price: string;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  resetTime: Date;
}

/**
 * API request metadata
 */
export interface RequestMetadata {
  startTime: number;
  endTime?: number;
  requestId: string;
  rateLimitInfo?: RateLimitInfo;
}

/**
 * Trading fees information
 */
export interface TradingFees {
  currency_pair: string;
  maker_fee: string;
  taker_fee: string;
  gt_discount: boolean;
  gt_maker_fee: string;
  gt_taker_fee: string;
  loan_fee: string;
  point_type: string;
}

/**
 * Currency information
 */
export interface CurrencyInfo {
  currency: string;
  delisted: boolean;
  withdraw_disabled: boolean;
  withdraw_delayed: boolean;
  deposit_disabled: boolean;
  trade_disabled: boolean;
}

/**
 * Trading pair information
 */
export interface TradingPairInfo {
  id: string;
  base: string;
  quote: string;
  fee: string;
  min_base_amount: string;
  min_quote_amount: string;
  amount_precision: number;
  precision: number;
  trade_status: 'tradable' | 'untradable';
  sell_start: number;
  buy_start: number;
}

/**
 * Position information (for margin/futures trading)
 */
export interface Position {
  user: number;
  contract: string;
  size: number;
  leverage: string;
  risk_limit: string;
  leverage_max: string;
  maintenance_rate: string;
  value: string;
  margin: string;
  entry_price: string;
  liq_price: string;
  mark_price: string;
  unrealised_pnl: string;
  realised_pnl: string;
  history_pnl: string;
  last_close_pnl: string;
  realised_point: string;
  history_point: string;
  adl_ranking: number;
  pending_orders: number;
  close_order: any;
  mode: string;
  cross_leverage_limit: string;
  update_time: number;
}

/**
 * Withdrawal request
 */
export interface WithdrawalRequest {
  currency: string;
  address: string;
  amount: string;
  memo?: string;
  chain?: string;
}

/**
 * Withdrawal response
 */
export interface WithdrawalResponse {
  id: string;
  timestamp: string;
  currency: string;
  address: string;
  txid: string;
  amount: string;
  memo: string;
  status: 'DONE' | 'CANCEL' | 'REQUEST' | 'MANUAL' | 'BCODE' | 'EXTPEND' | 'FAIL' | 'INVALID' | 'VERIFY' | 'PROCES' | 'PEND' | 'DMOVE' | 'SPLITPEND';
  chain: string;
  fee: string;
}

/**
 * Deposit information
 */
export interface DepositInfo {
  currency: string;
  address: string;
  memo: string;
  chain: string;
  multichain_addresses: Array<{
    chain: string;
    address: string;
    memo: string;
  }>;
}

/**
 * System status information
 */
export interface SystemStatus {
  status: 'normal' | 'maintenance';
  message?: string;
  estimated_recovery_time?: number;
}

/**
 * API response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  error?: APIError;
  metadata?: RequestMetadata;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  from?: number;
  to?: number;
  last_id?: string;
}

/**
 * Query parameters for various endpoints
 */
export interface MarketDataParams extends PaginationParams {
  currency_pair?: string;
  interval?: '10s' | '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '8h' | '1d' | '7d' | '30d';
}

export interface TradeHistoryParams extends PaginationParams {
  currency_pair?: string;
  order_id?: string;
  account?: string;
}

export interface OrderHistoryParams extends PaginationParams {
  currency_pair?: string;
  status?: OrderStatus;
  side?: OrderSide;
  account?: string;
}

/**
 * WebSocket channel types
 */
export type WebSocketChannel = 
  | 'spot.tickers'
  | 'spot.trades'
  | 'spot.candlesticks'
  | 'spot.order_book'
  | 'spot.order_book_update'
  | 'spot.orders'
  | 'spot.usertrades'
  | 'spot.balances';

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  time: number;
  channel: WebSocketChannel;
  event: 'subscribe' | 'unsubscribe' | 'update';
  error?: APIError;
  result?: any;
}

/**
 * Configuration for different trading environments
 */
export interface TradingEnvironment {
  name: 'production' | 'testnet' | 'sandbox';
  baseUrl: string;
  wsUrl: string;
  rateLimits: {
    public: number;
    private: number;
    orders: number;
  };
}

/**
 * Security configuration for API client
 */
export interface SecurityConfig {
  enableSignatureValidation: boolean;
  enableTimestampValidation: boolean;
  timestampWindow: number; // in milliseconds
  enableIPWhitelist: boolean;
  allowedIPs: string[];
  enableRateLimiting: boolean;
  enableCircuitBreaker: boolean;
}

/**
 * Monitoring and alerting configuration
 */
export interface MonitoringConfig {
  enableHealthChecks: boolean;
  healthCheckInterval: number; // in milliseconds
  enableMetricsCollection: boolean;
  metricsRetentionPeriod: number; // in milliseconds
  enableAlerting: boolean;
  alertThresholds: {
    errorRate: number; // percentage
    responseTime: number; // in milliseconds
    failureCount: number;
  };
}

/**
 * Complete Gate.io client configuration
 */
export interface GateIOClientConfig {
  environment: TradingEnvironment;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  proxy?: {
    host: string;
    port: number;
    protocol: 'http' | 'https';
  };
  timeout: number;
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}
