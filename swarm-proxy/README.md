# Swarm CORS Proxy

A lightweight CORS proxy server for the Swarm Feed Generator API that resolves cross-origin issues between the Bluesky client and the feed generator.

## Features

- Handles CORS headers properly for all requests
- Forwards requests to the Swarm Feed Generator API
- Provides detailed logging for debugging
- Supports all required endpoints for Bluesky feed generators

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

## Usage

### Local Development

```bash
# Start the proxy server locally
npm start
```

The server will run on port 3000 by default, and will proxy requests to the Swarm Feed Generator API at `https://swarm-feed-generator.onrender.com`.

### Environment Variables

- `PORT`: The port to run the server on (default: 3000)
- `FEED_GENERATOR_URL`: The URL of the feed generator to proxy (default: https://swarm-feed-generator.onrender.com)

## API Usage

The proxy forwards all requests to the feed generator API. For example:

```
http://localhost:3000/xrpc/app.bsky.feed.describeFeedGenerator
```

Will be forwarded to:

```
https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
```

## Testing

A simple test client is included for verifying the proxy's functionality. You can access it at:

```
http://localhost:8080/simple-test.html
```

This requires running a simple HTTP server in the project directory:

```bash
python3 -m http.server 8080
```

## Deployment to Render

This repository can be deployed to Render for production use.

1. Create a new Web Service on Render
2. Connect to this GitHub repository
3. Configure the service:
   - Name: `swarm-cors-proxy`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Instance Type: Starter or Free tier

4. Add Environment Variables (optional):
   - `FEED_GENERATOR_URL`: `https://swarm-feed-generator.onrender.com`

5. Deploy the service

## Integrating with the Bluesky Client

After deploying to Render, update the Bluesky client code to use the proxy:

```typescript
// In client code that accesses the feed generator
const PROXY_URL = 'https://swarm-cors-proxy.onrender.com'; // Replace with your Render URL
const response = await fetch(
  `${PROXY_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
);
```

## Security Considerations

- The proxy is intentionally minimal for initial deployment
- Future enhancements will add rate limiting and additional security features as user adoption grows 