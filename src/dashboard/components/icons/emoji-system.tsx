'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Comprehensive emoji system for trading dashboard
export const TradingEmojis = {
  // Market Direction
  bullish: '📈',
  bearish: '📉',
  sideways: '➡️',
  volatile: '🎢',
  
  // Money & Profit
  money: '💰',
  dollar: '💵',
  profit: '💎',
  loss: '💸',
  rich: '🤑',
  bank: '🏦',
  coins: '🪙',
  gem: '💎',
  
  // Trading Actions
  buy: '🟢',
  sell: '🔴',
  hold: '🟡',
  trade: '🔄',
  execute: '⚡',
  pending: '⏳',
  
  // Performance
  rocket: '🚀',
  moon: '🌙',
  fire: '🔥',
  explosion: '💥',
  star: '⭐',
  crown: '👑',
  trophy: '🏆',
  medal: '🏅',
  
  // Risk & Security
  shield: '🛡️',
  lock: '🔒',
  unlock: '🔓',
  key: '🔑',
  warning: '⚠️',
  danger: '🚨',
  safe: '🔐',
  
  // System Status
  online: '🟢',
  offline: '🔴',
  loading: '⏳',
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  question: '❓',
  exclamation: '❗',
  
  // Emotions & Reactions
  happy: '😊',
  sad: '😢',
  excited: '🤩',
  worried: '😰',
  confident: '😎',
  surprised: '😲',
  thinking: '🤔',
  celebration: '🎉',
  
  // Time & Calendar
  clock: '🕐',
  calendar: '📅',
  hourglass: '⏳',
  stopwatch: '⏱️',
  alarm: '⏰',
  
  // Communication
  bell: '🔔',
  mute: '🔕',
  email: '📧',
  message: '💬',
  notification: '🔔',
  alert: '🚨',
  
  // Technology
  computer: '💻',
  phone: '📱',
  robot: '🤖',
  ai: '🧠',
  lightning: '⚡',
  wifi: '📶',
  satellite: '🛰️',
  
  // Charts & Analytics
  chart: '📊',
  graph: '📈',
  analytics: '📉',
  data: '📋',
  report: '📄',
  
  // Weather (Market Conditions)
  sunny: '☀️',
  cloudy: '☁️',
  storm: '⛈️',
  rainbow: '🌈',
  
  // Animals (Market Metaphors)
  bull: '🐂',
  bear: '🐻',
  whale: '🐋',
  shark: '🦈',
  eagle: '🦅',
  
  // Crypto Specific
  bitcoin: '₿',
  ethereum: 'Ξ',
  crypto: '🪙',
  blockchain: '⛓️',
  mining: '⛏️',
  
  // Gestures
  thumbsUp: '👍',
  thumbsDown: '👎',
  clap: '👏',
  wave: '👋',
  point: '👉',
  muscle: '💪',
  
  // Objects
  target: '🎯',
  dart: '🎯',
  magnet: '🧲',
  gear: '⚙️',
  tool: '🔧',
  hammer: '🔨',
  
  // Nature
  tree: '🌳',
  seed: '🌱',
  flower: '🌸',
  mountain: '⛰️',
  ocean: '🌊',
  
  // Food (Fun)
  pizza: '🍕',
  coffee: '☕',
  champagne: '🍾',
  cake: '🎂',
  
  // Transport
  car: '🚗',
  plane: '✈️',
  ship: '🚢',
  train: '🚄',
  
  // Misc
  magic: '✨',
  crystal: '🔮',
  dice: '🎲',
  gift: '🎁',
  balloon: '🎈',
  confetti: '🎊',
};

// Emoji categories for organized display
export const EmojiCategories = {
  trading: [
    TradingEmojis.bullish,
    TradingEmojis.bearish,
    TradingEmojis.buy,
    TradingEmojis.sell,
    TradingEmojis.hold,
    TradingEmojis.trade,
    TradingEmojis.execute,
  ],
  money: [
    TradingEmojis.money,
    TradingEmojis.dollar,
    TradingEmojis.profit,
    TradingEmojis.loss,
    TradingEmojis.rich,
    TradingEmojis.coins,
    TradingEmojis.gem,
  ],
  performance: [
    TradingEmojis.rocket,
    TradingEmojis.fire,
    TradingEmojis.star,
    TradingEmojis.crown,
    TradingEmojis.trophy,
    TradingEmojis.medal,
  ],
  status: [
    TradingEmojis.online,
    TradingEmojis.offline,
    TradingEmojis.success,
    TradingEmojis.error,
    TradingEmojis.warning,
    TradingEmojis.info,
  ],
  emotions: [
    TradingEmojis.happy,
    TradingEmojis.excited,
    TradingEmojis.confident,
    TradingEmojis.worried,
    TradingEmojis.celebration,
  ],
};

// Animated emoji component
interface AnimatedEmojiProps {
  emoji: string;
  animation?: 'bounce' | 'pulse' | 'spin' | 'shake' | 'glow' | 'float';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

const animations = {
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
      textShadow: [
        '0 0 5px rgba(255, 255, 255, 0.5)',
        '0 0 20px rgba(255, 255, 255, 0.8)',
        '0 0 5px rgba(255, 255, 255, 0.5)'
      ]
    },
    transition: { duration: 2, repeat: Infinity }
  },
  float: {
    animate: { y: [0, -5, 0] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
  }
};

