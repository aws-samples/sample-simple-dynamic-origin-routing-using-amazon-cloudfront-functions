import { useCallback } from 'react';
import { useHttpClient, type HttpClient, type HttpClientConfig } from './useHttpClient';

export interface DualHttpClient {
  stickyClient: HttpClient;
  nonStickyClient: HttpClient;
  makeParallelRequests: () => Promise<{
    stickyResult: RequestResult;
    nonStickyResult: RequestResult;
  }>;
}

interface DualHttpClientConfig {
  stickyOriginId: string | null;
  nonStickyOriginId: string | null;
  mockModeEnabled: boolean;
  customUrl: string;
}

export const useDualHttpClient = (config: DualHttpClientConfig): DualHttpClient => {
  const { stickyOriginId, nonStickyOriginId, mockModeEnabled, customUrl } = config;

  // Create sticky client configuration
  const stickyConfig: HttpClientConfig = {
    stickinessEnabled: true,
    currentOriginId: stickyOriginId,
    mockModeEnabled,
    customUrl,
  };

  // Create non-sticky client configuration
  const nonStickyConfig: HttpClientConfig = {
    stickinessEnabled: false,
    currentOriginId: null, // Always null for non-sticky mode
    mockModeEnabled,
    customUrl,
  };

  const stickyClient = useHttpClient(stickyConfig);
  const nonStickyClient = useHttpClient(nonStickyConfig);

  const makeParallelRequests = useCallback(async () => {
    // Make both requests in parallel
    const [stickyResult, nonStickyResult] = await Promise.all([
      stickyClient.makeRequest(),
      nonStickyClient.makeRequest(),
    ]);

    return {
      stickyResult,
      nonStickyResult,
    };
  }, [stickyClient, nonStickyClient]);

  return {
    stickyClient,
    nonStickyClient,
    makeParallelRequests,
  };
};

// Import RequestResult type
import type { RequestResult } from '../types';
