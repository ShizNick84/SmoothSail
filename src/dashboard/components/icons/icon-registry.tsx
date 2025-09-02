'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import * as TradingIcons from './trading-icons';
import { TradingEmojis, AnimatedEmoji } from './emoji-system';

// Combined icon and emoji system
export interface IconConfig {
  type: 'icon' | 'emoji';
  name: string;
  component?: React.ComponentType<any>;
  emoji?: string;
  animation?: string;
  color?: string;
  size?: string;
}

// Comprehensive icon registry combining Lucide icons and emojis
export const iconRegistry: Record<string, IconConfig> = {
  // Trading Actions
  'trading.buy': {
    type: 'icon',
    name: 'buy',
    component: TradingIcons.ProfitIcon,
    color: 'text-green-500',
    animation: 'bounce'
  },
  'trading.sell': {
    type: 'icon',
    name: 'sell',
    component: TradingIcons.LossIcon,
    color: 'text-red-500',
    animation: 'shake'
  },
  'trading.hold': {
    type: 'emoji',
    name: 'hold',
    emoji: TradingEmojis.hold,
    animation: 'pulse'
  },
  'trading.execute': {
    type: 'icon',
    name: 'execute',
    component: TradingIcons.LightningIcon,
    color: 'text-yellow-500',
    animation: 'glow'
  },

  // Market Direction
  'market.bullish': {
    type: 'emoji',
    name: 'bullish',
    emoji: TradingEmojis.bullish,
    animation: 'bounce'
  },
  'market.bearish': {
    type: 'emoji',
    name: 'bearish',
    emoji: TradingEmojis.bearish,
    animation: 'shake'
  },
  'market.sideways': {
    type: 'emoji',
    name: 'sideways',
    emoji: TradingEmojis.sideways,
    animation: 'float'
  },
  'market.volatile': {
    type: 'emoji',
    name: 'volatile',
    emoji: TradingEmojis.volatile,
    animation: 'shake'
  },

  // Performance
  'performance.profit': {
    type: 'icon',
    name: 'profit',
    component: TradingIcons.DiamondIcon,
    color: 'text-green-500',
    animation: 'glow'
  },
  'performance.loss': {
    type: 'emoji',
    name: 'loss',
    emoji: TradingEmojis.loss,
    animation: 'shake'
  },
  'performance.rocket': {
    type: 'icon',
    name: 'rocket',
    component: TradingIcons.RocketIcon,
    color: 'text-blue-500',
    animation: 'bounce'
  },
  'performance.fire': {
    type: 'icon',
    name: 'fire',
    component: TradingIcons.FlameIcon,
    color: 'text-orange-500',
    animation: 'pulse'
  },
  'performance.crown': {
    type: 'icon',
    name: 'crown',
    component: TradingIcons.CrownIcon,
    color: 'text-yellow-500',
    animation: 'float'
  },
  'performance.trophy': {
    type: 'icon',
    name: 'trophy',
    component: TradingIcons.TrophyIcon,
    color: 'text-yellow-600',
    animation: 'bounce'
  },

  // System Status
  'system.online': {
    type: 'emoji',
    name: 'online',
    emoji: TradingEmojis.online,
    animation: 'pulse'
  },
  'system.offline': {
    type: 'emoji',
    name: 'offline',
    emoji: TradingEmojis.offline,
    animation: 'pulse'
  },
  'system.loading': {
    type: 'emoji',
    name: 'loading',
    emoji: TradingEmojis.loading,
    animation: 'spin'
  },
  'system.success': {
    type: 'emoji',
    name: 'success',
    emoji: TradingEmojis.success,
    animation: 'bounce'
  },
  'system.error': {
    type: 'emoji',
    name: 'error',
    emoji: TradingEmojis.error,
    animation: 'shake'
  },
  'system.warning': {
    type: 'emoji',
    name: 'warning',
    emoji: TradingEmojis.warning,
    animation: 'pulse'
  },

  // Hardware Monitoring
  'hardware.cpu': {
    type: 'icon',
    name: 'cpu',
    component: TradingIcons.CPUIcon,
    color: 'text-blue-500'
  },
  'hardware.memory': {
    type: 'icon',
    name: 'memory',
    component: TradingIcons.MemoryIcon,
    color: 'text-green-500'
  },
  'hardware.storage': {
    type: 'icon',
    name: 'storage',
    component: TradingIcons.HardDriveIcon,
    color: 'text-purple-500'
  },
  'hardware.temperature': {
    type: 'icon',
    name: 'temperature',
    component: TradingIcons.ThermometerIcon,
    color: 'text-red-500'
  },
  'hardware.network': {
    type: 'icon',
    name: 'network',
    component: TradingIcons.Wifi,
    color: 'text-blue-500'
  },

  // Security
  'security.shield': {
    type: 'icon',
    name: 'shield',
    component: TradingIcons.ShieldIcon,
    color: 'text-green-600',
    animation: 'float'
  },
  'security.lock': {
    type: 'emoji',
    name: 'lock',
    emoji: TradingEmojis.lock,
    animation: 'pulse'
  },
  'security.danger': {
    type: 'emoji',
    name: 'danger',
    emoji: TradingEmojis.danger,
    animation: 'shake'
  },

  // Notifications
  'notification.bell': {
    type: 'icon',
    name: 'bell',
    component: TradingIcons.BellIcon,
    color: 'text-blue-500',
    animation: 'shake'
  },
  'notification.email': {
    type: 'emoji',
    name: 'email',
    emoji: TradingEmojis.email,
    animation: 'bounce'
  },
  'notification.message': {
    type: 'icon',
    name: 'message',
    component: TradingIcons.MessageIcon,
    color: 'text-green-500'
  },

  // Charts and Analytics
  'chart.line': {
    type: 'icon',
    name: 'line',
    component: TradingIcons.LineChartIcon,
    color: 'text-blue-500'
  },
  'chart.bar': {
    type: 'icon',
    name: 'bar',
    component: TradingIcons.BarChartIcon,
    color: 'text-green-500'
  },
  'chart.pie': {
    type: 'icon',
    name: 'pie',
    component: TradingIcons.PieChartIcon,
    color: 'text-purple-500'
  },
  'chart.activity': {
    type: 'icon',
    name: 'activity',
    component: TradingIcons.ActivityIcon,
    color: 'text-orange-500'
  },

  // Wallet and Money
  'wallet.balance': {
    type: 'icon',
    name: 'wallet',
    component: TradingIcons.WalletIcon,
    color: 'text-green-600'
  },
  'wallet.coins': {
    type: 'icon',
    name: 'coins',
    component: TradingIcons.CoinsIcon,
    color: 'text-yellow-500',
    animation: 'spin'
  },
  'wallet.bitcoin': {
    type: 'icon',
    name: 'bitcoin',
    component: TradingIcons.BitcoinIcon,
    color: 'text-orange-500'
  },
  'wallet.money': {
    type: 'emoji',
    name: 'money',
    emoji: TradingEmojis.money,
    animation: 'bounce'
  },

  // Controls
  'control.play': {
    type: 'icon',
    name: 'play',
    component: TradingIcons.PlayIcon,
    color: 'text-green-500'
  },
  'control.pause': {
    type: 'icon',
    name: 'pause',
    component: TradingIcons.PauseIcon,
    color: 'text-yellow-500'
  },
  'control.stop': {
    type: 'icon',
    name: 'stop',
    component: TradingIcons.StopIcon,
    color: 'text-red-500'
  },
  'control.refresh': {
    type: 'icon',
    name: 'refresh',
    component: TradingIcons.RefreshIcon,
    color: 'text-blue-500',
    animation: 'spin'
  },

  // Navigation
  'nav.home': {
    type: 'icon',
    name: 'home',
    component: TradingIcons.HomeIcon,
    color: 'text-blue-500'
  },
  'nav.settings': {
    type: 'icon',
    name: 'settings',
    component: TradingIcons.SettingsIcon,
    color: 'text-gray-500'
  },
  'nav.user': {
    type: 'icon',
    name: 'user',
    component: TradingIcons.UserIcon,
    color: 'text-blue-500'
  },

  // Emotions and Celebrations
  'emotion.celebration': {
    type: 'emoji',
    name: 'celebration',
    emoji: TradingEmojis.celebration,
    animation: 'bounce'
  },
  'emotion.excited': {
    type: 'emoji',
    name: 'excited',
    emoji: TradingEmojis.excited,
    animation: 'bounce'
  },
  'emotion.confident': {
    type: 'emoji',
    name: 'confident',
    emoji: TradingEmojis.confident,
    animation: 'float'
  },
  'emotion.worried': {
    type: 'emoji',
    name: 'worried',
    emoji: TradingEmojis.worried,
    animation: 'shake'
  },
};

