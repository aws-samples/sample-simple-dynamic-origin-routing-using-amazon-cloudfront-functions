import React from 'react';

interface UnifiedControlPanelProps {
  isRunning: boolean;
  comparisonModeEnabled: boolean;
  mockModeEnabled: boolean;
  customUrl: string;
  requestInterval: number; // Request interval in milliseconds
  onStart: () => void;
  onStop: () => void;
  onToggleComparison: () => void;
  onToggleMockMode: () => void;
  onCustomUrlChange: (url: string) => void;
  onRequestIntervalChange: (interval: number) => void;
  stickinessEnabled?: boolean; // Only shown in single mode
  onToggleStickiness?: () => void; // Only available in single mode
}

export const UnifiedControlPanel: React.FC<UnifiedControlPanelProps> = ({
  isRunning,
  comparisonModeEnabled,
  mockModeEnabled,
  customUrl,
  requestInterval,
  onStart,
  onStop,
  onToggleComparison,
  onToggleMockMode,
  onCustomUrlChange,
  onRequestIntervalChange,
  stickinessEnabled,
  onToggleStickiness,
}) => {
  // Check if running on localhost for development
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '::1';

  // Helper function to format interval display
  const formatInterval = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  // Helper function to handle slider change
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onRequestIntervalChange(value);
  };

  return (
    <div className="control-panel">
      <div className="control-section">
        <h3>Request Control</h3>
        <div className="button-group">
          <button 
            onClick={onStart} 
            disabled={isRunning}
            className={`btn ${isRunning ? 'btn-disabled' : 'btn-primary'}`}
          >
            Start
          </button>
          <button 
            onClick={onStop} 
            disabled={!isRunning}
            className={`btn ${!isRunning ? 'btn-disabled' : 'btn-secondary'}`}
          >
            Stop
          </button>
        </div>
        <div className="status">
          Status: {isRunning ? 'Running' : 'Stopped'}
        </div>
      </div>

      <div className="control-section">
        <h3>Request Speed</h3>
        <div className="slider-container">
          <label htmlFor="request-interval" className="slider-label">
            Interval: {formatInterval(requestInterval)}
          </label>
          <input
            id="request-interval"
            type="range"
            min="300"
            max="3000"
            step="200"
            value={requestInterval}
            onChange={handleIntervalChange}
            className="interval-slider"
          />
          <div className="slider-range">
            <span>100ms</span>
            <span>5s</span>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h3>Display Mode</h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={comparisonModeEnabled}
            onChange={onToggleComparison}
            className="toggle-input"
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">
            Comparison Mode {comparisonModeEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {/* Origin Stickiness - Only shown in single mode */}
      {!comparisonModeEnabled && stickinessEnabled !== undefined && onToggleStickiness && (
        <div className="control-section">
          <h3>Origin Stickiness</h3>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={stickinessEnabled}
              onChange={onToggleStickiness}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              {stickinessEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      )}

      {/* Mock Mode - Only available on localhost for development */}
      {isLocalhost && (
        <div className="control-section">
          <h3>Mock Mode</h3>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={mockModeEnabled}
              onChange={onToggleMockMode}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              {mockModeEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
          
          {mockModeEnabled && (
            <div className="url-input-section">
              <label htmlFor="custom-url">Custom Endpoint URL:</label>
              <input
                id="custom-url"
                type="text"
                value={customUrl}
                onChange={(e) => onCustomUrlChange(e.target.value)}
                placeholder="https://example.cloudfront.net/api"
                className="url-input"
              />
            </div>
          )}
          
          <div className="description">
            {mockModeEnabled 
              ? 'Using custom endpoint URL for requests'
              : 'Using current host with /api path'
            }
          </div>
        </div>
      )}

      {/* Development notice when mock mode is hidden */}
      {!isLocalhost && (<></>)}
    </div>
  );
};
