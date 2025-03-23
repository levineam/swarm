# Feed Generator Debugging (v7): Critical Display Issue Resolution

## Latest Status Update
**HIGH VISIBILITY ISSUE**: The main Swarm feed tab, which is pinned by default and visible to all users on the home screen, is failing to display posts. When users open the app, they see "Error: Failed to fetch" instead of community content. This is a high-priority issue as it affects the core user experience.

We've implemented a comprehensive debugging approach and can now confirm the following:

1. The error "Failed to fetch" is occurring when accessing the pinned Swarm feed tab in the main navigation.
2. Network connectivity is not the actual issue - this appears to be related to CORS or authentication problems.
3. The `SWARM_FEED_URI` has been updated to point to the correct feed generator: `at://did:plc:y5tuxxovcztmqg3dkcpnms5d/app.bsky.feed.generator/swarm-feed`.
4. We've implemented both a standard API approach (with hydration) and a direct approach (bypassing hydration) to help diagnose the issue.
5. A new SwarmFeedDebug screen has been added that allows testing different API approaches side-by-side.

## Critical User Impact
This issue has high visibility because:
1. The Swarm feed tab is pinned by default alongside primary feeds like "Following"
2. It appears on the main home interface that all users see immediately
3. The error message is prominently displayed, creating a poor first impression
4. It prevents users from seeing any Swarm community content in their normal browsing flow

## Next Diagnostic Steps
Based on the "Failed to fetch" error and our findings so far, we need to focus on:

1. **Network Request Issues**: Check the network tab in browser dev tools to confirm if the requests are failing due to CORS or authentication issues.
2. **Direct API Testing**: Use the Debug Feed button to test direct API calls vs. standard hydration.
3. **Authentication Analysis**: Verify that authentication tokens are being properly passed to the feed generator.
4. **Local vs. Production Testing**: Determine if the issue is specific to the local development environment or also occurs in production.

## Current Status Summary
| Component | Status | Description |
|-----------|--------|-------------|
| Feed Generator API | ✅ WORKING | Backend API returns posts correctly when accessed directly |
| DID Resolution | ✅ RESOLVED | Fixed misalignment between service DID and feed URIs |
| Database Storage | ✅ WORKING | Posts are being stored in the database |
| Bluesky Preferences | ✅ CONFIRMED | Swarm feed is saved in user preferences |
| CORS Proxy | 🔄 TESTING | Uncertain if the proxy is correctly passing auth tokens |
| **Main Pinned Feed Tab** | ❌ CRITICAL | "Failed to fetch" error in the primary UI location |
| API Requests | 🔄 INVESTIGATING | Debugging screen implemented to test multiple request methods |
| Auth Tokens | ❓ SUSPECT | Authentication may not be properly passing through |

## Implemented Hybrid Strategy
Our current implementation uses a multi-tiered approach:

```typescript
// Try agent.getTimeline (standard hydration)
if (this.agent && this.agent.session) {
  try {
    const timelineResponse = await this.agent.getTimeline({
      algorithm: this.feedUri,
      limit,
      cursor,
    })
    return {
      cursor: timelineResponse.data.cursor,
      feed: timelineResponse.data.feed,
    }
  } catch (hydrationError) {
    // Log failure and continue to next approach
  }
}

// Try agent.getPosts with the skeleton URIs (direct hydration)
try {
  const postUris = skeletonData.feed.map(item => item.post)
  const postsResponse = await this.agent.getPosts({
    uris: postUris,
  })
  
  // Match the posts to the original feed order
  const feed = skeletonData.feed.map(item => {
    const post = postsResponse.data.posts.find(p => p.uri === item.post)
    if (!post) return null
    return { post }
  }).filter(Boolean)
  
  if (feed.length > 0) {
    return { cursor: skeletonData.cursor, feed }
  }
} catch (getPostsError) {
  // Log failure and continue to last approach
}

// Create simplified post objects from the skeleton data
// This is a last resort to ensure content displays
const feed = skeletonData.feed.map(item => {
  // Create simplified post view from URI
  // ...
})
```

## Next Immediate Actions

1. **Debug Network Requests**: Use browser developer tools to analyze the failing fetch requests
2. **Test Authentication Flow**: Verify that authentication tokens are being properly passed
3. **Confirm CORS Settings**: Ensure the feed generator is properly configured for CORS
4. **Compare Working vs. Non-working Feeds**: Analyze differences between the Swarm feed and other working feeds

## Resolution Path
The most likely path to resolution will be:

1. Using the Debug Feed screen to identify which API approach successfully retrieves posts
2. Implementing the successful approach as the primary solution
3. Ensuring proper authentication for the feed generator requests
4. Addressing any remaining CORS issues with the feed generator

---

**Document Version**: 7.0  
**Last Updated**: March 2024  
**Contributors**: Andrew Levine, Claude 