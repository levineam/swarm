# Feed Generator Debugging Guide

## Overview

This document focuses specifically on debugging the Swarm Feed Generator. It provides a systematic approach to diagnosing and fixing issues with the feed generator, particularly focused on the problem of posts not appearing in feeds despite successful DID resolution.

## Current Issues

1. **DID Resolution Issue**:
   - The Bluesky app displays an error: "could not resolve identity: did:web:swarm-feed-generator.onrender.com"
   - This issue recurs periodically despite being temporarily fixed
   - Root cause is mismatched DIDs in feed URIs

2. **Empty Feed Issue**: 
   - The feed interface loads properly with no DID resolution errors
   - No posts are displayed in the feed
   - The `/xrpc/app.bsky.feed.getFeedSkeleton` endpoint returns an empty feed array `{"feed":[]}`
   - The `/health/firehose` endpoint returns a 404 error

3. **Firehose Connection Issues**:
   - There seems to be a problem with the firehose subscription
   - Endpoint for checking firehose health doesn't exist or isn't responding properly

4. **Limited Community Members**:
   - The `SWARM_COMMUNITY_MEMBERS` array only contains one DID, limiting potential posts

## Step-by-Step Execution

### Step 1: Fix DID Resolution Issue

#### Issue Description
- The Bluesky app displays an error: "could not resolve identity: did:web:swarm-feed-generator.onrender.com"
- Even though the feed generator record exists and DID document seems correctly configured
- This issue recurs periodically despite being temporarily fixed

#### Root Cause Analysis
1. **Mismatched DIDs in Feed URIs**: 
   - The feed URIs in the `describeFeedGenerator` response use the publisher DID (`did:plc:ouadmsyvsfcpkxg3yyz4trqi`) 
   - Instead of consistently using the service DID (`did:web:swarm-feed-generator.onrender.com`)

2. **Code vs. Production Discrepancy**:
   - The code in `src/methods/describe-generator.ts` is correctly configured to use `ctx.cfg.serviceDid` for feed URIs:
     ```typescript
     // IMPORTANT: Use the service DID for feed URIs to ensure consistency
     // This ensures that the DID used in the response matches the DID used in the feed URIs
     const didToUse = ctx.cfg.serviceDid
     ```
   - But the deployed version still returns feed URIs with the publisher DID
   - The reference implementation uses `ctx.cfg.publisherDid` instead of `ctx.cfg.serviceDid`

3. **Deployment Issue**:
   - The most likely explanation is that the latest code isn't deployed to Render properly
   - This could be due to build caching or incomplete deployment

4. **Configuration Verification**:
   - Debug endpoint confirms both DIDs are correctly configured:
     ```json
     {
       "config": {
         "serviceDid": "did:web:swarm-feed-generator.onrender.com",
         "publisherDid": "did:plc:ouadmsyvsfcpkxg3yyz4trqi"
       }
     }
     ```

#### Permanent Solutions (FOCUS ON THESE FIRST)

1. **⭐ Deploy with Cleared Cache (PRIMARY SOLUTION)** ⭐:
   - Log in to the Render dashboard and navigate to the feed generator service
   - Select "Clear build cache & deploy" option to ensure the latest code is used
   - This is the most important step as the code fix in `src/methods/describe-generator.ts` is correct but not being applied
   - Monitor deployment logs to ensure successful build and deployment

2. **Add a Validation Layer**:
   - Implement middleware that validates DIDs in all responses before they're returned
   - This would catch and fix any inconsistencies even if the underlying issue persists

3. **Implement Auto-Correction at Startup**:
   - Add code to the server startup process that verifies and corrects feed record DIDs
   - This would effectively run the `updateFeedGenDid.js` script automatically on each restart

#### Temporary Fix (Only if immediate resolution is needed)

If you need immediate resolution while waiting for the deployment with cleared cache:

```bash
cd swarm-feed-generator/feed-generator && node scripts/updateFeedGenDid.js
```

This command updates the feed generator record with the correct service DID and will temporarily fix the DID resolution error. However, this doesn't address the root cause, so the issue will recur until a permanent solution is implemented.

