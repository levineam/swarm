# Swarm Feed Generator Debugging

This document outlines our debugging approach for the Swarm Feed Generator, specifically focusing on the swarm-community feed, which currently shows as empty.

## Current Issues

1. **Empty Feed Issue**: The swarm-community feed is currently showing as empty when accessed via the API.
2. **Firehose Connection Issues**: The health endpoint for the firehose returns a 404 error, suggesting the endpoint isn't properly implemented.
3. **DID Resolution Issues**: ⚠️ **RECURRING** - The DID resolution issue ("could not resolve identity: did:web:swarm-feed-generator.onrender.com") continues to occur despite implementing the fix-did middleware. This suggests either deployment issues or a more complex underlying cause.
4. **Limited Community Members**: The `SWARM_COMMUNITY_MEMBERS` array in `src/swarm-community-members.ts` only includes 1 entry, which might be limiting feed content.

## Diagnostic Approach

We'll use a systematic approach to diagnose and fix these issues:

### Step 1: Address Recurring DID Resolution Issues
**Goal**: Understand why the DID resolution issues continue to occur and implement a more robust fix.

#### Possible Causes:
1. **Deployment Issues**: Our middleware changes may not be properly deployed to the production environment
2. **Caching Issues**: PDS or client-side caching might be preventing the resolution from updating
3. **Feed Generator Record**: The issue could be with the feed generator record in the Bluesky PDS, not our code

#### Diagnostic Steps:
1. Check if the fix-did middleware is actually running in production:
   ```
   curl -v https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
   ```
   - Check response headers and body to see if the DIDs are consistent

2. Verify the feed generator record in the Bluesky PDS:
   ```
   node swarm-feed-generator/feed-generator/scripts/checkFeedRecord.js
   ```
   - This will show if the record has the correct DID

3. Follow deployment checklist:
   - Deploy to Render with cleared cache as outlined in `render-deployment-checklist.md`
   - This ensures all code changes take effect

**Benefit**: This will help determine if the middleware is working as expected or if a different approach is needed.

### Step 2: Create & Track a Test Post
**Goal**: Create a specific test post and track it through the feed generation system to see where it might be getting lost.

#### Test Post Creation:
1. Create a post from the account associated with the DID in `SWARM_COMMUNITY_MEMBERS`.
2. Include a specific hashtag like `#swarmtest` to make it easy to identify.
3. Save the post URI and timestamp.

#### Test Post Tracking:
- Check if the post appears in firehose events (if we can connect to the firehose)
- Check if the post gets stored in the database
- Check if the post appears in the feed when requested

**Benefit**: This will help isolate exactly where in the pipeline the failure is occurring.

### Step 3: Test Firehose Connection
**Goal**: Verify if the firehose is properly connected and receiving events.

1. Implement a proper `/health/firehose` endpoint in `src/server.ts`.
2. Check firehose connection status using: 
   ```
   curl https://swarm-feed-generator.onrender.com/health/firehose
   ```
3. Examine the firehose implementation in `src/server.ts` and `src/util/subscription.ts`.

**Benefit**: This will help determine if the issue is with the firehose connection itself.

### Step 4: Review Feed Algorithm Implementation
**Goal**: Ensure the feed algorithm is properly filtering and returning posts.

1. Examine the swarm-community feed implementation in:
   - `src/algos/swarm-community.ts`
   - `src/algos/index.ts`
2. Test the feed endpoint directly:
   ```
   curl https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community
   ```

**Benefit**: This will ensure the algorithm is correctly filtering for community members.

### Step 5: Database Diagnostics
**Goal**: Verify the database is properly storing and indexing posts.

1. Check the database schema and indexes.
2. Look for any errors in the post insertion process.
3. Verify the `post` table contains entries.

**Benefit**: This will help identify any database-related issues.

## Revised Solutions

### Short-term solutions:
1. **Proper Deployment Process**: 
   - Follow the render-deployment-checklist.md including the "Clear build cache & deploy" option
   - This ensures all code changes take effect, including middleware fixes

2. **Update Feed Generator Record**: 
   - Use the updateFeedGenDid.js script to ensure the feed generator record has the correct DID
   - This directly addresses the DID resolution issue at the Bluesky PDS level
   ```
   node swarm-feed-generator/feed-generator/scripts/updateFeedGenDid.js
   ```

3. **Force DID Resolution Refresh**:
   - Implement a script to force the DID resolution to refresh
   - Clear caches that might be preventing the update

4. **Implement Firehose Health Endpoint**: 
   - Add a proper health endpoint in `src/server.ts` to monitor the firehose connection.

5. **Expand Community Members**: 
   - Consider adding more DIDs to the `SWARM_COMMUNITY_MEMBERS` array.

