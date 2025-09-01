'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  pnl: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
}

interface RecentTradesProps {
  trades?: Trade[];
  className?: string;
}

// Generate sample trades for demo
function generateSampleTrades(): Trade[] {
  const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
  const trades: Trade[] = [];
  
  for (let i = 0; i < 8; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 2500 : 300;
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.1);
    const amount = Math.random() * 0.5 + 0.1;
    const pnl = (Math.random() - 0.4) * 500; // Slightly biased towards profit
    
    trades.push({
      id: `trade-${i}`,
      symbol,
      type,
      amount,
      price,
      pnl,
      timestamp: new Date(Date.now() - i * 30 * 60 * 1000), // 30 min intervals
      status: Math.random() > 0.1 ? 'completed' : 'pending',
    });
  }
  
  return trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function TradeRow({ trade, index }: { trade: Trade; index: number }) {
  const isProfit = trade.pnl > 0;
  const pnlPercentage = (trade.pnl / (trade.amount * trade.price)) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <div className={cn(
          'p-2 rounded-full',
          trade.type === 'BUY' ? 'bg-green-500/10' : 'bg-red-500/10'
        )}>
          {trade.type === 'BUY' ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </div>
        
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm">{trade.symbol}</span>
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              trade.type === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            )}>
              {trade.type}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {trade.amount.toFixed(4)} @ {formatCurrency(trade.price)}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className={cn(
          'font-medium text-sm',
          isProfit ? 'text-green-500' : 'text-red-500'
        )}>
          {isProfit ? '+' : ''}{formatCurrency(trade.pnl)}
        </div>
        <div className="text-xs text-muted-foreground">
          {trade.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}

export function RecentTrades({ trades, className = '' }: RecentTradesProps) {
  const [tradeData, setTradeData] = React.useState<Trade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setTradeData(trades || generateSampleTrades());
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [trades]);

  const totalPnL = tradeData.reduce((sum, trade) => sum + trade.pnl, 0);
  const winRate = tradeData.length > 0 
    ? (tradeData.filter(trade => trade.pnl > 0).length / tradeData.length) * 100 
    : 0;

  if (isLoading) {
    return (
      <div className={cn('glass-card p-6 rounded-xl', className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AnimatedEmoji emoji={TradingEmojis.loading} animation="spin" size="lg" />
            <p className="mt-2 text-sm text-muted-foreground">Loading trades...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-card p-6 rounded-xl', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.trade} animation="pulse" />
            <span>Recent Trades</span>
          </h3>
          <p className="text-sm text-muted-foreground">Latest trading activity</p>
        </div>
        <div className="text-right">
          <div className={cn(
            'text-sm font-medium',
            totalPnL > 0 ? 'text-green-500' : 'text-red-500'
          )}>
            {totalPnL > 0 ? '+' : ''}{formatCurrency(totalPnL)}
          </div>
          <div className="text-xs text-muted-foreground">
            {winRate.toFixed(1)}% win rate
          </div>
        </div>
      </div>

      {/* Trades List */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {tradeData.map((trade, index) => (
          <TradeRow key={trade.id} trade={trade} index={index} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {tradeData.length} trades today
          </span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-xs">Profitable</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-red-500 rounded-full" />
              <span className="text-xs">Loss</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}