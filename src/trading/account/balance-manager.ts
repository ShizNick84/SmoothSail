/**
 * =============================================================================
 * ACCOUNT AND BALANCE MANAGEMENT SYSTEM
 * =============================================================================
 * 
 * This module implements comprehensive account and balance management for
 * Gate.io cryptocurrency trading with real-time monitoring, validation,
 * discrepancy detection, and comprehensive audit logging.
 * 
 * SECURITY FEATURES:
 * - Real-time balance monitoring and validation
 * - Automatic discrepancy detection and alerting
 * - Transaction history tracking and reconciliation
 * - Balance threshold alerts and notifications
 * - Comprehensive audit logging for all balance operations
 * - Emergency balance protection mechanisms
 * 
 * CRITICAL FINANCIAL NOTICE:
 * This system handles real financial assets and account balances.
 * All balance operations must be validated and logged for audit compliance.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { AuditService } from '@/security/audit-service';
import { GateIOClient } from '../api/gate-io-client';
import { AccountBalance, SpotAccount, TradeHistory } from '../api/types';

/**
 * Balance snapshot for historical tracking
 */
interface BalanceSnapshot {
  timestamp: Date;
  balances: Map<string, AccountBalance>;
  totalValueUSD: number;
  snapshotId: string;
}

/**
 * Balance discrepancy detection result
 */
interface DiscrepancyResult {
  hasDiscrepancy: boolean;
  currency: string;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  differencePercent: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
}

/**
 * Balance alert configuration
 */
interface BalanceAlert {
  currency: string;
  alertType: 'LOW_BALANCE' | 'HIGH_BALANCE' | 'RAPID_CHANGE' | 'DISCREPANCY';
  threshold: number;
  enabled: boolean;
  lastTriggered: Date | null;
  triggerCount: number;
}

/**
 * Transaction reconciliation result
 */
interface ReconciliationResult {
  isReconciled: boolean;
  currency: string;
  expectedBalance: number;
  actualBalance: number;
  reconciledTransactions: number;
  unreconciledTransactions: TradeHistory[];
  discrepancies: DiscrepancyResult[];
  timestamp: Date;
}

/**
 * Balance management statistics
 */
interface BalanceStats {
  totalBalanceChecks: number;
  discrepanciesDetected: number;
  alertsTriggered: number;
  reconciliationsPerformed: number;
  lastBalanceUpdate: Date | null;
  averageBalanceCheckTime: number;
  balanceAccuracy: number; // Percentage
}

/**
 * Balance management configuration
 */
interface BalanceConfig {
  enableRealTimeMonitoring: boolean;
  monitoringInterval: number; // milliseconds
  discrepancyThreshold: number; // percentage
  enableAlerts: boolean;
  enableReconciliation: boolean;
  reconciliationInterval: number; // milliseconds
  snapshotRetentionDays: number;
  emergencyStopThreshold: number; // percentage loss
}

/**
 * Account and Balance Management System
 * Handles comprehensive balance monitoring, validation, and reconciliation
 */
export class BalanceManager extends EventEmitter {
  private gateIOClient: GateIOClient;
  private auditService: AuditService;
  private currentBalances: Map<string, AccountBalance> = new Map();
  private balanceHistory: BalanceSnapshot[] = [];
  private balanceAlerts: Map<string, BalanceAlert[]> = new Map();
  private stats: BalanceStats;
  private config: BalanceConfig;
  
  // Monitoring intervals
  private monitoringTimer: NodeJS.Timeout | null = null;
  private reconciliationTimer: NodeJS.Timeout | null = null;
  
  // Transaction tracking
  private transactionHistory: Map<string, TradeHistory[]> = new Map();
  private lastReconciliation: Date | null = null;

  constructor(gateIOClient: GateIOClient) {
    super();
    
    this.gateIOClient = gateIOClient;
    this.auditService = new AuditService();
    
    // Initialize Maps properly
    this.currentBalances = new Map<string, AccountBalance>();
    this.balanceAlerts = new Map<string, BalanceAlert[]>();
    this.transactionHistory = new Map<string, TradeHistory[]>();
    this.balanceHistory = [];
    
    // Initialize statistics
    this.stats = {
      totalBalanceChecks: 0,
      discrepanciesDetected: 0,
      alertsTriggered: 0,
      reconciliationsPerformed: 0,
      lastBalanceUpdate: null,
      averageBalanceCheckTime: 0,
      balanceAccuracy: 100,
    };
    
    // Default configuration
    this.config = {
      enableRealTimeMonitoring: true,
      monitoringInterval: 30000, // 30 seconds
      discrepancyThreshold: 0.01, // 1%
      enableAlerts: true,
      enableReconciliation: true,
      reconciliationInterval: 300000, // 5 minutes
      snapshotRetentionDays: 30,
      emergencyStopThreshold: 10, // 10% loss
    };
    
    // Fix any potential Map handling issues
    this.fixCurrencyIteration().catch(error => {
      logger.error('❌ Failed to fix currency iteration during initialization:', error);
    });
    
    logger.info('💰 Balance Manager initialized with comprehensive monitoring');
  }