After running this script:
1. Verify the feed appears correctly in the Bluesky app
2. **Important**: Still proceed with the permanent solution (cleared cache deployment)

#### Diagnostic Steps
1. Check DID document:
   ```bash
   curl https://swarm-feed-generator.onrender.com/.well-known/did.json | jq
   ```

2. Check feed generator record in Bluesky PDS:
   ```bash
   cd swarm-feed-generator/feed-generator && node scripts/checkFeedRecord.js
   ```

3. Verify DID and feed URI consistency:
   ```bash
   curl "https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator" | jq
   ```

4. Check feed with both DIDs:
   ```bash
   # With service DID
   curl "https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community"
   
   # With publisher DID
   curl "https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community"
   ```

#### Execution Summary
1. **Primary Action - Deploy with Cleared Cache**:
   - Log in to Render dashboard and deploy with "Clear build cache & deploy" option
   - This ensures the latest code with the correct DID logic is used
   - Verify after deployment that feed URIs now use the service DID

2. **Root Cause Investigation**:
   - Identified that feed URIs in the `describeFeedGenerator` response use the publisher DID instead of the service DID
   - Found the code is correct in `src/methods/describe-generator.ts` but not reflected in the deployed version

3. **If Temporary Fix Was Applied**:
   - The `updateFeedGenDid.js` script may have been used for immediate resolution
   - This is only a stopgap measure until the proper deployment completes

**Done**

### Step 2: Create and Track a Test Post

1. **Create a Test Post**:
   - Create a post from the account matching the DID in `SWARM_COMMUNITY_MEMBERS` (currently `did:plc:ouadmsyvsfcpkxg3yyz4trqi`)
   - Include unique, identifiable content (e.g., "Test post for Swarm feed debugging #swarmtest")
   - Note the post's URI and timestamp

2. **Track the Test Post**:
   - Check if the post appears in the firehose events (through logs)
   - Verify if the post is being stored in the database
   - Test if the post is returned by the feed algorithm
   - This gives us a specific data point to track through the entire system

#### Execution Summary
- Created `check-test-post.js` script to verify if a specific post exists in the database
- Created `add-test-post.js` script to manually add a test post to the database, bypassing the firehose
- Made both scripts executable with `chmod +x`
- Updated the progress tracking table with our work
- Committed all changes to git with a descriptive message
- Created a test post with URI: `at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/3lknkc2zbqm26`
- Successfully added the test post directly to the database
- Verified the post exists in the database but does not appear in the feed
- This suggests the issue is with the feed algorithm or how posts are retrieved from the database

These diagnostic steps helped us identify that:
- The database is functioning correctly and can store posts
- The DID resolution issue has been fixed
- The feed algorithm may not be correctly retrieving posts from the database

**Done**

### Step 3: Implement Firehose Health Endpoint

1. **Implement the `/health/firehose` endpoint**:
   - Add the endpoint to `src/server.ts` as described in the short-term solutions
   - Deploy the changes
   - Test the endpoint to verify it returns the correct status

2. **Investigate Firehose Implementation**:
   - Review `FirehoseSubscriptionBase` class in `src/util/subscription.ts` for connection management
   - Verify that the firehose subscription is started in `FeedGenerator.start()`

## Diagnostic Approach

### 0. Create and Track a Test Post (Recommended First Step)

1. **Create a Test Post**:
   - Create a post from the account matching the DID in `SWARM_COMMUNITY_MEMBERS` (currently `did:plc:ouadmsyvsfcpkxg3yyz4trqi`)
   - Include unique, identifiable content (e.g., "Test post for Swarm feed debugging #swarmtest")
   - Note the post's URI and timestamp

2. **Track the Test Post**:
   - Check if the post appears in the firehose events (through logs)
   - Verify if the post is being stored in the database
   - Test if the post is returned by the feed algorithm
   - This gives us a specific data point to track through the entire system

3. **Benefits of This Approach**:
   - Provides a controlled test case with known data
   - Helps isolate which part of the pipeline is failing
   - Confirms whether the issue is with indexing, storage, or retrieval

### 1. Firehose Connection Testing

