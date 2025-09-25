import { useState, useCallback } from 'react';
import type { RequestRecord } from '../types';

export interface ModeData {
  currentOriginId: string | null;
  requestHistory: RequestRecord[];
  uniqueOrigins: string[];
  errorCount: number;
  lastRequestTime?: number;
}

export interface ModeManager {
  comparisonModeEnabled: boolean;
  toggleComparisonMode: () => void;
  stickyModeData: ModeData;
  nonStickyModeData: ModeData;
  singleModeData: ModeData;
  updateStickyModeData: (updater: (prev: ModeData) => ModeData) => void;
  updateNonStickyModeData: (updater: (prev: ModeData) => ModeData) => void;
  updateSingleModeData: (updater: (prev: ModeData) => ModeData) => void;
  getCurrentModeData: () => ModeData | { sticky: ModeData; nonSticky: ModeData };
}

const createInitialModeData = (): ModeData => ({
  currentOriginId: null,
  requestHistory: [],
  uniqueOrigins: [],
  errorCount: 0,
});

export const useModeManager = (): ModeManager => {
  const [comparisonModeEnabled, setComparisonModeEnabled] = useState(false);
  const [stickyModeData, setStickyModeData] = useState<ModeData>(() => createInitialModeData());
  const [nonStickyModeData, setNonStickyModeData] = useState<ModeData>(() => createInitialModeData());
  const [singleModeData, setSingleModeData] = useState<ModeData>(() => createInitialModeData());

  const toggleComparisonMode = useCallback(() => {
    setComparisonModeEnabled(prev => !prev);
  }, []);

  const updateStickyModeData = useCallback((updater: (prev: ModeData) => ModeData) => {
    setStickyModeData(updater);
  }, []);

  const updateNonStickyModeData = useCallback((updater: (prev: ModeData) => ModeData) => {
    setNonStickyModeData(updater);
  }, []);

  const updateSingleModeData = useCallback((updater: (prev: ModeData) => ModeData) => {
    setSingleModeData(updater);
  }, []);

  const getCurrentModeData = useCallback(() => {
    if (comparisonModeEnabled) {
      return {
        sticky: stickyModeData,
        nonSticky: nonStickyModeData,
      };
    }
    return singleModeData;
  }, [comparisonModeEnabled, stickyModeData, nonStickyModeData, singleModeData]);

  return {
    comparisonModeEnabled,
    toggleComparisonMode,
    stickyModeData,
    nonStickyModeData,
    singleModeData,
    updateStickyModeData,
    updateNonStickyModeData,
    updateSingleModeData,
    getCurrentModeData,
  };
};
