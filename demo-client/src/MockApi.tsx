interface MockApiProps {
  onToggle: (enabled: boolean) => void;
  enabled: boolean;
}

export const MockApi: React.FC<MockApiProps> = ({ onToggle, enabled }) => {
  return (
    <div className="mock-api-controls">
      <label className="mock-api-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span>Use Mock API (for testing without CloudFront)</span>
      </label>
      {enabled && (
        <div className="mock-api-info">
          <p>🧪 Mock API is enabled. Requests will be simulated locally.</p>
        </div>
      )}
    </div>
  );
};

// Mock API response generator
export const generateMockResponse = (hasOrigin: boolean) => {
  const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
  const selectedRegion = hasOrigin 
    ? regions[Math.floor(Math.random() * regions.length)]  // Random region with origin
    : regions[0]; // Always primary region without origin

  const headers: Record<string, string> = {};
  if (hasOrigin) {
    headers['origin'] = window.location.origin;
    headers['x-forwarded-for'] = '203.0.113.1';
  }

  return {
    timestamp: new Date().toISOString(),
    origin: selectedRegion,
    region: selectedRegion,
    message: `API response from ${selectedRegion}`,
    headers,
    mock: true
  };
};

// Mock API delay simulation
export const mockApiDelay = () => {
  return new Promise(resolve => {
    const delay = Math.random() * 500 + 200; // 200-700ms delay
    setTimeout(resolve, delay);
  });
};
