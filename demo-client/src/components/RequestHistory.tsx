import React from 'react';
import type { RequestRecord } from '../types';
import { ColorAllocator } from '../utils/colorAllocation';

interface RequestHistoryProps {
  requestHistory: RequestRecord[];
  colorAllocator: ColorAllocator;
  label?: string; // Optional label for comparison mode
}

export const RequestHistory: React.FC<RequestHistoryProps> = ({
  requestHistory,
  colorAllocator,
  label,
}) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusClass = (status: number) => {
    if (status === 0) return 'status-error';
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 400) return 'status-error';
    return 'status-warning';
  };

  return (
    <div className="request-history">
      <h3>{label || 'Request History'}</h3>
      <div className="history-container">
        {requestHistory.length === 0 ? (
          <div className="no-requests">No requests made yet</div>
        ) : (
          <div className="history-list">
            {requestHistory.slice().reverse().map((request) => {
              const originColor = colorAllocator.getColor(request.originId);
              
              return (
                <div key={request.id} className="history-item">
                  <div className="history-header">
                    <span className="sequence-number">#{request.sequenceNumber}</span>
                    <span className="timestamp">{formatTimestamp(request.timestamp)}</span>
                    <span className={`status ${getStatusClass(request.status)}`}>
                      {request.status === 0 ? 'ERROR' : request.status}
                    </span>
                  </div>
                  
                  <div className="history-details">
                    <div className="origin-info">
                      {originColor && (
                        <div 
                          className="origin-color-indicator"
                          style={{ backgroundColor: originColor }}
                        ></div>
                      )}
                      <span className="origin-id">
                        Origin: {request.originId || 'Unknown'}
                      </span>
                    </div>
                    
                    {request.stickyHeaderSent && (
                      <div className="sticky-header-info">
                        <span className="header-label">x-origin-id:</span>
                        <span className="header-value">{request.stickyHeaderSent}</span>
                      </div>
                    )}
                    
                    {request.error && (
                      <div className="error-message">
                        Error: {request.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