  /**
   * Initialize balance manager with configuration
   * 
   * @param config - Balance management configuration
   * @returns Promise<boolean> - Success status
   */
  public async initialize(config?: Partial<BalanceConfig>): Promise<boolean> {
    try {
      logger.info('🚀 Initializing Balance Manager...');
      
      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config };
      }
      
      // Fix currency iteration and Map handling
      await this.fixCurrencyIteration();
      
      // Load initial balances
      await this.loadCurrentBalances();
      
      // Initialize balance alerts
      this.initializeBalanceAlerts();
      
      // Load transaction history
      await this.loadTransactionHistory();
      
      // Start monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring();
      }
      
      // Start reconciliation if enabled
      if (this.config.enableReconciliation) {
        this.startReconciliation();
      }
      
      await this.auditService.logSecurityEvent({
        eventType: 'BALANCE_MANAGER_INITIALIZED',
        actor: 'SYSTEM',
        resource: 'BALANCE_MANAGER',
        action: 'INITIALIZE',
        result: 'SUCCESS',
        auditData: { 
          config: this.config,
          initialBalanceCount: this.currentBalances.size 
        }
      });
      
      logger.info('✅ Balance Manager initialized successfully');
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to initialize Balance Manager:', error);
      await this.auditService.logSecurityEvent({
        eventType: 'BALANCE_MANAGER_INIT_FAILED',
        actor: 'SYSTEM',
        resource: 'BALANCE_MANAGER',
        action: 'INITIALIZE',
        result: 'FAILURE',
        auditData: { error: error.message }
      });
      return false;
    }
  }

  /**
   * Get current account balances with real-time updates
   * 
   * @param forceRefresh - Force refresh from exchange
   * @returns Promise<Map<string, AccountBalance>> - Current balances
   */
  public async getCurrentBalances(forceRefresh: boolean = false): Promise<Map<string, AccountBalance>> {
    try {
      if (forceRefresh || this.shouldRefreshBalances()) {
        await this.loadCurrentBalances();
      }
      
      return new Map(this.currentBalances);
      
    } catch (error) {
      logger.error('❌ Failed to get current balances:', error);
      throw error;
    }
  }

  /**
   * Get balance for specific currency
   * 
   * @param currency - Currency symbol
   * @param forceRefresh - Force refresh from exchange
   * @returns Promise<AccountBalance | null> - Balance or null if not found
   */
  public async getBalance(currency: string, forceRefresh: boolean = false): Promise<AccountBalance | null> {
    try {
      const balances = await this.getCurrentBalances(forceRefresh);
      return balances.get(currency) || null;
      
    } catch (error) {
      logger.error(`❌ Failed to get balance for ${currency}:`, error);
      return null;
    }
  }

  /**
   * Get total portfolio value in USD
   * 
   * @returns Promise<number> - Total portfolio value
   */
  public async getTotalPortfolioValue(): Promise<number> {
    try {
      const balances = await this.getCurrentBalances();
      let totalValue = 0;
      
      const currencies = Array.from(balances.keys());
      for (const currency of currencies) {
        const balance = balances.get(currency)!;
        if (currency === 'USDT' || currency === 'USD') {
          totalValue += parseFloat(balance.total);
        } else {
          // Get current price and calculate value
          const price = await this.getCurrencyPrice(currency);
          totalValue += parseFloat(balance.total) * price;
        }
      }
      
      return totalValue;
      
    } catch (error) {
      logger.error('❌ Failed to calculate total portfolio value:', error);
      return 0;
    }
  }

  /**
   * Validate balance consistency and detect discrepancies
   * 
   * @param currency - Currency to validate (optional, validates all if not specified)
   * @returns Promise<DiscrepancyResult[]> - Discrepancy results
   */
  public async validateBalances(currency?: string): Promise<DiscrepancyResult[]> {
    const startTime = Date.now();
    const discrepancies: DiscrepancyResult[] = [];
    
    try {
      logger.info(`🔍 Validating balances${currency ? ` for ${currency}` : ''}...`);
      
      // Get current balances from exchange
      const exchangeBalances = await this.fetchBalancesFromExchange();
      
      // Get currencies to validate
      const currenciesToValidate = currency 
        ? [currency] 
        : Array.from(this.currentBalances.keys());
      
      for (const curr of currenciesToValidate) {
        const cachedBalance = this.currentBalances.get(curr);
        const exchangeBalance = exchangeBalances.get(curr);
        
        if (cachedBalance && exchangeBalance) {
          const discrepancy = this.detectDiscrepancy(cachedBalance, exchangeBalance);
          if (discrepancy.hasDiscrepancy) {
            discrepancies.push(discrepancy);
            this.stats.discrepanciesDetected++;
            
            // Log discrepancy
            await this.logBalanceEvent('BALANCE_DISCREPANCY_DETECTED', {
              currency: curr,
              discrepancy,
            });
            
            // Trigger alert if enabled
            if (this.config.enableAlerts) {
              await this.triggerBalanceAlert(curr, 'DISCREPANCY', discrepancy);
            }
          }
        }
      }
      
      // Update statistics
      const validationTime = Date.now() - startTime;
      this.updateBalanceStats(validationTime, discrepancies.length);
      
      if (discrepancies.length > 0) {
        logger.warn(`⚠️ Found ${discrepancies.length} balance discrepancies`);
      } else {
        logger.info('✅ No balance discrepancies detected');
      }
      
      return discrepancies;
      
    } catch (error) {
      logger.error('❌ Failed to validate balances:', error);
      throw error;
    }
  }

  /**
   * Reconcile transactions and balances
   * 
   * @param currency - Currency to reconcile (optional, reconciles all if not specified)
   * @returns Promise<ReconciliationResult[]> - Reconciliation results
   */
  public async reconcileTransactions(currency?: string): Promise<ReconciliationResult[]> {
    try {
      logger.info(`🔄 Reconciling transactions${currency ? ` for ${currency}` : ''}...`);
      
      const results: ReconciliationResult[] = [];
      const currenciesToReconcile = currency 
        ? [currency] 
        : Array.from(this.currentBalances.keys());
      
      for (const curr of currenciesToReconcile) {
        const result = await this.reconcileCurrencyTransactions(curr);
        results.push(result);
        
        if (!result.isReconciled) {
          logger.warn(`⚠️ Reconciliation failed for ${curr}: ${result.unreconciledTransactions.length} unreconciled transactions`);
        }
      }
      
      this.stats.reconciliationsPerformed++;
      this.lastReconciliation = new Date();
      
      // Log reconciliation results
      await this.logBalanceEvent('TRANSACTION_RECONCILIATION_COMPLETED', {
        results,
        timestamp: new Date(),
      });
      
      logger.info(`✅ Transaction reconciliation completed for ${results.length} currencies`);
      return results;
      
    } catch (error) {
      logger.error('❌ Failed to reconcile transactions:', error);
      throw error;
    }
  }

  /**
   * Create balance snapshot for historical tracking
   * 
   * @returns Promise<BalanceSnapshot> - Balance snapshot
   */
  public async createBalanceSnapshot(): Promise<BalanceSnapshot> {
    try {
      const snapshot: BalanceSnapshot = {
        timestamp: new Date(),
        balances: new Map(this.currentBalances),
        totalValueUSD: await this.getTotalPortfolioValue(),
        snapshotId: this.generateSnapshotId(),
      };
      
      // Store snapshot
      this.balanceHistory.push(snapshot);
      
      // Clean up old snapshots
      await this.cleanupOldSnapshots();
      
      // Log snapshot creation
      await this.logBalanceEvent('BALANCE_SNAPSHOT_CREATED', {
        snapshotId: snapshot.snapshotId,
        totalValueUSD: snapshot.totalValueUSD,
        balanceCount: snapshot.balances.size,
      });
      
      logger.info(`📸 Balance snapshot created: ${snapshot.snapshotId}`);
      return snapshot;
      
    } catch (error) {
      logger.error('❌ Failed to create balance snapshot:', error);
      throw error;
    }
  }

  /**
   * Get balance history snapshots
   * 
   * @param limit - Maximum number of snapshots to return
   * @returns BalanceSnapshot[] - Historical snapshots
   */
  public getBalanceHistory(limit: number = 100): BalanceSnapshot[] {
    return this.balanceHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Set balance alert for currency
   * 
   * @param currency - Currency symbol
   * @param alertType - Type of alert
   * @param threshold - Alert threshold
   * @returns boolean - Success status
   */
  public setBalanceAlert(
    currency: string, 
    alertType: BalanceAlert['alertType'], 
    threshold: number
  ): boolean {
    try {
      const alerts = this.balanceAlerts.get(currency) || [];
      
      // Remove existing alert of same type
      const filteredAlerts = alerts.filter(alert => alert.alertType !== alertType);
      
      // Add new alert
      const newAlert: BalanceAlert = {
        currency,
        alertType,
        threshold,
        enabled: true,
        lastTriggered: null,
        triggerCount: 0,
      };
      
      filteredAlerts.push(newAlert);
      this.balanceAlerts.set(currency, filteredAlerts);
      
      logger.info(`🔔 Balance alert set: ${currency} ${alertType} at ${threshold}`);
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to set balance alert:', error);
      return false;
    }
  }

  /**
   * Remove balance alert
   * 
   * @param currency - Currency symbol
   * @param alertType - Type of alert to remove
   * @returns boolean - Success status
   */
  public removeBalanceAlert(currency: string, alertType: BalanceAlert['alertType']): boolean {
    try {
      const alerts = this.balanceAlerts.get(currency) || [];
      const filteredAlerts = alerts.filter(alert => alert.alertType !== alertType);
      
      if (filteredAlerts.length < alerts.length) {
        this.balanceAlerts.set(currency, filteredAlerts);
        logger.info(`🔕 Balance alert removed: ${currency} ${alertType}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      logger.error('❌ Failed to remove balance alert:', error);
      return false;
    }
  }

  /**
   * Get balance alerts for currency
   * 
   * @param currency - Currency symbol
   * @returns BalanceAlert[] - Active alerts
   */
  public getBalanceAlerts(currency: string): BalanceAlert[] {
    return this.balanceAlerts.get(currency) || [];
  }

  /**
   * Emergency balance protection - stop trading if significant loss detected
   * 
   * @returns Promise<boolean> - True if emergency stop triggered
   */
  public async checkEmergencyStop(): Promise<boolean> {
    try {
      const currentValue = await this.getTotalPortfolioValue();
      
      if (this.balanceHistory.length === 0) {
        return false; // No historical data to compare
      }
      
      // Get the most recent snapshot from 24 hours ago
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const historicalSnapshot = this.balanceHistory
        .filter(snapshot => snapshot.timestamp <= oneDayAgo)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (!historicalSnapshot) {
        return false; // No historical data old enough
      }
      
      const historicalValue = historicalSnapshot.totalValueUSD;
      const lossPercent = ((historicalValue - currentValue) / historicalValue) * 100;
      
      if (lossPercent >= this.config.emergencyStopThreshold) {
        logger.error(`🚨 EMERGENCY STOP TRIGGERED: ${lossPercent.toFixed(2)}% portfolio loss detected`);
        
        await this.auditService.logSecurityEvent({
          eventType: 'EMERGENCY_BALANCE_STOP',
          actor: 'SYSTEM',
          resource: 'BALANCE_MANAGER',
          action: 'EMERGENCY_STOP',
          result: 'SUCCESS',
          auditData: {
            currentValue,
            historicalValue,
            lossPercent,
            threshold: this.config.emergencyStopThreshold,
          }
        });
        
        // Emit emergency stop event
        this.emit('emergencyStop', {
          reason: 'SIGNIFICANT_BALANCE_LOSS',
          lossPercent,
          currentValue,
          historicalValue,
        });
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      logger.error('❌ Failed to check emergency stop:', error);
      return false;
    }
  }

  /**
   * Load current balances from exchange
   */
  private async loadCurrentBalances(): Promise<void> {
    try {
      const balances = await this.fetchBalancesFromExchange();
      
      // Update current balances
      this.currentBalances = balances;
      this.stats.lastBalanceUpdate = new Date();
      this.stats.totalBalanceChecks++;
      
      // Create snapshot if significant change detected
      if (await this.hasSignificantBalanceChange()) {
        await this.createBalanceSnapshot();
      }
      
      // Check for alerts
      if (this.config.enableAlerts) {
        await this.checkBalanceAlerts();
      }
      
      logger.debug(`💰 Loaded ${balances.size} currency balances`);
      
    } catch (error) {
      logger.error('❌ Failed to load current balances:', error);
      throw error;
    }
  }

  /**
   * Fetch balances from Gate.io exchange
   */
  private async fetchBalancesFromExchange(): Promise<Map<string, AccountBalance>> {
    const spotAccounts = await this.gateIOClient.makeRequest<SpotAccount[]>({
      method: 'GET',
      url: '/spot/accounts',
    });
    
    const balanceMap = new Map<string, AccountBalance>();
    
    for (const account of spotAccounts) {
      const balance: AccountBalance = {
        currency: account.currency,
        available: account.available,
        locked: account.locked,
        total: (parseFloat(account.available) + parseFloat(account.locked)).toString(),
        update_time: Date.now(),
      };
      
      balanceMap.set(account.currency, balance);
    }
    
    return balanceMap;
  }

  /**
   * Detect discrepancy between cached and exchange balances
   */
  private detectDiscrepancy(
    cachedBalance: AccountBalance, 
    exchangeBalance: AccountBalance
  ): DiscrepancyResult {
    const cachedTotal = parseFloat(cachedBalance.total);
    const exchangeTotal = parseFloat(exchangeBalance.total);
    const difference = Math.abs(cachedTotal - exchangeTotal);
    const differencePercent = cachedTotal > 0 ? (difference / cachedTotal) * 100 : 0;
    
    const hasDiscrepancy = differencePercent > this.config.discrepancyThreshold;
    
    let severity: DiscrepancyResult['severity'] = 'LOW';
    if (differencePercent > 10) severity = 'CRITICAL';
    else if (differencePercent > 5) severity = 'HIGH';
    else if (differencePercent > 1) severity = 'MEDIUM';
    
    return {
      hasDiscrepancy,
      currency: cachedBalance.currency,
      expectedBalance: cachedTotal,
      actualBalance: exchangeTotal,
      difference,
      differencePercent,
      severity,
      timestamp: new Date(),
    };
  }

  /**
   * Reconcile transactions for specific currency
   */
  private async reconcileCurrencyTransactions(currency: string): Promise<ReconciliationResult> {
    try {
      // Get current balance
      const currentBalance = this.currentBalances.get(currency);
      if (!currentBalance) {
        throw new Error(`Balance not found for currency: ${currency}`);
      }
      
      // Get transaction history
      const transactions = this.transactionHistory.get(currency) || [];
      
      // Calculate expected balance from transactions
      let expectedBalance = 0;
      const reconciledTransactions: TradeHistory[] = [];
      const unreconciledTransactions: TradeHistory[] = [];
      
      for (const transaction of transactions) {
        try {
          const amount = parseFloat(transaction.amount);
          const fee = parseFloat(transaction.fee);
          
          if (transaction.side === 'buy') {
            expectedBalance += amount - fee;
          } else {
            expectedBalance -= amount + fee;
          }
          
          reconciledTransactions.push(transaction);
        } catch (error) {
          unreconciledTransactions.push(transaction);
        }
      }
      
      const actualBalance = parseFloat(currentBalance.total);
      const isReconciled = Math.abs(expectedBalance - actualBalance) < 0.00001; // Small tolerance for floating point
      
      const discrepancies: DiscrepancyResult[] = [];
      if (!isReconciled) {
        discrepancies.push({
          hasDiscrepancy: true,
          currency,
          expectedBalance,
          actualBalance,
          difference: Math.abs(expectedBalance - actualBalance),
          differencePercent: expectedBalance > 0 ? (Math.abs(expectedBalance - actualBalance) / expectedBalance) * 100 : 0,
          severity: 'MEDIUM',
          timestamp: new Date(),
        });
      }
      
      return {
        isReconciled,
        currency,
        expectedBalance,
        actualBalance,
        reconciledTransactions: reconciledTransactions.length,
        unreconciledTransactions,
        discrepancies,
        timestamp: new Date(),
      };
      
    } catch (error) {
      logger.error(`❌ Failed to reconcile transactions for ${currency}:`, error);
      throw error;
    }
  }

  /**
   * Load transaction history from exchange
   */
  private async loadTransactionHistory(): Promise<void> {
    try {
      // Load trade history for each currency
      const currencies = Array.from(this.currentBalances.keys());
      
      for (const currency of currencies) {
        try {
          const trades = await this.gateIOClient.makeRequest<TradeHistory[]>({
            method: 'GET',
            url: '/spot/my_trades',
            params: {
              currency_pair: `${currency}_USDT`,
              limit: 100,
            },
          });
          
          this.transactionHistory.set(currency, trades);
        } catch (error) {
          // Some currencies might not have trading pairs, skip silently
          logger.debug(`No trade history found for ${currency}`);
        }
      }
      
      logger.info(`📋 Loaded transaction history for ${this.transactionHistory.size} currencies`);
      
    } catch (error) {
      logger.error('❌ Failed to load transaction history:', error);
    }
  }

  /**
   * Initialize default balance alerts
   */
  private initializeBalanceAlerts(): void {
    // Set default low balance alerts for major currencies
    const majorCurrencies = ['BTC', 'ETH', 'USDT'];
    
    for (const currency of majorCurrencies) {
      this.setBalanceAlert(currency, 'LOW_BALANCE', 0.001); // Very low threshold
    }
    
    logger.info('🔔 Default balance alerts initialized');
  }

  /**
   * Start real-time balance monitoring
   */
  private startRealTimeMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.loadCurrentBalances();
        await this.checkEmergencyStop();
      } catch (error) {
        logger.error('❌ Error in balance monitoring:', error);
      }
    }, this.config.monitoringInterval);
    
    logger.info('👁️ Started real-time balance monitoring');
  }

  /**
   * Start transaction reconciliation
   */
  private startReconciliation(): void {
    this.reconciliationTimer = setInterval(async () => {
      try {
        await this.reconcileTransactions();
      } catch (error) {
        logger.error('❌ Error in transaction reconciliation:', error);
      }
    }, this.config.reconciliationInterval);
    
    logger.info('🔄 Started transaction reconciliation');
  }

  /**
   * Check balance alerts
   */
  private async checkBalanceAlerts(): Promise<void> {
    const alertCurrencies = Array.from(this.balanceAlerts.keys());
    for (const currency of alertCurrencies) {
      const alerts = this.balanceAlerts.get(currency)!;
      const balance = this.currentBalances.get(currency);
      if (!balance) continue;
      
      for (const alert of alerts) {
        if (!alert.enabled) continue;
        
        const shouldTrigger = await this.shouldTriggerAlert(balance, alert);
        if (shouldTrigger) {
          await this.triggerBalanceAlert(currency, alert.alertType, alert);
        }
      }
    }
  }

  /**
   * Determine if alert should be triggered
   */
  private async shouldTriggerAlert(balance: AccountBalance, alert: BalanceAlert): Promise<boolean> {
    const totalBalance = parseFloat(balance.total);
    
    switch (alert.alertType) {
      case 'LOW_BALANCE':
        return totalBalance < alert.threshold;
      case 'HIGH_BALANCE':
        return totalBalance > alert.threshold;
      case 'RAPID_CHANGE':
        // Check for rapid balance changes (simplified)
        return false; // Would need historical comparison
      case 'DISCREPANCY':
        return false; // Handled separately in validation
      default:
        return false;
    }
  }

  /**
   * Trigger balance alert
   */
  private async triggerBalanceAlert(
    currency: string, 
    alertType: BalanceAlert['alertType'], 
    alertData: any
  ): Promise<void> {
    try {
      // Update alert statistics
      const alerts = this.balanceAlerts.get(currency) || [];
      const alert = alerts.find(a => a.alertType === alertType);
      if (alert) {
        alert.lastTriggered = new Date();
        alert.triggerCount++;
      }
      
      this.stats.alertsTriggered++;
      
      // Log alert
      await this.logBalanceEvent('BALANCE_ALERT_TRIGGERED', {
        currency,
        alertType,
        alertData,
      });
      
      // Emit alert event
      this.emit('balanceAlert', {
        currency,
        alertType,
        alertData,
        timestamp: new Date(),
      });
      
      logger.warn(`🔔 Balance alert triggered: ${currency} ${alertType}`);
      
    } catch (error) {
      logger.error('❌ Failed to trigger balance alert:', error);
    }
  }

  /**
   * Check if balances should be refreshed
   */
  private shouldRefreshBalances(): boolean {
    if (!this.stats.lastBalanceUpdate) return true;
    
    const timeSinceUpdate = Date.now() - this.stats.lastBalanceUpdate.getTime();
    return timeSinceUpdate > this.config.monitoringInterval;
  }

  /**
   * Check if there's a significant balance change
   */
  private async hasSignificantBalanceChange(): Promise<boolean> {
    if (this.balanceHistory.length === 0) return true;
    
    const lastSnapshot = this.balanceHistory[this.balanceHistory.length - 1];
    const currentValue = await this.getTotalPortfolioValue();
    const changePercent = Math.abs((currentValue - lastSnapshot.totalValueUSD) / lastSnapshot.totalValueUSD) * 100;
    
    return changePercent > 1; // 1% change threshold
  }

  /**
   * Get currency price in USD
   */
  private async getCurrencyPrice(currency: string): Promise<number> {
    try {
      if (currency === 'USDT' || currency === 'USD') return 1;
      
      const ticker = await this.gateIOClient.makeRequest({
        method: 'GET',
        url: '/spot/tickers',
        params: { currency_pair: `${currency}_USDT` },
      });
      
      return parseFloat(ticker[0]?.last || '0');
      
    } catch (error) {
      logger.error(`❌ Failed to get price for ${currency}:`, error);
      return 0;
    }
  }

  /**
   * Update balance statistics
   */
  private updateBalanceStats(validationTime: number, discrepancyCount: number): void {
    // Update average validation time
    const alpha = 0.1;
    this.stats.averageBalanceCheckTime = 
      (alpha * validationTime) + ((1 - alpha) * this.stats.averageBalanceCheckTime);
    
    // Update balance accuracy
    const totalChecks = this.stats.totalBalanceChecks;
    const totalDiscrepancies = this.stats.discrepanciesDetected;
    this.stats.balanceAccuracy = totalChecks > 0 ? ((totalChecks - totalDiscrepancies) / totalChecks) * 100 : 100;
  }

  /**
   * Clean up old snapshots
   */
  private async cleanupOldSnapshots(): Promise<void> {
    const cutoffDate = new Date(Date.now() - (this.config.snapshotRetentionDays * 24 * 60 * 60 * 1000));
    
    const initialCount = this.balanceHistory.length;
    this.balanceHistory = this.balanceHistory.filter(
      snapshot => snapshot.timestamp > cutoffDate
    );
    
    const removedCount = initialCount - this.balanceHistory.length;
    if (removedCount > 0) {
      logger.info(`🧹 Cleaned up ${removedCount} old balance snapshots`);
    }
  }

  /**
   * Generate unique snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log balance event for audit trail
   */
  private async logBalanceEvent(eventType: string, eventData: any): Promise<void> {
    await this.auditService.logSecurityEvent({
      eventType: eventType,
      actor: 'SYSTEM',
      resource: 'BALANCE_MANAGER',
      action: 'BALANCE_EVENT',
      result: 'SUCCESS',
      auditData: eventData
    });
  }

  /**
   * Get balance management statistics
   */
  public getBalanceStats(): BalanceStats {
    return { ...this.stats };
  }

  /**
   * Get balance management configuration
   */
  public getConfig(): BalanceConfig {
    return { ...this.config };
  }

  /**
   * Update balance management configuration
   */
  public updateConfig(config: Partial<BalanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if interval changed
    if (config.monitoringInterval && this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.startRealTimeMonitoring();
    }
    
    // Restart reconciliation if interval changed
    if (config.reconciliationInterval && this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
      this.startReconciliation();
    }
    
    logger.info('⚙️ Balance management configuration updated');
  }

  /**
   * Get total balance (alias for getTotalPortfolioValue for compatibility)
   * 
   * @returns Promise<number> - Total portfolio value in USD
   */
  public async getTotalBalance(): Promise<number> {
    return await this.getTotalPortfolioValue();
  }

  /**
   * Get current positions for all currencies with non-zero balances
   * 
   * @returns Promise<Map<string, AccountBalance>> - Current positions
   */
  public async getPositions(): Promise<Map<string, AccountBalance>> {
    try {
      const balances = await this.getCurrentBalances();
      const positions = new Map<string, AccountBalance>();
      
      // Filter out zero balances and include only meaningful positions
      const currencies = Array.from(balances.keys());
      for (const currency of currencies) {
        const balance = balances.get(currency)!;
        const totalBalance = parseFloat(balance.total);
        if (totalBalance > 0.00000001) { // Filter out dust amounts
          positions.set(currency, balance);
        }
      }
      
      logger.debug(`📊 Retrieved ${positions.size} active positions`);
      return positions;
      
    } catch (error) {
      logger.error('❌ Failed to get positions:', error);
      return new Map();
    }
  }

  /**
   * Refresh balance data from exchange
   * 
   * @returns Promise<boolean> - Success status
   */
  public async refreshBalance(): Promise<boolean> {
    try {
      logger.info('🔄 Refreshing balance data from exchange...');
      
      await this.loadCurrentBalances();
      
      // Validate balances after refresh
      const discrepancies = await this.validateBalances();
      
      // Log refresh event
      await this.logBalanceEvent('BALANCE_REFRESH_COMPLETED', {
        balanceCount: this.currentBalances.size,
        discrepanciesFound: discrepancies.length,
        timestamp: new Date(),
      });
      
      logger.info(`✅ Balance refresh completed - ${this.currentBalances.size} currencies loaded`);
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to refresh balance:', error);
      await this.logBalanceEvent('BALANCE_REFRESH_FAILED', {
        error: error.message,
        timestamp: new Date(),
      });
      return false;
    }
  }

  /**
   * Check if balance manager is healthy and operational
   * 
   * @returns Promise<boolean> - Health status
   */
  public async isHealthy(): Promise<boolean> {
    try {
      const healthChecks = {
        hasBalances: this.currentBalances.size > 0,
        recentUpdate: this.stats.lastBalanceUpdate && 
          (Date.now() - this.stats.lastBalanceUpdate.getTime()) < (this.config.monitoringInterval * 2),
        apiConnectivity: false,
        lowDiscrepancyRate: this.stats.balanceAccuracy > 95,
        noRecentErrors: true, // Would need error tracking
      };
      
      // Test API connectivity
      try {
        await this.gateIOClient.makeRequest({
          method: 'GET',
          url: '/spot/accounts',
          params: { limit: 1 }
        });
        healthChecks.apiConnectivity = true;
      } catch (error) {
        logger.warn('⚠️ API connectivity check failed:', error.message);
        healthChecks.apiConnectivity = false;
      }
      
      // Calculate overall health
      const healthScore = Object.values(healthChecks).filter(Boolean).length / Object.keys(healthChecks).length;
      const isHealthy = healthScore >= 0.8; // 80% of checks must pass
      
      // Log health check
      await this.logBalanceEvent('BALANCE_MANAGER_HEALTH_CHECK', {
        isHealthy,
        healthScore,
        healthChecks,
        timestamp: new Date(),
      });
      
      if (!isHealthy) {
        logger.warn(`⚠️ Balance Manager health check failed - Score: ${(healthScore * 100).toFixed(1)}%`);
      } else {
        logger.debug(`✅ Balance Manager healthy - Score: ${(healthScore * 100).toFixed(1)}%`);
      }
      
      return isHealthy;
      
    } catch (error) {
      logger.error('❌ Failed to check balance manager health:', error);
      return false;
    }
  }

  /**
   * Fix currency iteration issues by ensuring proper Map handling
   * 
   * @returns Promise<void>
   */
  private async fixCurrencyIteration(): Promise<void> {
    try {
      // Ensure currentBalances is properly initialized as a Map
      if (!(this.currentBalances instanceof Map)) {
        this.currentBalances = new Map();
        logger.warn('⚠️ Fixed currentBalances Map initialization');
      }
      
      // Ensure balanceAlerts is properly initialized as a Map
      if (!(this.balanceAlerts instanceof Map)) {
        this.balanceAlerts = new Map();
        logger.warn('⚠️ Fixed balanceAlerts Map initialization');
      }
      
      // Ensure transactionHistory is properly initialized as a Map
      if (!(this.transactionHistory instanceof Map)) {
        this.transactionHistory = new Map();
        logger.warn('⚠️ Fixed transactionHistory Map initialization');
      }
      
      // Clean up any invalid entries in Maps
      const currencies = Array.from(this.currentBalances.keys());
      for (const currency of currencies) {
        const balance = this.currentBalances.get(currency);
        if (!currency || typeof currency !== 'string' || !balance) {
          this.currentBalances.delete(currency);
          logger.warn(`⚠️ Removed invalid balance entry: ${currency}`);
        }
      }
      
      logger.debug('✅ Currency iteration and Map handling verified');
      
    } catch (error) {
      logger.error('❌ Failed to fix currency iteration:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down Balance Manager...');
    
    // Stop monitoring timers
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    if (this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
      this.reconciliationTimer = null;
    }
    
    // Create final snapshot
    await this.createBalanceSnapshot();
    
    // Log final statistics
    await this.auditService.logSecurityEvent({
      eventType: 'BALANCE_MANAGER_SHUTDOWN',
      actor: 'SYSTEM',
      resource: 'BALANCE_MANAGER',
      action: 'SHUTDOWN',
      result: 'SUCCESS',
      auditData: { 
        stats: this.stats,
        balanceCount: this.currentBalances.size,
        snapshotCount: this.balanceHistory.length 
      }
    });
    
    logger.info('✅ Balance Manager shutdown completed');
  }
}

// Export types
export type {
  BalanceSnapshot,
  DiscrepancyResult,
  BalanceAlert,
  ReconciliationResult,
  BalanceStats,
  BalanceConfig,
};
