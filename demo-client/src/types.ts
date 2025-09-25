// Core data models for the demo application

export interface RequestRecord {
  id: string;
  timestamp: string;
  originId: string;
  status: number;
  error?: string;
  sequenceNumber: number;
  stickyHeaderSent?: string; // The x-origin-id header value that was sent
}

export interface OriginInfo {
  id: string;
  color: string;
  position: { x: number; y: number };
}

export interface AnimatedDot {
  id: string;
  position: { x: number; y: number };
  color: string;
  phase: 'client-to-cloudfront' | 'cloudfront-to-resolver' | 'resolver-to-origin' | 'at-origin';
  stickinessEnabled: boolean;
  originId?: string;
}

export interface AnimationState {
  activeDots: AnimatedDot[];
  originColors: Map<string, string>;
  nextSequenceNumber: number;
}

export interface RequestResult {
  timestamp: string;
  originId: string;
  status: number;
  error?: string;
  stickyHeaderSent?: string; // The x-origin-id header value that was sent
}

export interface RequestManager {
  makeRequest: () => Promise<RequestResult>;
  isRunning: boolean;
  startInterval: () => void;
  stopInterval: () => void;
  setEndpointUrl: (url: string) => void;
}

export interface AnimationEngine {
  triggerAnimation: (originId: string) => void;
  activeDots: AnimatedDot[];
}

export interface ColorAllocation {
  allocateColor: (originId: string) => string;
  getColor: (originId: string) => string | undefined;
  getAllocatedColors: () => Map<string, string>;
}
