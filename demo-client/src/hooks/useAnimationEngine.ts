import { useState, useRef, useCallback } from 'react';
import type { AnimatedDot } from '../types';
import type { ColorAllocator } from '../utils/ColorAllocator';

// Node definitions matching FlowChart exactly - Even horizontal spacing, first origin aligned with CloudFront
const NODES = {
  client: { x: 150, y: 250, width: 100, height: 60 }, // Starting position
  cloudfront: { x: 350, y: 250, width: 100, height: 60 }, // 200px from client
  route53: { x: 350, y: 120, width: 100, height: 60 }, // Above CloudFront
  function: { x: 350, y: 120, width: 100, height: 60 }, // Above CloudFront
  origin: { x: 550, startY: 250, spacing: 80, width: 100, height: 60 } // First origin aligned with CloudFront
};

// Helper function to get origin position (left edge)
const getOriginPosition = (originId: string, uniqueOrigins: string[]) => {
  const originIndex = uniqueOrigins.indexOf(originId);
  const index = originIndex === -1 ? uniqueOrigins.length : originIndex;
  
  // Balanced origin positioning: center, above, below, above, below...
  let originY;
  if (index === 0) {
    originY = 250; // First origin aligned with CloudFront
  } else if (index % 2 === 1) {
    // Odd indices (1, 3, 5...) go above: 170, 90, 10...
    const aboveLevel = Math.ceil(index / 2);
    originY = 250 - (aboveLevel * 80);
  } else {
    // Even indices (2, 4, 6...) go below: 330, 410, 490...
    const belowLevel = index / 2;
    originY = 250 + (belowLevel * 80);
  }
  
  // Return left edge of origin box
  return {
    x: NODES.origin.x - (NODES.origin.width / 2), // Left edge = center - half width
    y: originY
  };
};

export const useAnimationEngine = (
  stickinessEnabled: boolean,
  colorAllocator: ColorAllocator,
  uniqueOrigins: string[] = []
) => {
  const [activeDots, setActiveDots] = useState<AnimatedDot[]>([]);
  const dotIdCounter = useRef(0);

  const triggerAnimation = useCallback((originId: string) => {
    // Create a single dot per HTTP response - this represents one actual request/response
    const dotId = `dot-${++dotIdCounter.current}`;
    const originColor = colorAllocator.allocateColor(originId);
    const originPosition = getOriginPosition(originId, uniqueOrigins);

    // Calculate connection points with standardized 100x60 dimensions
    // Client: x=150, width=100 → right edge = 150 + 50
    const clientRight = { x: 150 + 50, y: 250 }; // (200, 250)
    
    // CloudFront: x=350, width=100 → left edge = 350 - 50, right edge = 350 + 50
    const cloudfrontLeft = { x: 350 - 50, y: 250 }; // (300, 250)
    const cloudfrontCenter = { x: 350, y: 250 }; // (350, 250)
    const cloudfrontRight = { x: 350 + 50 + 6, y: 250 }; // (406, 250) - add dot radius for visual alignment
    
    // Resolver positions (aligned above CloudFront)
    const resolverNode = stickinessEnabled ? NODES.function : NODES.route53;
    const resolverBottom = { x: resolverNode.x, y: resolverNode.y + 30 }; // Bottom of resolver

    // Phase 1: Start at client right edge - this represents the actual HTTP request
    const initialDot: AnimatedDot = {
      id: dotId,
      position: clientRight,
      color: '#9E9E9E', // Gray until origin is determined
      phase: 'client-to-cloudfront',
      stickinessEnabled,
      originId // This dot represents the actual response with this originId
    };

    setActiveDots(prev => [...prev, initialDot]);

    // LEG 1: Client → CloudFront left edge (400ms) - Request reaches CloudFront
    setTimeout(() => {
      setActiveDots(prev => prev.map(dot => 
        dot.id === dotId 
          ? { ...dot, position: cloudfrontLeft, phase: 'cloudfront-to-resolver' }
          : dot
      ));
    }, 400);

    // LEG 2A: CloudFront left → Route53/Function horizontal position (700ms)
    setTimeout(() => {
      setActiveDots(prev => prev.map(dot => {
        if (dot.id === dotId) {
          const currentResolverNode = stickinessEnabled ? NODES.function : NODES.route53;
          const resolverBottomHorizontal = { x: currentResolverNode.x, y: NODES.cloudfront.y };
          
          return { 
            ...dot, 
            position: resolverBottomHorizontal, 
            phase: 'cloudfront-to-resolver' 
          };
        }
        return dot;
      }));
    }, 700);

    // LEG 2B: Move to resolver (1000ms) - Origin resolution happens here
    setTimeout(() => {
      setActiveDots(prev => prev.map(dot => {
        if (dot.id === dotId) {
          const currentResolverNode = stickinessEnabled ? NODES.function : NODES.route53;
          const currentResolverBottom = { x: currentResolverNode.x, y: currentResolverNode.y + 30 };
          
          return { 
            ...dot, 
            position: currentResolverBottom,
            phase: 'resolver-to-cloudfront'
          };
        }
        return dot;
      }));
    }, 1000);

    // LEG 3: Return from resolver with origin decision (1300ms) - Color changes to show origin
    setTimeout(() => {
      setActiveDots(prev => prev.map(dot => {
        if (dot.id === dotId) {
          const currentResolverNode = stickinessEnabled ? NODES.function : NODES.route53;
          const resolverBottomHorizontal = { x: currentResolverNode.x, y: NODES.cloudfront.y };
          
          return { 
            ...dot, 
            position: resolverBottomHorizontal,
            color: originColor, // Origin decision made - color changes!
            phase: 'cloudfront-to-origin'
          };
        }
        return dot;
      }));
    }, 1300);

    // LEG 4A: Return to CloudFront center (1600ms)
    setTimeout(() => {
      setActiveDots(prev => prev.map(dot => 
        dot.id === dotId 
          ? { ...dot, position: cloudfrontCenter, phase: 'cloudfront-to-origin' }
          : dot
      ));
    }, 1600);

    // LEG 4B: CloudFront center → CloudFront right (1900ms)
    setTimeout(() => {
      setActiveDots(prev => prev.map(dot => 
        dot.id === dotId 
          ? { ...dot, position: cloudfrontRight, phase: 'heading-to-origin' }
          : dot
      ));
    }, 1900);

    // LEG 5: CloudFront right → Origin (2300ms) - Request reaches the actual origin
    setTimeout(() => {
      setActiveDots(prev => prev.map(dot => 
        dot.id === dotId 
          ? { 
              ...dot, 
              position: originPosition,
              phase: 'at-origin'
            }
          : dot
      ));
    }, 2300);

    // Clean up (3000ms) - Remove dot after animation completes
    setTimeout(() => {
      setActiveDots(prev => prev.filter(dot => 
        dot.id !== dotId
      ));
    }, 3000);
  }, [stickinessEnabled, colorAllocator, uniqueOrigins]);

  return {
    activeDots,
    triggerAnimation
  };
};
