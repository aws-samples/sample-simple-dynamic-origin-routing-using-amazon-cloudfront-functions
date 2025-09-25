import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { RequestRecord } from '../types';
import { ColorAllocator } from '../utils/colorAllocation';
import { useModeManager } from '../hooks/useModeManager';
import { useDualHttpClient } from '../hooks/useDualHttpClient';
import { useHttpClient } from '../hooks/useHttpClient';
import { useAnimationEngine } from '../hooks/useAnimationEngine';
import { useIndependentAnimation } from '../hooks/useIndependentAnimation';
import { UnifiedControlPanel } from './UnifiedControlPanel';
import { FlowChart } from './FlowChart';
import { RequestHistory } from './RequestHistory';
import { ComparisonLayout } from './ComparisonLayout';

const MAX_HISTORY_SIZE = 20;

export const DemoPageWithComparison: React.FC = () => {
  // Core state
  const [isRunning, setIsRunning] = useState(false);
  const [stickinessEnabled, setStickinessEnabled] = useState(false);
  const [mockModeEnabled, setMockModeEnabled] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [requestInterval, setRequestInterval] = useState(1000); // Default 1 second
  
  // Mode management
  const modeManager = useModeManager();
  
  // Color allocators - separate for each mode
  const singleModeColorAllocator = useRef(new ColorAllocator()).current;
  const stickyColorAllocator = useRef(new ColorAllocator()).current;
  const nonStickyColorAllocator = useRef(new ColorAllocator()).current;
  
  const sequenceCounter = useRef(0);
  const stickySequenceCounter = useRef(0);
  const nonStickySequenceCounter = useRef(0);

  // Helper function to add new origin to unique origins array
  const addUniqueOrigin = useCallback((originId: string, modeType: 'single' | 'sticky' | 'nonSticky') => {
    if (originId && originId !== 'error' && originId !== 'unknown') {
      const updater = (prev: any) => ({
        ...prev,
        uniqueOrigins: prev.uniqueOrigins.includes(originId) 
          ? prev.uniqueOrigins 
          : [...prev.uniqueOrigins, originId]
      });

      if (modeType === 'single') {
        modeManager.updateSingleModeData(updater);
      } else if (modeType === 'sticky') {
        modeManager.updateStickyModeData(updater);
      } else if (modeType === 'nonSticky') {
        modeManager.updateNonStickyModeData(updater);
      }
    }
  }, [modeManager]);

  // HTTP clients
  const singleModeClient = useHttpClient({
    stickinessEnabled,
    currentOriginId: modeManager.singleModeData.currentOriginId,
    mockModeEnabled,
    customUrl,
  });

  const dualClient = useDualHttpClient({
    stickyOriginId: modeManager.stickyModeData.currentOriginId,
    nonStickyOriginId: modeManager.nonStickyModeData.currentOriginId,
    mockModeEnabled,
    customUrl,
  });

  // Animation engines
  const singleModeAnimationEngine = useAnimationEngine(
    stickinessEnabled, 
    singleModeColorAllocator, 
    modeManager.singleModeData.uniqueOrigins
  );

  const independentAnimation = useIndependentAnimation(
    stickyColorAllocator,
    nonStickyColorAllocator,
    modeManager.stickyModeData.uniqueOrigins,
    modeManager.nonStickyModeData.uniqueOrigins
  );

  // Single mode request handling
  const handleSingleModeRequest = useCallback(async () => {
    try {
      const result = await singleModeClient.makeRequest();
      
      const newRecord: RequestRecord = {
        id: `req-${Date.now()}-${Math.random()}`,
        timestamp: result.timestamp,
        originId: result.originId,
        status: result.status,
        error: result.error,
        sequenceNumber: ++sequenceCounter.current,
        stickyHeaderSent: result.stickyHeaderSent,
      };

      // Add new origin to unique origins array
      addUniqueOrigin(result.originId, 'single');

      // Update request history
      modeManager.updateSingleModeData(prev => ({
        ...prev,
        requestHistory: [...prev.requestHistory, newRecord].slice(-MAX_HISTORY_SIZE),
        lastRequestTime: Date.now(),
      }));

      // Trigger animation
      setTimeout(() => {
        singleModeAnimationEngine.triggerAnimation(result.originId);
      }, 0);

      // Update current origin ID for stickiness
      if (result.originId && 
          result.originId !== 'error' && 
          result.originId !== 'unknown' && 
          result.originId !== 'missing origin header') {
        modeManager.updateSingleModeData(prev => ({
          ...prev,
          currentOriginId: result.originId,
        }));
      }
      
    } catch (error) {
      console.error('Single mode request failed:', error);
    }
  }, [singleModeClient, singleModeAnimationEngine, addUniqueOrigin, modeManager]);

  // Comparison mode request handling
  const handleComparisonModeRequest = useCallback(async () => {
    try {
      const { stickyResult, nonStickyResult } = await dualClient.makeParallelRequests();
      
      const stickyRecord: RequestRecord = {
        id: `sticky-req-${Date.now()}-${Math.random()}`,
        timestamp: stickyResult.timestamp,
        originId: stickyResult.originId,
        status: stickyResult.status,
        error: stickyResult.error,
        sequenceNumber: ++stickySequenceCounter.current,
        stickyHeaderSent: stickyResult.stickyHeaderSent,
      };

      const nonStickyRecord: RequestRecord = {
        id: `nonsticky-req-${Date.now()}-${Math.random()}`,
        timestamp: nonStickyResult.timestamp,
        originId: nonStickyResult.originId,
        status: nonStickyResult.status,
        error: nonStickyResult.error,
        sequenceNumber: ++nonStickySequenceCounter.current,
        stickyHeaderSent: nonStickyResult.stickyHeaderSent,
      };

      // Add new origins to unique origins arrays
      addUniqueOrigin(stickyResult.originId, 'sticky');
      addUniqueOrigin(nonStickyResult.originId, 'nonSticky');

      // Update sticky mode data
      modeManager.updateStickyModeData(prev => ({
        ...prev,
        requestHistory: [...prev.requestHistory, stickyRecord].slice(-MAX_HISTORY_SIZE),
        lastRequestTime: Date.now(),
        currentOriginId: (stickyResult.originId && 
                         stickyResult.originId !== 'error' && 
                         stickyResult.originId !== 'unknown' && 
                         stickyResult.originId !== 'missing origin header') 
                         ? stickyResult.originId 
                         : prev.currentOriginId,
      }));

      // Update non-sticky mode data
      modeManager.updateNonStickyModeData(prev => ({
        ...prev,
        requestHistory: [...prev.requestHistory, nonStickyRecord].slice(-MAX_HISTORY_SIZE),
        lastRequestTime: Date.now(),
      }));

      // Trigger animations
      setTimeout(() => {
        independentAnimation.triggerStickyAnimation(stickyResult.originId);
        independentAnimation.triggerNonStickyAnimation(nonStickyResult.originId);
      }, 0);
      
    } catch (error) {
      console.error('Comparison mode request failed:', error);
    }
  }, [dualClient, independentAnimation, addUniqueOrigin, modeManager]);

  // Unified request handler
  const handleRequest = useCallback(async () => {
    if (modeManager.comparisonModeEnabled) {
      await handleComparisonModeRequest();
    } else {
      await handleSingleModeRequest();
    }
  }, [modeManager.comparisonModeEnabled, handleComparisonModeRequest, handleSingleModeRequest]);

  // Use ref to store current request handler to avoid stale closures
  const handleRequestRef = useRef(handleRequest);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update ref whenever handleRequest changes
  useEffect(() => {
    handleRequestRef.current = handleRequest;
  }, [handleRequest]);

  // Effect to handle interval changes while running
  useEffect(() => {
    if (isRunning && intervalRef.current) {
      // Clear existing interval
      clearInterval(intervalRef.current);
      
      // Set up new interval with updated requestInterval
      intervalRef.current = setInterval(() => {
        handleRequestRef.current();
      }, requestInterval);
    }
  }, [requestInterval, isRunning]);

  // Control handlers
  const handleStart = useCallback(() => {
    setIsRunning(true);
    
    // Make first request immediately
    handleRequestRef.current();
    
    // Set up interval for subsequent requests using the current requestInterval
    intervalRef.current = setInterval(() => {
      handleRequestRef.current();
    }, requestInterval);
  }, [requestInterval]);

  const handleStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const handleToggleStickiness = useCallback(() => {
    setStickinessEnabled(prev => !prev);
  }, []);

  const handleToggleMockMode = useCallback(() => {
    setMockModeEnabled(prev => !prev);
  }, []);

  const handleCustomUrlChange = useCallback((url: string) => {
    setCustomUrl(url);
  }, []);

  const handleRequestIntervalChange = useCallback((interval: number) => {
    setRequestInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className="demo-page">
      <header className="demo-header">
        <h1>CloudFront Origin Stickiness Demo</h1>
        <p>
          This demo shows how CloudFront functions route requests to different origins 
          based on stickiness headers. Toggle between single mode and comparison mode to 
          observe different routing behaviors.
        </p>
      </header>

      <div className="demo-content">
        <div className="demo-controls">
          <UnifiedControlPanel
            isRunning={isRunning}
            comparisonModeEnabled={modeManager.comparisonModeEnabled}
            mockModeEnabled={mockModeEnabled}
            customUrl={customUrl}
            requestInterval={requestInterval}
            onStart={handleStart}
            onStop={handleStop}
            onToggleComparison={modeManager.toggleComparisonMode}
            onToggleMockMode={handleToggleMockMode}
            onCustomUrlChange={handleCustomUrlChange}
            onRequestIntervalChange={handleRequestIntervalChange}
            stickinessEnabled={stickinessEnabled}
            onToggleStickiness={handleToggleStickiness}
          />
        </div>

        <div className="demo-visuals">
          {modeManager.comparisonModeEnabled ? (
            <ComparisonLayout
              stickyModeData={modeManager.stickyModeData}
              nonStickyModeData={modeManager.nonStickyModeData}
              isAnimating={isRunning}
              stickyAnimationEngine={independentAnimation.stickyAnimationEngine}
              nonStickyAnimationEngine={independentAnimation.nonStickyAnimationEngine}
              stickyColorAllocator={stickyColorAllocator}
              nonStickyColorAllocator={nonStickyColorAllocator}
            />
          ) : (
            <div className="single-mode-layout">
              <FlowChart
                requestHistory={modeManager.singleModeData.requestHistory}
                isAnimating={isRunning}
                activeDots={singleModeAnimationEngine.activeDots}
                stickinessEnabled={stickinessEnabled}
                colorAllocator={singleModeColorAllocator}
                uniqueOrigins={modeManager.singleModeData.uniqueOrigins}
              />
              <RequestHistory
                requestHistory={modeManager.singleModeData.requestHistory}
                colorAllocator={singleModeColorAllocator}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
