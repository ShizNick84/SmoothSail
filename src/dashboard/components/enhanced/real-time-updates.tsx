'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/toaster';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface RealTimeData {
  portfolio: {
    totalBalance: number;
    dailyPnL: number;
    totalPnL: number;
    positions: number;
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: string;
    cpu: number;
    memory: number;
    storage: number;
    temperature: number;
    network: 'connected' | 'disconnected' | 'slow';
    tunnelStatus: 'connected' | 'disconnected' | 'reconnecting';
  };
  marketData: {
    btcPrice: number;
    btcChange: number;
    ethPrice: number;
    ethChange: number;
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
  };
  recentTrades: Array<{
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    timestamp: string;
    profit?: number;
  }>;
}

interface RealTimeUpdatesProps {
  onDataUpdate: (data: RealTimeData) => void;
  updateInterval?: number;
  children: React.ReactNode;
}

export function RealTimeUpdates({ 
  onDataUpdate, 
  updateInterval = 5000,
  children 
}: RealTimeUpdatesProps) {
  const { addToast } = useToast();
  const [isConnected, setIsConnected] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState<Date>(new Date());
  const intervalRef = React.useRef<NodeJS.Timeout>();

  // Simulate real-time data updates
  const generateMockData = React.useCallback((): RealTimeData => {
    const now = new Date();
    const basePrice = 45000;
    const priceVariation = (Math.random() - 0.5) * 1000;
    const btcPrice = basePrice + priceVariation;
    const btcChange = (Math.random() - 0.5) * 10;

    return {
      portfolio: {
        totalBalance: 125000 + (Math.random() - 0.5) * 5000,
        dailyPnL: (Math.random() - 0.3) * 3000,
        totalPnL: 25000 + (Math.random() - 0.5) * 2000,
        positions: Math.floor(Math.random() * 5) + 1,
      },
      systemHealth: {
        status: Math.random() > 0.9 ? 'warning' : 'healthy',
        uptime: `${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h`,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        storage: 60 + Math.random() * 30,
        temperature: 45 + Math.random() * 25,
        network: Math.random() > 0.95 ? 'slow' : 'connected',
        tunnelStatus: Math.random() > 0.98 ? 'reconnecting' : 'connected',
      },
      marketData: {
        btcPrice,
        btcChange,
        ethPrice: 3000 + (Math.random() - 0.5) * 500,
        ethChange: (Math.random() - 0.5) * 8,
        marketSentiment: btcChange > 2 ? 'bullish' : btcChange < -2 ? 'bearish' : 'neutral',
      },
      recentTrades: [
        {
          id: `trade-${Date.now()}`,
          symbol: 'BTC/USDT',
          side: Math.random() > 0.5 ? 'buy' : 'sell',
          amount: Math.random() * 0.1,
          price: btcPrice,
          timestamp: now.toISOString(),
          profit: (Math.random() - 0.4) * 500,
        }
      ],
    };
  }, []);

  // Start real-time updates
  React.useEffect(() => {
    const startUpdates = () => {
      intervalRef.current = setInterval(() => {
        try {
          const newData = generateMockData();
          onDataUpdate(newData);
          setLastUpdate(new Date());
          setIsConnected(true);
        } catch (error) {
          console.error('Failed to update data:', error);
          setIsConnected(false);
          addToast({
            title: 'Connection Issue',
            description: 'Failed to update real-time data',
            type: 'warning',
            duration: 3000,
          });
        }
      }, updateInterval);
    };

    startUpdates();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateInterval, generateMockData, onDataUpdate, addToast]);

  // Handle visibility change to pause/resume updates
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        // Resume updates when tab becomes visible
        const newData = generateMockData();
        onDataUpdate(newData);
        setLastUpdate(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [generateMockData, onDataUpdate]);

  // Listen for service worker sync events
  React.useEffect(() => {
    const handleTradingDataSynced = () => {
      addToast({
        title: 'Data Synced',
        description: 'Trading data updated from server',
        type: 'success',
        duration: 2000,
      });
    };

    window.addEventListener('tradingDataSynced', handleTradingDataSynced);
    return () => window.removeEventListener('tradingDataSynced', handleTradingDataSynced);
  }, [addToast]);

  return (
    <div className="relative">
      {/* Connection Status Indicator */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            isConnected 
              ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            <div className={`h-1.5 w-1.5 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span>{isConnected ? 'Live Data' : 'Disconnected'}</span>
            <AnimatedEmoji 
              emoji={isConnected ? TradingEmojis.online : TradingEmojis.offline} 
              size="sm" 
              animation={isConnected ? 'pulse' : undefined}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Last Update Timestamp */}
      <div className="fixed bottom-4 right-4 z-40 md:block hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card px-3 py-2 text-xs text-muted-foreground"
        >
          <div className="flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.clock} size="sm" />
            <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </motion.div>
      </div>

      {children}
    </div>
  );
}

// Hook for using real-time data
export function useRealTimeData(initialData?: RealTimeData) {
  const [data, setData] = React.useState<RealTimeData | null>(initialData || null);
  const [isLoading, setIsLoading] = React.useState(!initialData);

  const handleDataUpdate = React.useCallback((newData: RealTimeData) => {
    setData(newData);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    handleDataUpdate,
  };
}

// Component for displaying real-time price ticker
interface PriceTickerProps {
  symbol: string;
  price: number;
  change: number;
  className?: string;
}

export function PriceTicker({ symbol, price, change, className = '' }: PriceTickerProps) {
  const isPositive = change > 0;
  const [prevPrice, setPrevPrice] = React.useState(price);
  const [priceDirection, setPriceDirection] = React.useState<'up' | 'down' | 'neutral'>('neutral');

  React.useEffect(() => {
    if (price !== prevPrice) {
      setPriceDirection(price > prevPrice ? 'up' : 'down');
      setPrevPrice(price);
      
      // Reset direction after animation
      const timer = setTimeout(() => setPriceDirection('neutral'), 1000);
      return () => clearTimeout(timer);
    }
  }, [price, prevPrice]);

  return (
    <motion.div
      className={`flex items-center space-x-2 ${className}`}
      animate={{
        backgroundColor: 
          priceDirection === 'up' ? 'rgba(34, 197, 94, 0.1)' : 
          priceDirection === 'down' ? 'rgba(239, 68, 68, 0.1)' : 
          'transparent'
      }}
      transition={{ duration: 0.5 }}
    >
      <span className="font-medium text-sm">{symbol}</span>
      <motion.span
        key={price}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        className="font-mono font-bold"
      >
        ${price.toFixed(2)}
      </motion.span>
      <div className={`flex items-center space-x-1 text-xs ${
        isPositive ? 'text-green-500' : 'text-red-500'
      }`}>
        <AnimatedEmoji 
          emoji={isPositive ? TradingEmojis.bullish : TradingEmojis.bearish} 
          size="sm"
          animation={Math.abs(change) > 5 ? 'bounce' : undefined}
        />
        <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
      </div>
    </motion.div>
  );
}