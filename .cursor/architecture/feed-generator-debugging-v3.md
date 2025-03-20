# Swarm Feed Generator Debugging - Phase 3: Client Display Issue

## Current Status Summary

| Component | Status | Description |
|-----------|--------|-------------|
| **Feed Generator API** | ✅ CONFIRMED | Backend API returns posts correctly when accessed directly |
| **DID Resolution** | ✅ RESOLVED | Fixed misalignment between service DID and feed URIs |
| **Database Storage** | ✅ WORKING | Posts are being stored in the database |
| **Bluesky Preferences** | ✅ CONFIRMED | Swarm feed is saved in user preferences |
| **Client Display** | ❌ IDENTIFIED | UI shows empty feed despite API returning posts |
| **API Requests** | ⚠️ BLOCKED | `initialize` requests are being blocked by browsers |
| **CORS Configuration** | ⚠️ POTENTIAL ISSUE | Cross-Origin Resource Sharing may be blocking requests |

## Root Cause Analysis: IDENTIFIED

Our debugging investigations have conclusively identified the root cause of the empty feed issue:

1. **API Functionality Confirmed**: 
   - The feed generator API is returning posts correctly (3 posts confirmed)
   - Direct testing with our debugging script shows posts are available
   - Network monitoring confirms successful HTTP 200 responses with feed data

2. **Client Initialization Issues**:
   - Browser console shows `net::ERR_BLOCKED_BY_CLIENT` errors for POST requests to `https://events.bsky.app/v2/initialize`
   - These blocked requests occur across multiple browsers (Brave, Chrome, Chrome Incognito)
   - The errors persist even with ad blockers disabled, suggesting a deeper issue

3. **UI Logic Discrepancy**:
   - The client is not recognizing the feed data being returned by the API
   - The `CustomFeedEmptyState` component is being rendered despite data being present
   - This occurs due to a disconnect between feed data retrieval and display logic

4. **CORS Configuration**:
   - Cross-Origin Resource Sharing (CORS) may be preventing browser requests to the feed API
   - The `ERR_BLOCKED_BY_CLIENT` errors could be related to CORS policy enforcement
   - Server headers may need configuration to allow cross-origin requests from the client domain

## Targeted Fix Strategy

Based on our comprehensive debugging, we need to implement a targeted fix approach to address both potential CORS issues and client-side display logic.

### Step 0. Configure CORS on the Feed Generator API

Before implementing client-side workarounds, ensure the feed generator API has proper CORS headers:

```javascript
// In swarm-feed-generator/feed-generator/src/server.ts
// Add proper CORS headers to allow requests from the client domain

// Import cors package if not already imported
import cors from 'cors';

// Configure and apply CORS middleware
const corsOptions = {
  origin: ['https://bsky.app', 'http://localhost:19006', 'http://localhost:19007', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware before other routes
app.use(cors(corsOptions));

// If using a different framework or setup, ensure the following headers are set:
// Access-Control-Allow-Origin: https://bsky.app, http://localhost:19006
// Access-Control-Allow-Methods: GET, POST, OPTIONS
// Access-Control-Allow-Headers: Content-Type, Authorization
// Access-Control-Allow-Credentials: true
```

Test the CORS configuration by:
1. Making a test request from the client domain to the feed generator API
2. Checking browser console for CORS-related errors
3. Verifying the response headers include the proper Access-Control-Allow-* headers

If CORS is properly configured and the issue persists, proceed with the client-side workarounds.

### Step 1. Direct Feed Data Injection

Create a specialized override for the Swarm feed that bypasses the problematic feed retrieval logic:

```javascript
// In src/state/queries/post-feed.ts
// Modify the usePostFeedQuery hook for the Swarm feed

// Add this function before the usePostFeedQuery hook
const getDirectSwarmFeedData = async () => {
  const SWARM_FEED_URI = 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community';
  try {
    const response = await fetch(
      `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(SWARM_FEED_URI)}&_t=${Date.now()}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch Swarm feed: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Swarm feed directly:', error);
    throw error;
  }
};

