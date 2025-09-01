'use client';

import * as React from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SwipeGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export function SwipeGesture({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = '',
  disabled = false
}: SwipeGestureProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateY = useTransform(x, [-100, 100], [-5, 5]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;

    const { offset, velocity } = info;
    const swipeThreshold = threshold;
    const velocityThreshold = 500;

    // Determine swipe direction based on offset and velocity
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      // Horizontal swipe
      if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
        onSwipeRight?.();
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } else if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
        onSwipeLeft?.();
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    } else {
      // Vertical swipe
      if (offset.y > swipeThreshold || velocity.y > velocityThreshold) {
        onSwipeDown?.();
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } else if (offset.y < -swipeThreshold || velocity.y < -velocityThreshold) {
        onSwipeUp?.();
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    }
  };

  return (
    <motion.div
      className={cn('touch-pan-y', className)}
      drag={!disabled}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotateX, rotateY }}
      whileDrag={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

// Pull to refresh component
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className = ''
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const y = useMotionValue(0);

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    if (offset.y > 0) {
      setPullDistance(offset.y);
    }
  };

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    
    if (offset.y > threshold && !isRefreshing) {
      setIsRefreshing(true);
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const refreshProgress = Math.min(pullDistance / threshold, 1);
  const refreshOpacity = useTransform(y, [0, threshold], [0, 1]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Refresh indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-primary/10"
        style={{
          opacity: refreshOpacity,
          y: useTransform(y, [0, threshold], [-50, 0])
        }}
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: refreshProgress * 360 }}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
          className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
        />
        <span className="ml-2 text-sm font-medium text-primary">
          {isRefreshing ? 'Refreshing...' : pullDistance > threshold ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Swipeable card component
interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: React.ReactNode;
    color: string;
    label: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    color: string;
    label: string;
  };
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className = ''
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const leftActionOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const rightActionOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const { offset, velocity } = info;

    if (offset.x > 100 || velocity.x > 500) {
      onSwipeRight?.();
    } else if (offset.x < -100 || velocity.x < -500) {
      onSwipeLeft?.();
    }
  };

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Left action */}
      {leftAction && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-20"
          style={{ 
            opacity: leftActionOpacity,
            backgroundColor: leftAction.color 
          }}
        >
          <div className="text-white text-center">
            {leftAction.icon}
            <div className="text-xs mt-1">{leftAction.label}</div>
          </div>
        </motion.div>
      )}

      {/* Right action */}
      {rightAction && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-20"
          style={{ 
            opacity: rightActionOpacity,
            backgroundColor: rightAction.color 
          }}
        >
          <div className="text-white text-center">
            {rightAction.icon}
            <div className="text-xs mt-1">{rightAction.label}</div>
          </div>
        </motion.div>
      )}

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          'bg-card border rounded-lg transition-shadow',
          isDragging ? 'shadow-lg' : 'shadow-sm'
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}