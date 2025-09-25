# Amazon CloudFront Programmable Origin Routing Demo

This interactive demo showcases **dynamic business logic routing at the edge** using Amazon CloudFront Functions. It demonstrates how requests can be programmatically routed to different origins based on headers, overriding traditional DNS-based routing.

## Features

- **Single Mode Testing**: Test origin routing with optional stickiness headers
- **Comparison Mode**: Side-by-side comparison of sticky vs non-sticky routing
- **Real-time Visualization**: Animated flow charts showing request routing
- **Request History**: Detailed logs of all requests and responses
- **Mock Mode**: Test locally without deploying CloudFront infrastructure
- **Configurable Endpoint**: Test against your deployed CloudFront distribution

## How It Works

### Single Mode
- **Without Stickiness**: Requests are sent without the `x-origin-id` header
- **With Stickiness**: Requests include the `x-origin-id` header from previous responses
- **Origin Assignment**: First request gets assigned to an origin, subsequent requests stick to it

### Comparison Mode
- **Sticky Side**: Always sends `x-origin-id` header to maintain session affinity
- **Non-Sticky Side**: Never sends origin headers, relies on default routing
- **Visual Comparison**: Shows routing differences side-by-side in real-time

## Demo Controls

### Main Controls
- **Start/Stop**: Begin or end automated request generation (1 request per second)
- **Single Request**: Make one manual request to test routing
- **Toggle Stickiness**: Enable/disable session stickiness in single mode
- **Comparison Mode**: Switch between single mode and side-by-side comparison

### Configuration
- **Mock Mode**: Test locally with simulated responses (no CloudFront needed)
- **Custom Endpoint**: Enter your CloudFront distribution URL for live testing
- **Clear History**: Reset request logs and start fresh

## Setup Instructions

1. **Start the demo server**:
   ```bash
   cd demo
   npm install
   npm run dev
   ```
2. **Open your browser** to the local development server (usually http://localhost:5173)

### For Live Testing (Remote CloudFront)
Test the actual CloudFront routing while developing the UI locally:

3. **Deploy your CloudFront distribution** using the CDK stack in the parent directory
4. **Get your CloudFront domain** from the CDK output (e.g., `https://d1234567890abc.cloudfront.net`)
5. **Configure the endpoint** in the demo interface with your CloudFront domain
6. **Test real routing** - Local UI makes requests to remote CloudFront distribution

## Usage Patterns

### Testing Session Stickiness
1. **Start in Single Mode** with stickiness disabled
2. **Make several requests** - observe random origin assignment
3. **Enable stickiness** and make more requests
4. **Observe consistency** - requests should stick to the same origin

### Comparing Routing Behaviors
1. **Switch to Comparison Mode**
2. **Start automated requests** to see continuous side-by-side comparison
3. **Observe differences**:
   - Sticky side: Consistent origin assignment
   - Non-sticky side: Random/default origin routing

### Testing Different Scenarios
1. **Manual single requests** to test specific routing logic
2. **Automated batch testing** to observe patterns over time
3. **Mock mode testing** for development without infrastructure

## Expected Behavior

### With CloudFront Distribution
- **Without `x-origin-id` header**: Routes to default origin configured in KVS
- **With `x-origin-id` header**: Routes to specific origin (0, 1, 2, etc.)
- **Invalid origin IDs**: Fall back to default origin
- **Response includes**: `X-Origin-ID` header indicating which origin served the request

### With Mock Mode
- **Simulates different origins**: Returns random origin IDs for testing
- **No infrastructure needed**: Perfect for development and demonstration
- **Realistic delays**: Includes network simulation for authentic experience

## API Endpoint Requirements

### For Live Testing
Your CloudFront distribution should have:
- An `/api` endpoint that returns JSON with origin information
- CORS configured to allow requests from the demo domain (`http://localhost:5173`)
- CloudFront Function configured for origin selection on `/api` behavior
- Multiple origins configured in the Key Value Store

### Expected Response Format
```json
{
  "message": "Hello from Lambda!",
  "X-Origin-ID": "1",
  "timestamp": "2025-08-25T19:14:22.687Z"
}
```

**Response Headers:**
```
Content-Type: application/json
X-Origin-ID: 1
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: x-origin-id, Content-Type
```

### Request Headers Sent by Demo
- **Without stickiness**: No special headers
- **With stickiness**: `x-origin-id: [previous-origin-id]`
- **Content-Type**: `application/json` (always sent)

## Troubleshooting

### CORS Issues
If you see CORS errors in the browser console:
1. Ensure your CloudFront distribution has CORS response headers policy configured
2. Check that the policy allows `x-origin-id` header
3. Verify the demo domain is allowed (or use `*` for testing)

### No Origin Differences
If all requests show the same origin or "missing origin header":
1. Verify CloudFront Function is deployed and associated with `/api` behavior
2. Check that Key Value Store contains proper origin mappings (`__default__`, `0`, `1`, `2`)
3. Ensure multiple ALB origins are deployed and healthy
4. Test with mock mode first to verify demo functionality

### Network Errors
If requests fail entirely:
1. Verify the CloudFront distribution is deployed and accessible
2. Check that the `/api` endpoint exists and returns JSON
3. Ensure the endpoint URL is correct (should be `https://d1234567890abc.cloudfront.net`)
4. Test the endpoint directly in a browser first

### Demo Not Working
If the demo interface doesn't respond:
1. Check browser console for JavaScript errors
2. Verify the demo server is running (`npm run dev`)
3. Try refreshing the page
4. Test with mock mode enabled first

## Development

The demo is built with:
- **React 19** with TypeScript for interactive UI
- **Vite** for fast development and building
- **CSS Grid/Flexbox** for responsive layout
- **Custom hooks** for HTTP client management and animation
- **Real-time visualization** with animated flow charts

### Demo Architecture
- **Single Mode**: Tests one routing scenario at a time
- **Comparison Mode**: Tests sticky vs non-sticky routing simultaneously
- **Mock Mode**: Simulates CloudFront responses locally
- **Animation Engine**: Visualizes request flow in real-time
- **Color Allocation**: Assigns consistent colors to different origins

### Key Components
- `DemoPageWithComparison`: Main demo orchestrator
- `useHttpClient`: Handles API requests with optional stickiness
- `useDualHttpClient`: Manages parallel requests for comparison mode
- `FlowChart`: Animated visualization of request routing
- `RequestHistory`: Detailed log of all requests and responses

To modify the demo:
1. Edit components in `src/components/` for UI changes
2. Update hooks in `src/hooks/` for functionality changes  
3. Modify `src/types.ts` for data structure changes
4. The demo automatically reloads during development

## Integration with Main Project

This demo validates the CloudFront infrastructure by providing:
- **Visual confirmation** that origin routing is working correctly
- **Interactive testing** of different routing scenarios
- **Real-time feedback** on routing behavior and performance
- **Development tool** for testing without full infrastructure deployment

The demo helps ensure your programmable origin routing implementation is working as expected and provides an intuitive way to understand the routing concepts.
