# Integrating the CORS Proxy with Bluesky Client

This guide explains how to integrate the Swarm CORS Proxy with the Bluesky client application to resolve cross-origin issues.

## Overview

The Swarm CORS Proxy serves as an intermediary between the Bluesky client and the Swarm Feed Generator API. It handles CORS headers correctly, allowing the Bluesky client to access the feed generator without cross-origin issues.

## Integration Steps

### 1. Deploy the CORS Proxy

Follow the deployment instructions in the README to deploy the proxy to Render or another hosting service. Once deployed, you'll have a URL like:

```
https://swarm-cors-proxy.onrender.com
```

### 2. Update Constants

In your Bluesky client codebase, add a new constant for the proxy URL:

```typescript
// In src/lib/constants.ts or similar file
export const SWARM_API_PROXY = 'https://swarm-cors-proxy.onrender.com';
```

### 3. Update Feed Generator API Calls

Find all places in your code where the Swarm Feed Generator API is called directly, and replace the URL with the proxy URL:

#### Before:

```typescript
const response = await fetch(
  `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}&limit=50`
);
```

#### After:

```typescript
import { SWARM_API_PROXY } from '#/lib/constants';

const response = await fetch(
  `${SWARM_API_PROXY}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}&limit=50`
);
```

### 4. Update Feed Generator Description Calls

Also update any calls to the `describeFeedGenerator` endpoint:

#### Before:

```typescript
const response = await fetch(
  `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator`
);
```

#### After:

```typescript
import { SWARM_API_PROXY } from '#/lib/constants';

const response = await fetch(
  `${SWARM_API_PROXY}/xrpc/app.bsky.feed.describeFeedGenerator`
);
```

## Common Files to Update

In the Bluesky client codebase, these are the most likely files that need updating:

1. `src/view/com/feeds/SwarmFeedScreen.tsx` - Main Swarm feed component
2. `src/lib/api/swarm-feed.ts` - API calls for Swarm feeds
3. `src/state/feeds/swarm-feeds.ts` - Feed state management

## Testing

After updating the code:

1. Run the Bluesky client locally to test the integration
2. Verify that feeds are loading correctly without CORS errors
3. Check the browser's developer console to ensure no CORS-related warnings or errors
4. Verify that the proxy server logs show the requests being proxied successfully

## Troubleshooting

If you encounter any issues:

1. **CORS errors still appear**: 
   - Check that all API calls are using the proxy URL
   - Verify the proxy is running and accessible
   - Check that the proxy is properly configured with the correct CORS headers

2. **Feeds don't load**:
   - Check the browser console for errors
   - Verify the proxy server logs for any errors
   - Ensure the feed generator API is working correctly by testing directly

3. **Proxy returns 500 errors**:
   - Check the proxy logs for specific error messages
   - Verify the feed generator URL is correctly configured in the proxy

## Security Considerations

- The proxy doesn't add any authentication by default
- All requests are forwarded as-is to the feed generator
- Consider adding rate limiting if needed for production use 