6. **Create Admin Endpoint**: 
   - Add an endpoint to manually add posts to the database (for testing).

7. ✅ **Create Test Scripts**: 
   - ~~Implement scripts to help diagnose and test the database.~~ **IMPLEMENTED** - Created `check-test-post.js` and `add-test-post.js`.

### Medium-term solutions:
1. **Enhance Firehose Subscription Logic**: Improve error handling and reconnection strategies.
2. **Implement Database Backup Mechanism**: To prevent data loss during deployments.
3. **Add More Logging**: Enhance logging for better visibility into the feed generation process.

### Long-term solutions:
1. **PostgreSQL Migration**: Consider moving from SQLite to PostgreSQL for better reliability and performance.
2. **Enhanced Feed Algorithms**: Develop more sophisticated filtering and ranking algorithms.

## Progress Tracking

| Issue | Date | Attempted Solution | Result | Next Steps |
|-------|------|-------------------|--------|------------|
| Empty Feed | 2023-03-22 | Created diagnostic scripts `check-test-post.js` and `add-test-post.js` | **Done** | Test post creation and database storage |
| DID Resolution | 2023-03-22 | Created middleware in `fix-did.ts` to ensure consistent DIDs | ⚠️ **Partial** | Issue is still occurring; need to update feed generator record and follow deployment checklist |
| Firehose Health | 2023-03-22 | Implemented health endpoint in `server.ts` | In Progress | Test the endpoint |

## Step-by-Step Execution Workflow

### Step 1: Create test post diagnostic tools
**Goal**: Create tools to check if a specific post exists in the database and to manually add a test post if needed.

1. Create script `check-test-post.js` to verify if a specific post exists in the database.
2. Create script `add-test-post.js` to manually add a test post to the database, bypassing the firehose.
3. Make both scripts executable with `chmod +x`.
4. Update the progress tracking table with our work.
5. Commit changes to git.

**Execution Summary**:
- Created `check-test-post.js` to check if a test post exists in the database 
- Created `add-test-post.js` to manually add a test post to the database (bypassing the firehose)
- Made scripts executable with `chmod +x`
- Both scripts focus specifically on the swarm-community feed and include detailed diagnostics
- Updated the progress tracking table
- Committed all changes to git

**Status**: **Done**

### Step 2: Fix DID resolution with middleware
**Goal**: Ensure consistent DIDs are used across the application, specifically for feed URIs.

1. Create middleware in `src/middleware/fix-did.ts` to intercept and fix responses.
2. Add the middleware to the Express app in `src/server.ts`.
3. Update the HTML response to use the service DID.
4. Test feed endpoints to ensure consistent DIDs.
5. Update the progress tracking table.
6. Commit changes to git.

**Execution Summary**:
- Created `fix-did.ts` middleware to ensure consistent DIDs across the application
- Implemented the middleware in `server.ts` to intercept and fix all responses
- Updated HTML responses to use the service DID consistently
- Initial testing seemed to resolve the issue, but it's now recurring
- The middleware implementation alone is insufficient; need to follow deployment checklist and update feed generator record

**Status**: ⚠️ **Incomplete** - Further actions needed

### Step 3: Address recurring DID resolution issues
**Goal**: Implement a more robust solution for the DID resolution issue.

1. Follow the deployment checklist in render-deployment-checklist.md:
   - Log in to Render dashboard 
   - Use "Clear build cache & deploy" option to ensure all changes take effect
2. Run the updateFeedGenDid.js script to update the feed generator record:
   ```
   node swarm-feed-generator/feed-generator/scripts/updateFeedGenDid.js
   ```
3. Verify the feed generator record is updated using checkFeedRecord.js.
4. Test the feed in the Bluesky app to confirm DID resolution is working.

### Step 4: Implement firehose health endpoint
**Goal**: Implement a proper health endpoint for checking the firehose connection status.

1. Add a `/health/firehose` endpoint in `src/server.ts`.
2. Ensure the endpoint returns the connection status of the firehose.
3. Add methods to `FirehoseSubscription` class to check connection status.
4. Test the endpoint with `curl`.
5. Update the progress tracking table.
6. Commit changes to git.

### Step 5: Expand community members list
**Goal**: Ensure the community members list is comprehensive and includes test accounts.

1. Update `src/swarm-community-members.ts` to include more DIDs.
2. Test the feed with posts from these members.
3. Update the progress tracking table.
4. Commit changes to git.

### Step 6: Final verification
**Goal**: Verify all changes are working together to fix the feed.

1. Restart the feed generator service.
2. Create a new test post.
3. Verify it appears in the feed.
4. Document findings and any remaining issues.
5. Update the progress tracking table.
6. Commit changes to git. 