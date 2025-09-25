import React from 'react';
import { FlowChart } from './FlowChart';
import { RequestHistory } from './RequestHistory';
import type { ModeData } from '../hooks/useModeManager';
import type { AnimationEngine } from '../types';
import type { ColorAllocator } from '../utils/colorAllocation';

interface ComparisonLayoutProps {
  stickyModeData: ModeData;
  nonStickyModeData: ModeData;
  isAnimating: boolean;
  stickyAnimationEngine: AnimationEngine;
  nonStickyAnimationEngine: AnimationEngine;
  stickyColorAllocator: ColorAllocator;
  nonStickyColorAllocator: ColorAllocator;
}

export const ComparisonLayout: React.FC<ComparisonLayoutProps> = ({
  stickyModeData,
  nonStickyModeData,
  isAnimating,
  stickyAnimationEngine,
  nonStickyAnimationEngine,
  stickyColorAllocator,
  nonStickyColorAllocator,
}) => {
  return (
    <div className="comparison-layout">
      <div className="comparison-modes">
        {/* Sticky Mode */}
        <div className="mode-section sticky-mode">
          <div className="mode-header">
            <h3>Sticky Mode</h3>
            <p>Uses CloudFront Function with x-origin-id header</p>
          </div>
          <div className="mode-content">
            <FlowChart
              requestHistory={stickyModeData.requestHistory}
              isAnimating={isAnimating}
              activeDots={stickyAnimationEngine.activeDots}
              stickinessEnabled={true}
              colorAllocator={stickyColorAllocator}
              uniqueOrigins={stickyModeData.uniqueOrigins}
              label="Sticky Mode"
              comparisonMode={true}
            />
            <RequestHistory
              requestHistory={stickyModeData.requestHistory}
              colorAllocator={stickyColorAllocator}
              label="Sticky Mode History"
            />
          </div>
        </div>

        {/* Non-Sticky Mode */}
        <div className="mode-section non-sticky-mode">
          <div className="mode-header">
            <h3>Non-Sticky Mode</h3>
            <p>Uses Route53 DNS resolution</p>
          </div>
          <div className="mode-content">
            <FlowChart
              requestHistory={nonStickyModeData.requestHistory}
              isAnimating={isAnimating}
              activeDots={nonStickyAnimationEngine.activeDots}
              stickinessEnabled={false}
              colorAllocator={nonStickyColorAllocator}
              uniqueOrigins={nonStickyModeData.uniqueOrigins}
              label="Non-Sticky Mode"
              comparisonMode={true}
            />
            <RequestHistory
              requestHistory={nonStickyModeData.requestHistory}
              colorAllocator={nonStickyColorAllocator}
              label="Non-Sticky Mode History"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
