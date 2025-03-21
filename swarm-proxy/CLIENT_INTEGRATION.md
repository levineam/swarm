# Swarm CORS Proxy - Client Integration Guide

This guide explains how to integrate the Swarm CORS Proxy with the Bluesky client to resolve cross-origin issues when accessing the Swarm Feed Generator.

## Overview

The Swarm CORS Proxy acts as an intermediary between the Bluesky client and the Swarm Feed Generator. It handles cross-origin requests by:

1. Accepting requests from the client application
2. Adding appropriate CORS headers to allow cross-origin access
3. Forwarding requests to the Swarm Feed Generator 
4. Returning responses to the client application

This approach eliminates CORS issues without modifying the core Feed Generator service.

## Integration Steps

### 1. Deploy the CORS Proxy

First, ensure the CORS proxy is deployed and operational:

- The proxy should be deployed at a URL like: `https://swarm-cors-proxy.onrender.com`
- Verify it works by accessing: `https://swarm-cors-proxy.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator`

### 2. Update Constants

Add a constant for the proxy URL in your codebase:

```typescript
// In src/lib/constants.ts or similar
export const SWARM_API_PROXY = 'https://swarm-cors-proxy.onrender.com';
```

### 3. Update Feed Generator API Calls

Replace direct API calls to the Feed Generator with calls through the proxy:

#### For the `getFeedSkeleton` endpoint:

```typescript
// Original code
const response = await fetch(
  `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
);

// Updated code with proxy
import { SWARM_API_PROXY } from '#/lib/constants';

const response = await fetch(
  `${SWARM_API_PROXY}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
);
```

#### For the `describeFeedGenerator` endpoint:

```typescript
// Original code
const response = await fetch(
  'https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator'
);

// Updated code with proxy
import { SWARM_API_PROXY } from '#/lib/constants';

const response = await fetch(
  `${SWARM_API_PROXY}/xrpc/app.bsky.feed.describeFeedGenerator`
);
```

### 4. Common Files to Update

Look for the following files that might contain direct API calls to the Feed Generator:

- `src/server/feed_generator.ts`
- `src/view/screens/SwarmFeed.tsx`
- `src/state/queries/feed.ts`
- Any other files that interact with the Feed Generator API

### 5. Testing

After making these changes:

1. Run the client locally
2. Check the browser console for CORS errors
3. Verify that Swarm feeds load correctly
4. Confirm that all XRPC requests go through the proxy

Use the Network tab in your browser's developer tools to verify requests are going to the proxy URL rather than directly to the Feed Generator.

### 6. Troubleshooting

#### CORS Errors Still Present

If you still see CORS errors:

1. Verify the proxy is running and accessible
2. Check that all API calls have been updated to use the proxy URL
3. Confirm the proxy's CORS configuration includes your client's origin

#### Feed Not Loading

If the feed doesn't load:

1. Check the browser console for errors
2. Verify the proxy is forwarding requests correctly
3. Test direct access to the proxy endpoints to confirm they work

#### Proxy Errors

If the proxy returns errors:

1. Check the proxy server logs
2. Verify the Feed Generator URL is correctly configured in the proxy
3. Ensure the proxy has appropriate error handling

## Security Considerations

Note that the proxy currently does not implement authentication. All requests to the Feed Generator through the proxy are unauthenticated.

For production use, consider:

1. Implementing origin validation to restrict which domains can use the proxy
2. Adding rate limiting to prevent abuse
3. Setting up monitoring and logging to detect unusual patterns

## Questions?

If you encounter issues with the integration, please contact the development team or create an issue in the repository. 