# Swarm Feed Generator Debugging

This document outlines our debugging approach for the Swarm Feed Generator, specifically focusing on the swarm-community feed, which currently shows as empty.

## Current Issues

1. **Empty Feed Issue**: The swarm-community feed is currently showing as empty when accessed via the API.
2. **Firehose Connection Issues**: The health endpoint for the firehose returns a 404 error, suggesting the endpoint isn't properly implemented.
3. **DID Resolution Issues**: ⚠️ **CRITICAL MISUNDERSTANDING IDENTIFIED** - We've been attempting to force everything to use the service DID, when according to AT Protocol specifications, the `describeFeedGenerator` response should use the account DID (`did:plc:ouadmsyvsfcpkxg3yyz4trqi`), not the service DID (`did:web:swarm-feed-generator.onrender.com`).
4. **Limited Community Members**: The `SWARM_COMMUNITY_MEMBERS` array in `src/swarm-community-members.ts` only includes 1 entry, which might be limiting feed content.

## Fundamental DID Issue Correction

**Expert feedback reveals our critical mistake**: We've been trying to solve the DID resolution issue incorrectly.

- **Current incorrect approach**:
  - We've been trying to make everything use the service DID (`did:web:swarm-feed-generator.onrender.com`)
  - Our middleware attempts to replace account DIDs with service DIDs

- **Correct approach per AT Protocol specifications**:
  - The `did` field in `describeFeedGenerator` should be the account's DID (`did:plc:ouadmsyvsfcpkxg3yyz4trqi`)
  - Feed URIs should consistently use this same account DID
  - The service DID is primarily for the DID document and service identification

This insight completely changes our approach to fixing the DID resolution issue.

## Diagnostic Approach

We'll use a systematic approach to diagnose and fix these issues:

### Step 1: Correct DID Implementation
**Goal**: Implement the correct DID usage according to AT Protocol specifications.

#### Corrective Steps:
1. Update the `describeFeedGenerator` endpoint to consistently use the account DID:
   ```javascript
   const accountDid = 'did:plc:ouadmsyvsfcpkxg3yyz4trqi';
   // Use accountDid in describeFeedGenerator responses
   ```

2. Verify feed generator responses:
   ```
   curl -s https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator | jq
   ```
   - The `did` field should be `did:plc:ouadmsyvsfcpkxg3yyz4trqi`
   - Feed URIs should consistently use this same account DID

3. Add cache-busting headers to force revalidation:
   ```
   Cache-Control: no-cache
   ```

