import React, { useState, useEffect } from 'react';
import type { RequestRecord, AnimatedDot } from '../types';
import { ColorAllocator } from '../utils/colorAllocation';

interface FlowChartProps {
  requestHistory: RequestRecord[];
  isAnimating: boolean;
  activeDots: AnimatedDot[];
  stickinessEnabled: boolean;
  colorAllocator: ColorAllocator;
  uniqueOrigins: string[]; // Persistent unique origins array from parent
  label?: string; // Optional label for comparison mode
  comparisonMode?: boolean; // Whether this is being used in comparison mode
}

interface NodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  className?: string;
}

const Node: React.FC<NodeProps> = ({ x, y, width, height, label, className = '' }) => (
  <g className={`node ${className}`}>
    <rect
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      className="node-rect"
    />
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      className="node-text"
    >
      {label}
    </text>
  </g>
);

interface OriginNodeProps {
  x: number;
  y: number;
  originId: string;
  color: string;
  hitCount: number;
}

const OriginNode: React.FC<OriginNodeProps> = ({ x, y, originId, color, hitCount }) => {
  const isMissingHeader = originId === 'missing origin header';
  
  return (
    <g className="origin-node">
      <rect
        x={x - 50}
        y={y - 30}
        width={100}
        height={60}
        fill={color}
        className={`origin-rect ${isMissingHeader ? 'missing-header' : ''}`}
        stroke={isMissingHeader ? '#C0392B' : 'none'}
        strokeWidth={isMissingHeader ? 2 : 0}
        strokeDasharray={isMissingHeader ? '4,2' : 'none'}
      />
      
      {/* Origin ID text */}
      <text
        x={x}
        y={isMissingHeader ? y - 10 : y - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="origin-text"
        fill="white"
        fontSize={isMissingHeader ? '9' : '11'}
      >
        {isMissingHeader ? 'Missing' : `Origin ${originId}`}
      </text>
      
      {/* Second line for missing header */}
      {isMissingHeader && (
        <text
          x={x}
          y={y + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="origin-text"
          fill="white"
          fontSize="9"
        >
          Header
        </text>
      )}
      
      {/* Hit counter */}
      <text
        x={x}
        y={isMissingHeader ? y + 15 : y + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        className="origin-text"
        fill="white"
        fontSize="10"
        fontWeight="bold"
      >
        Hits: {hitCount}
      </text>
      
      {/* Warning icon for missing header */}
      {isMissingHeader && (
        <text
          x={x + 35}
          y={y - 20}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#C0392B"
          fontSize="14"
        >
          ⚠
        </text>
      )}
    </g>
  );
};

interface ConnectionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className?: string;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ x1, y1, x2, y2, className = '' }) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    className={`connection-line ${className}`}
    markerEnd="url(#arrowhead)"
  />
);

interface AnimatedDotComponentProps {
  dot: AnimatedDot;
}

const AnimatedDotComponent: React.FC<AnimatedDotComponentProps> = ({ dot }) => (
  <circle
    cx={dot.position.x}
    cy={dot.position.y}
    r={6}
    fill={dot.color}
    className="animated-dot"
  />
);

