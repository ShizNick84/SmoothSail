'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'dots' | 'pulse' | 'bars' | 'trading' | 'orbit' | 'wave';
  message?: string;
  showEmoji?: boolean;
  color?: 'primary' | 'secondary' | 'muted';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colorClasses = {
  primary: 'text-primary border-primary',
  secondary: 'text-secondary border-secondary',
  muted: 'text-muted-foreground border-muted-foreground',
};

export function LoadingSpinner({ 
  size = 'md', 
  className = '', 
  variant = 'default',
  message,
  showEmoji = false,
  color = 'primary'
}: LoadingSpinnerProps) {
  if (variant === 'trading') {
    return (
      <div className={cn('flex flex-col items-center space-y-3', className)}>
        <div className="relative">
          <motion.div
            className={cn('border-2 border-primary/20 rounded-full', sizeClasses[size])}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className={cn('absolute inset-0 border-2 border-transparent border-t-primary rounded-full', sizeClasses[size])}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedEmoji emoji={TradingEmojis.chart} size="sm" animation="pulse" />
          </div>
        </div>
        {message && (
          <motion.p
            className="text-sm text-muted-foreground text-center"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {message}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === 'orbit') {
    return (
      <div className={cn('relative', sizeClasses[size], className)}>
        <motion.div
          className="absolute inset-0 border border-primary/30 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 bg-primary rounded-full"
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: `${size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'} 0`,
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <div className={cn('flex items-end space-x-1', className)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="bg-primary rounded-sm"
            style={{
              width: size === 'sm' ? '2px' : size === 'md' ? '3px' : '4px',
              height: size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px',
            }}
            animate={{
              scaleY: [0.5, 2, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {showEmoji && <AnimatedEmoji emoji={TradingEmojis.loading} animation="spin" size="sm" />}
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn('bg-primary rounded-full', 
                size === 'sm' ? 'h-2 w-2' : 
                size === 'md' ? 'h-3 w-3' : 
                size === 'lg' ? 'h-4 w-4' : 'h-5 w-5'
              )}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        {message && (
          <span className="text-sm text-muted-foreground ml-2">{message}</span>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <motion.div
          className={cn('bg-primary rounded-full', sizeClasses[size])}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {message && (
          <motion.span
            className="text-sm text-muted-foreground"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {message}
          </motion.span>
        )}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <div className="flex space-x-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="bg-primary rounded-sm"
              style={{
                width: size === 'sm' ? '2px' : size === 'md' ? '3px' : '4px',
                height: size === 'sm' ? '16px' : size === 'md' ? '24px' : '32px',
              }}
              animate={{
                scaleY: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        {message && (
          <span className="text-sm text-muted-foreground">{message}</span>
        )}
      </div>
    );
  }

  // Default spinner
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <div className="relative">
        <motion.div
          className={cn(
            'border-2 border-primary/20 rounded-full',
            sizeClasses[size]
          )}
        />
        <motion.div
          className={cn(
            'absolute inset-0 border-2 border-transparent border-t-primary rounded-full',
            sizeClasses[size]
          )}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        {showEmoji && (
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedEmoji emoji={TradingEmojis.loading} size="sm" />
          </div>
        )}
      </div>
      {message && (
        <motion.span
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {message}
        </motion.span>
      )}
    </div>
  );
}