**Benefit**: This will align our implementation with AT Protocol specifications and resolve the DID resolution errors.

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
   curl https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community
   ```
   
   Note: We're now using the account DID in the feed URI as per AT Protocol specifications.

**Benefit**: This will ensure the algorithm is correctly filtering for community members.

### Step 5: Database Diagnostics
**Goal**: Verify the database is properly storing and indexing posts.

1. Check the database schema and indexes.
2. Look for any errors in the post insertion process.
3. Verify the `post` table contains entries.

**Benefit**: This will help identify any database-related issues.

## Revised Solutions Based on Expert Feedback

### Short-term solutions:
1. **Correct DID Implementation**: 
   - Update the `describeFeedGenerator` endpoint to use the account DID (`did:plc:ouadmsyvsfcpkxg3yyz4trqi`)
   - Ensure feed URIs consistently use this same account DID
   - Modify or remove our middleware that was incorrectly trying to use the service DID everywhere

2. **Add Cache-Busting Headers**:
   - Add `Cache-Control: no-cache` headers to the DID document response
   - This will force clients to revalidate and avoid cached resolution failures

3. **Update Feed Generator Record**:
   - Verify that the feed generator record in the Bluesky PDS has the correct configuration
   - Run the `checkFeedRecord.js` script to verify the current state

4. **Proper Deployment Process**: 
   - Follow the render-deployment-checklist.md including the "Clear build cache & deploy" option
   - This ensures all code changes take effect

5. **Implement Firehose Health Endpoint**: 
   - Add a proper health endpoint in `src/server.ts` to monitor the firehose connection.

6. **Expand Community Members**: 
   - Consider adding more DIDs to the `SWARM_COMMUNITY_MEMBERS` array.

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
| DID Resolution | 2023-03-22 | Created middleware in `fix-did.ts` to ensure consistent DIDs | ⚠️ **Incorrect Approach** | Reverse approach - need to use account DID consistently, not service DID |
| DID Resolution | 2023-03-23 | Received expert feedback identifying our misconception | **Insight Gained** | Update implementation to use account DID in describeFeedGenerator |
| DID Resolution | 2023-03-24 | Implemented correct DID approach in `describe-generator.ts` and `server.ts` | **Done** | Deploy changes and verify with DID resolution test |
| DID Resolution | 2023-03-25 | Deploy code changes to Render.com and update feed generator record | **In Progress** | Test DID resolution in client application |
| Firehose Health | 2023-03-22 | Implemented health endpoint in `src/server.ts` | In Progress | Test the endpoint |

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

### Step 2: Fix DID resolution with middleware (INCORRECT APPROACH)
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
- Initial testing seemed promising, but the issue persisted
- **Critical realization**: Our approach was fundamentally incorrect - we were trying to make everything use the service DID when it should be using the account DID

**Status**: ❌ **Incorrect Approach** - Need to change direction based on expert feedback

### Step 3: Implement correct DID usage
**Goal**: Update implementation to use the account DID in `describeFeedGenerator` and feed URIs.

1. Modify or remove the middleware that was incorrectly trying to use the service DID:
   - Update `src/middleware/fix-did.ts` to ensure account DID consistency instead
   - Or remove it if it's no longer needed with the correct approach

2. Update the `describeFeedGenerator` implementation:
   ```javascript
   const accountDid = 'did:plc:ouadmsyvsfcpkxg3yyz4trqi';
   
   // In the describeFeedGenerator response:
   {
     did: accountDid,
     feeds: [
       {
         uri: `at://${accountDid}/app.bsky.feed.generator/swarm-community`,
         // other properties
       }
     ]
   }
   ```

3. Add cache-busting headers to force revalidation:
   ```javascript
   res.set('Cache-Control', 'no-cache');
   ```

4. Deploy changes to production using "Clear build cache & deploy" in Render.

5. Verify correct implementation:
   ```bash
   curl -s https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator | jq
   ```

**Execution Summary**:
- Updated `describe-generator.ts` to consistently use the account DID (publisher DID) for both the `did` field and feed URIs
- Removed the incorrect `fixFeedUris` middleware from `server.ts` that was trying to replace publisher DIDs with service DIDs
- Added cache-busting headers in `server.ts` to force revalidation with `Cache-Control: no-cache, no-store, must-revalidate`
- Updated the direct test endpoint in `server.ts` to use the publisher DID in responses
- Modified the root path handler in `server.ts` to display feed URIs with the publisher DID
- Updated diagnostics scripts like `check-feed-uris.js` and `checkFeedRecord.js` to verify correct DID usage
- Committed all changes to git with a clear message explaining the updated approach
- The next step is to deploy these changes to production with "Clear build cache & deploy" option

**Status**: **Done**

### Step 3.5: Deploy DID Implementation Changes
**Goal**: Deploy our code changes to production and update the feed generator record.

#### Deployment Steps:

1. **Deploy Code Changes to Render.com**:
   - Log in to Render.com
   - Navigate to the Swarm Feed Generator service
   - Navigate to the "Settings" tab
   - Click on "Clear build cache" to ensure all previous build artifacts are removed
   - Return to the "Dashboard" tab
   - Click "Manual Deploy" > "Clear build cache & deploy"
   - Monitor the deployment logs for any errors

2. **Verify Deployment**:
   - Check if the `describeFeedGenerator` endpoint is correctly using the publisher DID:
     ```
     curl -s https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator | jq
     ```
   - Verify the cache-busting headers:
     ```
     curl -I https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
     ```
   - Run the feed URI check script:
     ```
     node scripts/check-feed-uris.js
     ```

3. **Update Feed Generator Record in Bluesky**:
   - Update the feed generator record to use the publisher DID:
     ```
     node scripts/updateFeedGenDid.js
     ```
   - Verify the update:
     ```
     node scripts/checkFeedRecord.js
     ```

4. **Test in Client Application**:
   - Access the Swarm Social client application
   - Try to view the Swarm Community feed
   - Verify that the feed is resolved correctly without "could not resolve identity" errors

#### Rollback Plan

If issues occur after deployment:

1. **Identify the issue**:
   - Check the Render.com logs for any errors
   - Run the diagnostic scripts to verify the current state

2. **If DID inconsistency persists**:
   - Review the deployed code to ensure changes were applied
   - Check for any environment variables that might be overriding the code changes
   - Verify the feed generator record was updated correctly

3. **If necessary, roll back**:
   - Revert to the previous commit
   - Deploy with "Clear build cache & deploy"
   - Document the issue encountered for further analysis

#### Post-Deployment

After successful deployment:

1. Update the debugging documentation with the results
2. Move on to the next steps in our debugging plan
3. Monitor for any recurring issues

#### Notes and Recommendations

- **Client Caching**: Even after deployment, some clients might still cache the old responses. Users might need to:
  - Clear their browser cache
  - Restart the client application
  - Wait for cache expiration (our cache-busting headers should help with this)

- **DID Record Consistency**: Ensure the feed generator record is consistent with our implementation to avoid future issues.

**Current Status**: Our code changes have been committed but not yet deployed to production. According to our diagnostic checks:
- The feed URIs in responses correctly use the publisher DID
- The `did` field in responses still incorrectly uses the service DID
- The feed generator record in Bluesky still incorrectly uses the service DID

**Expected Result**: After completing this step, all DIDs should be consistently using the publisher DID as per AT Protocol specifications.

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