1. **Check Firehose Connection Status**:
   ```bash
   curl https://swarm-feed-generator.onrender.com/health/firehose
   ```
   - The current response shows a 404 error, indicating the endpoint doesn't exist or isn't properly implemented

2. **Investigate Firehose Implementation**:
   - Review `src/server.ts` where the firehose health endpoint should be defined
   - Check `FirehoseSubscriptionBase` class in `src/util/subscription.ts` for connection management
   - Verify that the firehose subscription is started in `FeedGenerator.start()`

3. **Verify Database Updates**:
   - Check if posts are being indexed in the database
   - Implement or use existing admin endpoints to query database contents

### 2. Feed Algorithm Testing

1. **Test Feed Endpoint**:
   ```bash
   curl "https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community"
   ```
   - Current response is `{"feed":[]}`, showing no posts available

2. **Review Feed Algorithm Implementation**:
   - Examine `src/algos/swarm-community.ts` for correct implementation
   - Review how it queries the database for posts from community members
   - Check if there are appropriate logging messages to diagnose issues

3. **Test with Expanded Community Members**:
   - Add more DIDs to the `SWARM_COMMUNITY_MEMBERS` array
   - Deploy changes and test again to see if posts appear

### 3. Database Diagnostics

1. **Check Database Schema**:
   - Verify that the `post` table has the correct schema in `src/db/schema.ts`
   - Compare with reference implementation from Bluesky

2. **Query Database Directly**:
   - Implement admin endpoint to query database contents
   - Check if any posts are being stored in the database

3. **Test Database Persistence**:
   - Check if database is properly persisted between service restarts
   - Consider implementing a backup mechanism

## Potential Solutions

### Short-term Solutions

1. **Implement/Fix Firehose Health Endpoint**:
   ```typescript
   // In src/server.ts
   app.get('/health/firehose', (req: express.Request, res: express.Response) => {
     logger.info('Firehose health check called')
     const isConnected = firehose.isFirehoseConnected()
     const lastCursor = firehose.getLastCursor()
     
     if (isConnected) {
       logger.info('Firehose is connected', { lastCursor })
       res.status(200).json({
         status: 'connected',
         lastCursor: lastCursor,
         timestamp: new Date().toISOString()
       })
     } else {
       logger.warn('Firehose is disconnected', { lastCursor })
       res.status(503).json({
         status: 'disconnected',
         lastCursor: lastCursor,
         timestamp: new Date().toISOString()
       })
     }
   })
   ```

2. **Expand Community Members**:
   ```typescript
   // In src/swarm-community-members.ts
   export const SWARM_COMMUNITY_MEMBERS: string[] = [
     'did:plc:ouadmsyvsfcpkxg3yyz4trqi', // andrarchy.bsky.social
     // Add more community member DIDs here
   ]
   ```

3. **Create Admin Endpoint for Manual Post Addition**:
   ```typescript
   // In src/admin/router.ts
   router.post('/add-post', async (req: express.Request, res: express.Response) => {
     const { uri, cid, creator } = req.body
     
     if (!uri || !cid || !creator) {
       return res.status(400).json({ error: 'Missing required fields' })
     }
     
     try {
       await db.insertInto('post').values({
         uri,
         cid,
         creator,
         indexedAt: new Date().toISOString()
       }).execute()
       
       return res.status(200).json({ success: true })
     } catch (error) {
       logger.error('Failed to add post', { error, uri })
       return res.status(500).json({ error: 'Failed to add post' })
     }
   })
   ```