// Dynamic icon component that can render either Lucide icons or emojis
interface DynamicIconProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}

export function DynamicIcon({ 
  name, 
  size = 'md', 
  animate = false, 
  className = '', 
  onClick 
}: DynamicIconProps) {
  const config = iconRegistry[name];
  
  if (!config) {
    console.warn(`Icon "${name}" not found in registry`);
    return <span className="text-muted-foreground">?</span>;
  }

  const baseClasses = `inline-flex items-center justify-center ${className}`;
  
  if (config.type === 'emoji') {
    return (
      <AnimatedEmoji
        emoji={config.emoji!}
        animation={animate ? (config.animation as any) : undefined}
        size={size === 'xs' ? 'sm' : size}
        className={baseClasses}
        onClick={onClick}
      />
    );
  }

  if (config.type === 'icon' && config.component) {
    const IconComponent = config.component;
    const iconClasses = `${config.color || 'text-current'} ${baseClasses}`;
    
    if (animate && config.animation) {
      const animationProps = getAnimationProps(config.animation);
      return (
        <motion.div
          className={iconClasses}
          onClick={onClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          {...animationProps}
        >
          <IconComponent size={size} />
        </motion.div>
      );
    }
    
    return (
      <div className={iconClasses} onClick={onClick}>
        <IconComponent size={size} />
      </div>
    );
  }

  return null;
}

// Helper function to get animation properties
function getAnimationProps(animation: string) {
  const animations: Record<string, any> = {
    bounce: {
      animate: { y: [0, -10, 0] },
      transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2 }
    },
    pulse: {
      animate: { scale: [1, 1.2, 1] },
      transition: { duration: 1, repeat: Infinity, repeatDelay: 1 }
    },
    spin: {
      animate: { rotate: 360 },
      transition: { duration: 2, repeat: Infinity, ease: 'linear' }
    },
    shake: {
      animate: { x: [0, -5, 5, -5, 5, 0] },
      transition: { duration: 0.5, repeat: Infinity, repeatDelay: 3 }
    },
    glow: {
      animate: { 
        filter: [
          'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))',
          'drop-shadow(0 0 20px rgba(59, 130, 246, 0.8))',
          'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))'
        ]
      },
      transition: { duration: 2, repeat: Infinity }
    },
    float: {
      animate: { y: [0, -5, 0] },
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
    }
  };
  
  return animations[animation] || {};
}

// Icon search and filter utilities
export function searchIcons(query: string): string[] {
  const lowercaseQuery = query.toLowerCase();
  return Object.keys(iconRegistry).filter(name => 
    name.toLowerCase().includes(lowercaseQuery) ||
    iconRegistry[name].name.toLowerCase().includes(lowercaseQuery)
  );
}

export function getIconsByCategory(category: string): string[] {
  return Object.keys(iconRegistry).filter(name => 
    name.startsWith(category + '.')
  );
}

export function getAllCategories(): string[] {
  const categories = new Set<string>();
  Object.keys(iconRegistry).forEach(name => {
    const category = name.split('.')[0];
    categories.add(category);
  });
  return Array.from(categories).sort();
}

// Export for easy access
export { iconRegistry as Icons };
export default DynamicIcon;