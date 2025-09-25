import { useCallback } from 'react';
import type { RequestResult } from '../types';

export interface HttpClientConfig {
  stickinessEnabled: boolean;
  currentOriginId: string | null;
  mockModeEnabled: boolean;
  customUrl: string;
}

export interface HttpClient {
  makeRequest: () => Promise<RequestResult>;
  stickinessEnabled: boolean;
}

export const useHttpClient = (config: HttpClientConfig): HttpClient => {
  const { stickinessEnabled, currentOriginId, mockModeEnabled, customUrl } = config;

  const getEndpointUrl = useCallback(() => {
    if (mockModeEnabled && customUrl.trim()) {
      return customUrl.trim();
    }
    return `${window.location.origin}/api`;
  }, [mockModeEnabled, customUrl]);

  const makeRequest = useCallback(async (): Promise<RequestResult> => {
    const url = getEndpointUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let stickyHeaderSent: string | undefined;

    // Include origin ID header when stickiness is enabled and we have a current origin
    if (stickinessEnabled && currentOriginId) {
      headers['x-origin-id'] = currentOriginId;
      stickyHeaderSent = currentOriginId;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const timestamp = new Date().toISOString();
      
      // Extract origin ID from response headers or body
      let originId = response.headers.get('x-origin-id') || '';
      
      if (!originId) {
        try {
          const responseText = await response.text();
          // Try to parse as JSON and extract origin ID
          const data = JSON.parse(responseText);
          originId = data.originId || data.origin || data.id || '';
        } catch {
          // If parsing fails, originId remains empty
        }
      }

      // If still no origin ID found, treat as "missing origin header"
      if (!originId) {
        originId = 'missing origin header';
      }

      return {
        timestamp,
        originId,
        status: response.status,
        stickyHeaderSent,
      };
    } catch (error) {
      const timestamp = new Date().toISOString();
      return {
        timestamp,
        originId: 'error',
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        stickyHeaderSent,
      };
    }
  }, [stickinessEnabled, currentOriginId, getEndpointUrl]);

  return {
    makeRequest,
    stickinessEnabled,
  };
};
