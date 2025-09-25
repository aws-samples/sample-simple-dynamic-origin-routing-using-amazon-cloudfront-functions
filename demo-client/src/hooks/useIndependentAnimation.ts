import { useCallback } from 'react';
import { useAnimationEngine } from './useAnimationEngine';
import type { ColorAllocator } from '../utils/colorAllocation';
import type { AnimationEngine } from '../types';

export interface IndependentAnimation {
  stickyAnimationEngine: AnimationEngine;
  nonStickyAnimationEngine: AnimationEngine;
  triggerStickyAnimation: (originId: string) => void;
  triggerNonStickyAnimation: (originId: string) => void;
}

export const useIndependentAnimation = (
  stickyColorAllocator: ColorAllocator,
  nonStickyColorAllocator: ColorAllocator,
  stickyUniqueOrigins: string[],
  nonStickyUniqueOrigins: string[]
): IndependentAnimation => {
  // Create separate animation engines for each mode
  const stickyAnimationEngine = useAnimationEngine(true, stickyColorAllocator, stickyUniqueOrigins);
  const nonStickyAnimationEngine = useAnimationEngine(false, nonStickyColorAllocator, nonStickyUniqueOrigins);

  const triggerStickyAnimation = useCallback((originId: string) => {
    stickyAnimationEngine.triggerAnimation(originId);
  }, [stickyAnimationEngine]);

  const triggerNonStickyAnimation = useCallback((originId: string) => {
    nonStickyAnimationEngine.triggerAnimation(originId);
  }, [nonStickyAnimationEngine]);

  return {
    stickyAnimationEngine,
    nonStickyAnimationEngine,
    triggerStickyAnimation,
    triggerNonStickyAnimation,
  };
};