export const FlowChart: React.FC<FlowChartProps> = ({
  requestHistory,
  isAnimating,
  activeDots,
  stickinessEnabled,
  colorAllocator,
  uniqueOrigins, // Use persistent unique origins from parent
  label,
  comparisonMode = false,
}) => {
  // Track which origins have been discovered (ever had a dot heading to them)
  const [discoveredOrigins, setDiscoveredOrigins] = useState<Set<string>>(new Set());
  
  // Track hit counts for each origin
  const [hitCounts, setHitCounts] = useState<Record<string, number>>({});

  // Reset discovered origins and hit counts when uniqueOrigins is cleared (demo reset)
  useEffect(() => {
    if (uniqueOrigins.length === 0) {
      setDiscoveredOrigins(new Set());
      setHitCounts({});
    }
  }, [uniqueOrigins]);

  // Update discovered origins when dots are heading to new origins
  useEffect(() => {
    const currentlyTargetedOrigins = activeDots
      .filter(dot => (dot.phase === 'heading-to-origin' || dot.phase === 'at-origin') && dot.originId)
      .map(dot => dot.originId!);
    
    if (currentlyTargetedOrigins.length > 0) {
      setDiscoveredOrigins(prev => {
        const newSet = new Set(prev);
        currentlyTargetedOrigins.forEach(originId => newSet.add(originId));
        return newSet;
      });
    }
  }, [activeDots]);

  // Track hits when dots reach origins (phase becomes 'at-origin')
  useEffect(() => {
    const dotsAtOrigin = activeDots.filter(dot => dot.phase === 'at-origin' && dot.originId);
    
    dotsAtOrigin.forEach(dot => {
      const originId = dot.originId!;
      
      // Use dot ID to ensure we only count each dot once
      setHitCounts(prev => {
        // Check if this dot has already been counted by storing dot IDs
        const countKey = `${originId}_${dot.id}`;
        if (prev[countKey] !== undefined) {
          return prev; // Already counted this dot
        }
        
        // Increment the hit count for this origin and mark this dot as counted
        return {
          ...prev,
          [originId]: (prev[originId] || 0) + 1,
          [countKey]: 1 // Mark this specific dot as counted
        };
      });
    });
  }, [activeDots]);

  // Calculate origin positions
  // Origins positioning - First origin aligned with CloudFront, others below
  const originStartY = 250; // Same Y as CloudFront for first origin
  const originSpacing = 80; // Vertical spacing between origins
  const originX = 550; // Even spacing: 150→350→550 (200px intervals)

  // Node positions - Even horizontal spacing (200px intervals)
  const clientPos = { x: 150, y: 250 }; // Starting position
  const cloudfrontPos = { x: 350, y: 250 }; // 200px from client (150→350)
  const route53Pos = { x: 350, y: 120 }; // Above CloudFront
  const functionPos = { x: 350, y: 120 }; // Above CloudFront

  return (
    <div className="flow-chart">
      <svg width="750" height="600" className="flow-chart-svg">
        {/* Arrow marker definitions */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0,0 0,6 8,3"
              fill="#7f8c8d"
              stroke="none"
            />
          </marker>
        </defs>
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#7f8c8d"
            />
          </marker>
        </defs>

        {/* Static nodes */}
        <Node 
          x={clientPos.x} 
          y={clientPos.y} 
          width={100} 
          height={60} 
          label="Client" 
          className="client-node" 
        />
        <Node 
          x={cloudfrontPos.x} 
          y={cloudfrontPos.y} 
          width={100} 
          height={60} 
          label="CloudFront" 
          className="cloudfront-node" 
        />
        
        {/* Conditional resolver nodes */}
        {!stickinessEnabled && (
          <Node 
            x={route53Pos.x} 
            y={route53Pos.y} 
            width={100} 
            height={60} 
            label="Route53" 
            className="route53-node" 
          />
        )}
        {stickinessEnabled && (
          <g>
            <Node 
              x={functionPos.x} 
              y={functionPos.y} 
              width={100} 
              height={60} 
              label="" 
              className="function-node" 
            />
            {/* Custom two-line text for CloudFront Function */}
            <text
              x={functionPos.x}
              y={functionPos.y - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              className="node-text"
            >
              CloudFront
            </text>
            <text
              x={functionPos.x}
              y={functionPos.y + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              className="node-text"
            >
              Function
            </text>
          </g>
        )}

        {/* Connection lines - Clean vertical flow */}
        {/* LEG 1: Client → CloudFront */}
        <ConnectionLine 
          x1={clientPos.x + 50} 
          y1={clientPos.y} 
          x2={cloudfrontPos.x - 50} 
          y2={cloudfrontPos.y} 
        />
        
        {/* LEG 2: CloudFront → Route53/Function (vertical up) */}
        <ConnectionLine 
          x1={cloudfrontPos.x} 
          y1={cloudfrontPos.y - 30} 
          x2={stickinessEnabled ? functionPos.x : route53Pos.x} 
          y2={stickinessEnabled ? functionPos.y + 30 : route53Pos.y + 30} 
        />
        
        {/* LEG 3: Route53/Function → CloudFront (vertical down) */}
        <ConnectionLine 
          x1={stickinessEnabled ? functionPos.x : route53Pos.x} 
          y1={stickinessEnabled ? functionPos.y + 30 : route53Pos.y + 30} 
          x2={cloudfrontPos.x} 
          y2={cloudfrontPos.y - 30} 
        />

        {/* Origin nodes and connections - Show discovered origins permanently */}
        {uniqueOrigins.map((originId, index) => {
          // Balanced origin positioning: center, above, below, above, below...
          let y;
          if (index === 0) {
            y = 250; // First origin aligned with CloudFront
          } else if (index % 2 === 1) {
            // Odd indices (1, 3, 5...) go above: 170, 90, 10...
            const aboveLevel = Math.ceil(index / 2);
            y = 250 - (aboveLevel * 80);
          } else {
            // Even indices (2, 4, 6...) go below: 330, 410, 490...
            const belowLevel = index / 2;
            y = 250 + (belowLevel * 80);
          }
          
          const color = colorAllocator.getColor(originId) || '#9E9E9E';
          const hitCount = hitCounts[originId] || 0;
          
          // Check if this origin has ever been discovered (targeted by a dot)
          const hasBeenDiscovered = discoveredOrigins.has(originId);
          
          // Only render origin box and connection line if it has been discovered
          if (!hasBeenDiscovered) return null;
          
          return (
            <g key={originId}>
              <OriginNode 
                x={originX} 
                y={y} 
                originId={originId} 
                color={color} 
                hitCount={hitCount}
              />
              {/* Connection line from CloudFront to Origin */}
              <ConnectionLine 
                x1={cloudfrontPos.x + 50} 
                y1={cloudfrontPos.y} 
                x2={originX - 50} 
                y2={y} 
              />
            </g>
          );
        })}

        {/* Show message when no origins discovered yet */}
        {uniqueOrigins.length === 0 && (
          <g className="no-origins-message" transform="translate(470, 250)">
            <text x={0} y={0} textAnchor="middle" className="node-text" fill="#7f8c8d">
              Origins will appear
            </text>
            <text x={0} y={15} textAnchor="middle" className="node-text" fill="#7f8c8d">
              as requests are made
            </text>
          </g>
        )}

        {/* Animated dots */}
        {isAnimating && activeDots.map(dot => (
          <AnimatedDotComponent key={dot.id} dot={dot} />
        ))}

        {/* Flow description */}
        <g className="flow-description" transform="translate(50, 50)">
          <text x={0} y={0} className="flow-title">
            Request Flow: {stickinessEnabled ? 'Sticky Mode' : 'DNS Resolution Mode'}
          </text>
          <text x={0} y={20} className="flow-subtitle">
            {stickinessEnabled 
              ? 'Requests include x-origin-id header → CloudFront Function selects origin'
              : 'CloudFront uses Route53 DNS resolution to select origin'
            }
          </text>
        </g>

        {/* Legend */}
        <g className="legend" transform="translate(50, 400)">
          <text x={0} y={0} className="legend-title">Legend:</text>
          <circle cx={10} cy={20} r={4} fill="#9E9E9E" />
          <text x={20} y={25} className="legend-text">Request (unknown origin)</text>
          {uniqueOrigins.slice(0, 3).map((originId, index) => {
            const color = colorAllocator.getColor(originId) || '#9E9E9E';
            const hitCount = hitCounts[originId] || 0;
            return (
              <g key={originId}>
                <circle cx={10} cy={40 + index * 20} r={4} fill={color} />
                <text x={20} y={45 + index * 20} className="legend-text">
                  Origin {originId} ({hitCount} hits)
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