4. **Create a Script to Manually Add a Test Post**:
   ```javascript
   // scripts/add-test-post.js
   const { BskyAgent } = require('@atproto/api');
   const sqlite3 = require('sqlite3');
   const { open } = require('sqlite');
   const path = require('path');
   const fs = require('fs');
   
   async function addTestPost() {
     // First, find the post URI from Bluesky
     const agent = new BskyAgent({ service: 'https://bsky.social' });
     await agent.login({
       identifier: 'andrarchy.bsky.social', // Replace with your username
       password: process.env.BSKY_PASSWORD // Set this environment variable
     });
     
     // Search for your test post
     const search = await agent.app.bsky.feed.searchPosts({ q: 'Test post for Swarm feed debugging #swarmtest' });
     
     if (search.data.posts.length === 0) {
       console.log('Test post not found. Please create one with the specified content first.');
       return;
     }
     
     const testPost = search.data.posts[0];
     console.log(`Found test post: ${testPost.uri}`);
     
     // Now add this post directly to the database
     const dbPath = path.join(process.cwd(), 'swarm-feed.db');
     
     if (!fs.existsSync(dbPath)) {
       console.error(`Database file not found at: ${dbPath}`);
       return;
     }
     
     const db = await open({
       filename: dbPath,
       driver: sqlite3.Database
     });
     
     try {
       // Add the post to the database
       await db.run(
         'INSERT INTO post (uri, cid, creator, indexedAt) VALUES (?, ?, ?, ?)',
         testPost.uri,
         testPost.cid,
         testPost.author.did,
         new Date().toISOString()
       );
       
       console.log('Post added to database successfully');
       
       // Verify it was added
       const post = await db.get('SELECT * FROM post WHERE uri = ?', testPost.uri);
       console.log('Post in database:', post);
     } finally {
       await db.close();
     }
   }
   
   addTestPost().catch(console.error);
   ```

### Medium-term Solutions

1. **Enhance Firehose Subscription**:
   - Add more robust reconnection logic
   - Implement better error handling
   - Add more detailed logging

2. **Implement Database Backup Mechanism**:
   - Regularly backup the database to prevent data loss
   - Implement recovery mechanisms

3. **Add Comprehensive Logging**:
   - Log all firehose events
   - Log database operations
   - Implement monitoring for connection issues

### Long-term Solutions

1. **Migrate to PostgreSQL**:
   - For better persistence and reliability
   - Implement proper migration scripts

2. **Implement Dynamic Community Management**:
   - Create an API for managing community members
   - Implement user interface for community management

3. **Enhance Feed Algorithms**:
   - Implement more sophisticated feed algorithms
   - Add support for personalized feeds

## Testing Procedures

1. **Firehose Connection Test**:
   - Check firehose health endpoint
   - Review logs for connection issues
   - Test reconnection after forced disconnection

2. **Post Indexing Test**:
   - Create a test post from a community member
   - Check if it appears in the database
   - Verify it appears in the feed

3. **Feed Algorithm Test**:
   - Add a known post to the database
   - Check if it appears in the feed
   - Test pagination and sorting

## Reference Materials

1. **Official Bluesky Feed Generator**:
   - Repository: [https://github.com/bluesky-social/feed-generator](https://github.com/bluesky-social/feed-generator)
   - Implementation patterns for comparison

2. **AT Protocol Documentation**:
   - Feed Generator specification
   - Firehose subscription documentation

3. **Monitoring and Debugging Tools**:
   - Render.com logs
   - Custom logging endpoints
   - Database query tools

## Progress Tracking

| Date | Issue | Attempted Solution | Result | Next Steps |
|------|-------|-------------------|--------|------------|
| 2025-03-21 | Empty feed | Investigating firehose connection | Discovered `/health/firehose` 404 error | Implement firehose health endpoint |
| 2025-03-21 | Limited community members | Review of `SWARM_COMMUNITY_MEMBERS` | Found only one DID in the array | Add more community member DIDs |
| 2025-03-21 | Database indexing | Checked feed algorithm implementation | Algorithm looks correct but no posts in DB | Test database directly and implement admin endpoints |
| 2025-03-21 | Test post verification | Planning to create test post from authorized account | Pending | Create test post and track it through the system |
| 2025-03-22 | Test post tools | Created diagnostic scripts | Created `check-test-post.js` and `add-test-post.js` to diagnose post indexing issues | Create a test post and use the scripts to verify database storage and feed retrieval |
| 2025-03-22 | DID resolution issue | Systematically checked feed generator record, DID document and feed URIs | Feed now displays correctly in Bluesky app | Continue with Step 2 to implement firehose health endpoint |
| 2025-03-22 | Test post tracking | Created and tracked a test post through the system | Post successfully added to database but not appearing in feed | Investigate feed algorithm implementation in Step 3 | 