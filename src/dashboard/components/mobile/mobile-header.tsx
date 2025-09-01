'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Bell, Settings, Wifi, WifiOff, Battery } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBalance?: boolean;
  balance?: number;
  balanceChange?: number;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  showBalance = false,
  balance = 0,
  balanceChange = 0,
  onNotificationClick,
  onSettingsClick,
  className = ''
}: MobileHeaderProps) {
  const [networkStatus, setNetworkStatus] = React.useState<'online' | 'offline'>('online');
  const [batteryLevel, setBatteryLevel] = React.useState<number>(100);
  const [notifications] = React.useState(3);

  // Monitor network status
  React.useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Monitor battery level (if supported)
  React.useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  const isPositiveChange = balanceChange > 0;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card border-b border-border/50 px-4 py-3 md:hidden',
        'sticky top-0 z-40',
        className
      )}
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center space-x-1">
            {networkStatus === 'online' ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
            <span className={networkStatus === 'online' ? 'text-green-500' : 'text-red-500'}>
              {networkStatus}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Battery className={cn(
              'h-3 w-3',
              batteryLevel > 20 ? 'text-green-500' : 'text-red-500'
            )} />
            <span>{batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.robot} animation="pulse" size="sm" />
            <h1 className="text-lg font-bold truncate">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          
          {showBalance && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold font-mono">
                  {formatCurrency(balance)}
                </span>
                <div className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                  isPositiveChange ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                )}>
                  <AnimatedEmoji
                    emoji={isPositiveChange ? TradingEmojis.bullish : TradingEmojis.bearish}
                    size="sm"
                    animation={isPositiveChange ? 'bounce' : 'shake'}
                  />
                  <span>
                    {isPositiveChange ? '+' : ''}{formatCurrency(balanceChange)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationClick}
            className="relative h-8 w-8"
          >
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
              >
                {notifications}
              </motion.span>
            )}
          </Button>

          <ThemeToggle variant="compact" showLabel={false} className="h-8" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}