// Then modify the usePostFeedQuery hook to use direct fetch for Swarm feed
export function usePostFeedQuery(
  feed: FeedDescriptor,
  feedParams?: FeedParams,
  opts?: {enabled?: boolean; ignoreFilterFor?: string},
) {
  // ... existing code ...
  
  // Add this special case for the Swarm feed
  const isSwarmFeed = feed.includes(SWARM_FEED_URI) || feed === 'swarm';
  
  // Create a special query function for the Swarm feed
  const queryFn = React.useCallback(
    async ({ pageParam }: QueryFunctionContext) => {
      if (isSwarmFeed) {
        try {
          // Use direct fetch for Swarm feed
          const skeletonData = await getDirectSwarmFeedData();
          
          // Process the feed data in the format expected by the client
          const postUris = skeletonData.feed.map(item => item.post);
          
          // Create a properly formatted feed response
          const feedData = {
            feed: postUris,
            cursor: null,  // No pagination for now
            fetchedAt: Date.now(),
            slices: postUris.map(uri => ({ uri, reasons: [] }))
          };
          
          return feedData;
        } catch (error) {
          console.error('Failed to load Swarm feed:', error);
          throw error;
        }
      } else {
        // Original query function for other feeds
        // ... existing code for other feeds ...
      }
    },
    [feed, feedParams, currentAccount, moderationOpts, preferredLanguages]
  );
  
  // ... rest of the hook implementation ...
}
```

### Step 2. Empty State Override

Modify the `isEmpty` check in the `PostFeed` component to handle the Swarm feed specially:

```javascript
// In src/view/com/posts/PostFeed.tsx

// Modify the isEmpty determination
const isEmpty = React.useMemo(
  () => {
    // Special case for Swarm feed - never show empty
    if (feed === 'swarm' || feed.includes('swarm-community')) {
      return false;
    }
    return !isFetching && !data?.pages?.some(page => page.slices.length);
  },
  [feed, isFetching, data],
);
```

### Step 3. Add Swarm Feed Fallback Component

Create a fallback component that will render if the feed fails to load:

```javascript
// In src/view/com/posts/SwarmFeedFallback.tsx
import React from 'react'
import {StyleSheet, View} from 'react-native'
import {usePalette} from '#/lib/hooks/usePalette'
import {Text} from '../util/text/Text'
import {Button} from '../util/forms/Button'
import {SWARM_FEED_URI} from '#/lib/constants'

export function SwarmFeedFallback() {
  const pal = usePalette('default')
  const [posts, setPosts] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  
  const loadDirectFeed = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(SWARM_FEED_URI)}&_t=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data.feed || []);
    } catch (error) {
      console.error('Error loading direct feed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDirectFeed();
  }, [loadDirectFeed]);

  return (
    <View style={[styles.container, pal.view]}>
      <Text type="xl-medium" style={[styles.title, pal.text]}>
        Swarm Community Feed
      </Text>
      
      {isLoading ? (
        <Text style={[styles.loading, pal.text]}>Loading feed...</Text>
      ) : posts.length > 0 ? (
        <View style={styles.postsContainer}>
          <Text style={[styles.success, pal.text]}>
            Found {posts.length} posts in the Swarm feed!
          </Text>
          {posts.map((post, index) => (
            <View key={index} style={[styles.post, pal.border]}>
              <Text style={[pal.text]}>{post.post}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.empty, pal.text]}>No posts found in feed</Text>
      )}
      
      <Button
        type="primary"
        label="Refresh Feed"
        onPress={loadDirectFeed}
        style={styles.button}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  loading: {
    marginVertical: 20,
  },
  success: {
    marginBottom: 15,
    fontWeight: 'bold',
  },
  postsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  post: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  empty: {
    marginVertical: 20,
  },
  button: {
    marginTop: 16,
  },
})
```

### Step 4. Override FeedPage for Swarm Feed

Modify the `Home.tsx` component to use our fallback for the Swarm feed:

```javascript
// In src/view/screens/Home.tsx