export function AnimatedEmoji({ 
  emoji, 
  animation, 
  size = 'md', 
  className = '', 
  onClick 
}: AnimatedEmojiProps) {
  const animationProps = animation ? animations[animation] : {};
  
  return (
    <motion.span
      className={`inline-block cursor-pointer select-none ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      {...animationProps}
    >
      {emoji}
    </motion.span>
  );
}

// Status indicator with emoji
interface EmojiStatusProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'loading';
  message?: string;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EmojiStatus({ status, message, animate = true, size = 'md' }: EmojiStatusProps) {
  const statusConfig = {
    success: { emoji: TradingEmojis.success, color: 'text-green-500' },
    error: { emoji: TradingEmojis.error, color: 'text-red-500' },
    warning: { emoji: TradingEmojis.warning, color: 'text-yellow-500' },
    info: { emoji: TradingEmojis.info, color: 'text-blue-500' },
    loading: { emoji: TradingEmojis.loading, color: 'text-gray-500' },
  };

  const config = statusConfig[status];
  
  return (
    <div className={`flex items-center space-x-2 ${config.color}`}>
      <AnimatedEmoji 
        emoji={config.emoji} 
        animation={animate ? (status === 'loading' ? 'spin' : 'pulse') : undefined}
        size={size}
      />
      {message && <span className="text-sm font-medium">{message}</span>}
    </div>
  );
}

// Trading signal with emoji
interface TradingSignalEmojiProps {
  signal: 'buy' | 'sell' | 'hold';
  strength?: number; // 0-100
  animate?: boolean;
}

export function TradingSignalEmoji({ signal, strength = 50, animate = true }: TradingSignalEmojiProps) {
  const signalConfig = {
    buy: { emoji: TradingEmojis.buy, color: 'text-green-500' },
    sell: { emoji: TradingEmojis.sell, color: 'text-red-500' },
    hold: { emoji: TradingEmojis.hold, color: 'text-yellow-500' },
  };

  const config = signalConfig[signal];
  const intensity = strength > 75 ? 'xl' : strength > 50 ? 'lg' : 'md';
  
  return (
    <div className={`flex items-center space-x-2 ${config.color}`}>
      <AnimatedEmoji 
        emoji={config.emoji} 
        animation={animate ? (strength > 75 ? 'glow' : 'pulse') : undefined}
        size={intensity as 'sm' | 'md' | 'lg' | 'xl'}
      />
      <span className="text-sm font-medium capitalize">{signal}</span>
      {strength > 75 && (
        <AnimatedEmoji 
          emoji={TradingEmojis.fire} 
          animation="bounce"
          size="sm"
        />
      )}
    </div>
  );
}

// Profit/Loss indicator with emoji
interface PnLEmojiProps {
  value: number;
  percentage?: number;
  animate?: boolean;
}

export function PnLEmoji({ value, percentage, animate = true }: PnLEmojiProps) {
  const isProfit = value > 0;
  const isSignificant = Math.abs(percentage || 0) > 5;
  
  const emoji = isProfit 
    ? (isSignificant ? TradingEmojis.rocket : TradingEmojis.profit)
    : (isSignificant ? TradingEmojis.loss : TradingEmojis.bearish);
    
  const color = isProfit ? 'text-green-500' : 'text-red-500';
  const animation = isSignificant ? (isProfit ? 'bounce' : 'shake') : 'pulse';
  
  return (
    <div className={`flex items-center space-x-1 ${color}`}>
      <AnimatedEmoji 
        emoji={emoji} 
        animation={animate ? animation : undefined}
        size={isSignificant ? 'lg' : 'md'}
      />
      <span className="font-mono font-bold">
        {isProfit ? '+' : ''}${value.toFixed(2)}
      </span>
      {percentage !== undefined && (
        <span className="text-sm">
          ({isProfit ? '+' : ''}{percentage.toFixed(1)}%)
        </span>
      )}
    </div>
  );
}

// Emoji picker component
interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  category?: keyof typeof EmojiCategories;
  className?: string;
}

export function EmojiPicker({ onSelect, category, className = '' }: EmojiPickerProps) {
  const emojis = category ? EmojiCategories[category] : Object.values(TradingEmojis);
  
  return (
    <div className={`grid grid-cols-6 gap-2 p-4 bg-card rounded-lg border ${className}`}>
      <AnimatePresence>
        {emojis.map((emoji, index) => (
          <motion.button
            key={`${emoji}-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect(emoji)}
            className="p-2 text-xl hover:bg-muted rounded-md transition-colors"
          >
            {emoji}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Contextual emoji helper
export function getContextualEmoji(context: string, value?: number): string {
  switch (context) {
    case 'profit':
      return value && value > 1000 ? TradingEmojis.rocket : TradingEmojis.profit;
    case 'loss':
      return value && value < -1000 ? TradingEmojis.explosion : TradingEmojis.loss;
    case 'bullish':
      return TradingEmojis.bullish;
    case 'bearish':
      return TradingEmojis.bearish;
    case 'loading':
      return TradingEmojis.loading;
    case 'success':
      return TradingEmojis.success;
    case 'error':
      return TradingEmojis.error;
    case 'warning':
      return TradingEmojis.warning;
    case 'celebration':
      return TradingEmojis.celebration;
    case 'fire':
      return TradingEmojis.fire;
    case 'rocket':
      return TradingEmojis.rocket;
    default:
      return TradingEmojis.info;
  }
}

// Export emoji collections for easy access
export { TradingEmojis as Emojis };
export default TradingEmojis;