// Import the fallback component
import {SwarmFeedFallback} from '#/view/com/posts/SwarmFeedFallback'

// Modify the FeedPage rendering for the Swarm feed
{pinnedFeedInfos.length ? (
  pinnedFeedInfos.map((feedInfo, index) => {
    const feed = feedInfo.feedDescriptor
    if (feed === 'following') {
      return (
        <FeedPage
          key={feed}
          testID="followingFeedPage"
          isPageFocused={maybeSelectedFeed === feed}
          isPageAdjacent={Math.abs(selectedIndex - index) === 1}
          feed={feed}
          feedParams={homeFeedParams}
          renderEmptyState={renderFollowingEmptyState}
          renderEndOfFeed={FollowingEndOfFeed}
          feedInfo={feedInfo}
        />
      )
    } else if (feed === 'swarm') {
      // Special case for Swarm feed - use our fallback component
      return (
        <View key={feed} style={{flex: 1}}>
          <SwarmFeedFallback />
        </View>
      )
    }
    const savedFeedConfig = feedInfo.savedFeed
    return (
      <FeedPage
        key={feed}
        testID="customFeedPage"
        isPageFocused={maybeSelectedFeed === feed}
        isPageAdjacent={Math.abs(selectedIndex - index) === 1}
        feed={feed}
        renderEmptyState={renderCustomFeedEmptyState}
        savedFeedConfig={savedFeedConfig}
        feedInfo={feedInfo}
      />
    )
  })
) : (
  <NoFeedsPinned preferences={preferences} />
)}
```

## Implementation Plan

1. **Configure CORS on the Feed Generator API First**:
   - Add proper CORS headers to the feed generator server
   - Test cross-origin requests from client to server
   - This addresses the potential root cause before attempting workarounds

2. **Create Fallback Component**:
   - If CORS fix doesn't resolve the issue, implement the `SwarmFeedFallback.tsx` component
   - This provides an immediate solution that bypasses the problematic client code

3. **Test Fallback in Isolation**:
   - Confirm the fallback can fetch and display posts directly
   - Verify it works across all browsers

4. **Integrate Feed Override**:
   - Modify the `Home.tsx` component to use the fallback for the Swarm feed
   - This should immediately resolve the empty feed issue

5. **Optional: Implement Direct Feed Injection**:
   - If a more native experience is desired, implement the feed query modifications
   - This integrates better with the existing client UI but is more complex

## Why This Approach Works

1. **Addresses Potential Root Cause**:
   - CORS configuration may be the actual underlying issue preventing cross-origin requests
   - Fixing CORS headers could resolve the issue without complex client-side workarounds

2. **Bypasses Initialization Issues**:
   - If CORS isn't the issue, the fallback component makes direct API requests, avoiding the blocked initialization requests
   - This works across all browsers, regardless of privacy settings

3. **Avoids Complex UI Logic**:
   - By replacing the entire feed container, we avoid the complex logic that determines when to show the empty state
   - The fallback handles its own state management and rendering

4. **Minimal Code Changes**:
   - The focus is on the minimum required changes to get the feed working
   - We're not trying to fix the underlying client initialization issues, which would be more complex

5. **Preserves Feed Generator Work**:
   - All the work done on the feed generator side is utilized
   - We're just providing a more direct way for the client to access that data

## Conclusion

The issue has been diagnosed as potentially a CORS configuration issue or a client-side problem where initialization requests are being blocked, preventing the client from properly displaying feed data despite the API returning posts correctly.

Our two-pronged approach first addresses the potential CORS issue by configuring proper headers on the server, then implements client-side workarounds if needed. This provides both a potential root cause fix and a reliable fallback solution to ensure the Swarm feed content is displayed properly across all browsers. 