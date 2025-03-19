# Swarm Feed Generator Debugging

This document outlines our debugging approach for the Swarm Feed Generator, specifically focusing on the swarm-community feed, which currently shows as empty.

## Current Issues

1. **Empty Feed Issue**: ⚠️ PARTIALLY RESOLVED - The swarm-community feed no longer shows DID resolution errors, but currently appears empty which requires further investigation.
2. **Firehose Connection Issues**: ⚠️ ACTIVE INVESTIGATION - While the firehose connection is established, posts aren't being recognized as coming from community members.
3. **DID Resolution Issues**: ⚠️ RECURRING ISSUE - After initial resolution, the DID resolution error has reappeared and required additional fixes.
4. **Limited Community Members**: ⚠️ PENDING - The `SWARM_COMMUNITY_MEMBERS` array in `src/swarm-community-members.ts` only includes 1 entry, but this may not be the root cause.
5. **Database Issues**: ✅ CLARIFIED - The swarm-feed-generator service is not on the free tier and has persistent storage, so database resets are not the issue.

## Important Service Distinction

We've identified a critical distinction between our two services:

1. **swarm-feed-generator**: 
   - Not on the free tier
   - Has persistent database storage
   - Primary focus for debugging as it handles post processing
   - Critical service that needs to function properly

2. **swarm-social**:
   - On the free tier
   - No need for persistent storage
   - Front-end application only
   - Database resets between deployments are not a concern

This distinction has helped narrow our focus to the feed generator's ability to process posts from the firehose, rather than database persistence issues.

## Revised Analysis

Based on the logs and service configuration, we've identified these likely issues:

1. **Firehose Event Processing**:
   - Firehose connection is established and receiving events
   - Logs show "Found 0 posts from community members"
   - Issue likely in the post filtering logic
   - Need to investigate `handleEvent` method in `subscription.ts`

2. **DID Recognition Issue**:
   - Your DID (`did:plc:ouadmsyvsfcpkxg3yyz4trqi`) is in `SWARM_COMMUNITY_MEMBERS`
   - Possible format mismatch in community member comparison
   - Need to verify DID comparison logic

3. **Post Processing Pipeline**:
   - Posts are visible in the firehose
   - Test posts are not being recognized as community posts
   - Need to validate the filtering logic

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

### Step 4: Implement Robust Database Initialization
**Goal**: Ensure the database is properly initialized with the required tables and indexes.

1. Create a dedicated database initialization script:
   ```javascript
   // scripts/init-db.js
   const sqlite3 = require('sqlite3').verbose();
   const path = require('path');

   // Set up the database path
   const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'swarm-feed.db');
   const sqlitePath = dbPath.replace('sqlite:', '');

   // Open the database and create tables
   const db = new sqlite3.Database(sqlitePath);
   
   db.serialize(() => {
     // Create post table
     db.run(`CREATE TABLE IF NOT EXISTS post (
       uri TEXT PRIMARY KEY,
       cid TEXT NOT NULL,
       indexedAt TEXT NOT NULL,
       creator TEXT NOT NULL
     )`);

     // Create sub_state table
     db.run(`CREATE TABLE IF NOT EXISTS sub_state (
       service TEXT PRIMARY KEY,
       cursor INTEGER NOT NULL
     )`);

     // Create indexes
     db.run(`CREATE INDEX IF NOT EXISTS idx_creator ON post(creator)`);
     db.run(`CREATE INDEX IF NOT EXISTS idx_indexedAt ON post(indexedAt)`);
     db.run(`CREATE INDEX IF NOT EXISTS idx_creator_indexedAt ON post(creator, indexedAt)`);
   });

   db.close();
   ```

2. Make the script executable:
   ```bash
   chmod +x scripts/init-db.js
   ```

3. Update `package.json` to run the initialization script during build and startup:
   ```json
   "start": "node scripts/ensure-did-document.js && node scripts/check-render-deployment.js && node scripts/modify-server-on-startup.js && node scripts/init-db.js && ts-node src/index.ts",
   "postbuild": "node scripts/copy-did-document.js && node scripts/ensure-did-document.js && node scripts/update-did-document.js && node scripts/add-xrpc-endpoints.js && node scripts/init-db.js",
   ```

4. Push changes and deploy to Render.com.

5. Verify database initialization in the deployment logs.

**Benefit**: This ensures the database is properly initialized on each deployment, solving issues where the migration system fails to create the necessary tables.

### Step 5: Review Feed Algorithm Implementation
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

### Step 6: Investigate Firehose Event Processing ⚠️ IN PROGRESS
**Goal**: Verify if the firehose is properly connected and receiving events.

1. Implement a proper `/health/firehose` endpoint in `src/server.ts`.
2. Check firehose connection status using: 
   ```
   curl https://swarm-feed-generator.onrender.com/health/firehose
   ```
3. Examine the firehose implementation in `src/server.ts` and `src/util/subscription.ts`.

**Benefit**: This will help determine if the issue is with the firehose connection itself.

### Step 7: Fixing Recurring DID Resolution Issue ⚠️ IN PROGRESS
**Goal**: Fix the recurring "could not resolve identity: did:web:swarm-feed-generator.onrender.com" error.

**Background**: The error reappeared in the Swarm social app despite our previous fixes. Render.com logs showed 405 "Method Not Allowed" errors which indicated potential issues with HTTP method handling for the DID document endpoint.

**Investigation**:

1. **Verified DID Document Accessibility**:
   - Confirmed `.well-known/did.json` is accessible via HTTPS
   - Verified that the feed generator description endpoint is functioning correctly

2. **Identified DID Document Issues**:
   - Found inconsistencies in service type naming (`AtprotoFeedGenerator` vs. `BskyFeedGenerator`)
   - Discovered that cache-control headers were not being applied consistently
   - Found that multiple places in the codebase were using different service identifiers

**Solution Implemented**:

1. **Updated DID Document Template**:
   - Changed service type from `AtprotoFeedGenerator` to `BskyFeedGenerator`
   - Changed service ID from `#atproto_feed_generator` to `#bsky_fg`
   - Standardized all service references in codebase

2. **Improved Caching Prevention**:
   - Added comprehensive cache-busting headers (`Cache-Control: no-cache, no-store, must-revalidate`) to all DID document endpoints
   - Applied cache control headers at middleware level to ensure they are applied consistently

3. **Created New Comprehensive DID Update Script**:
   - Developed `update-all-did-documents.js` to ensure all DID documents are consistently updated
   - Updated all possible DID document locations including compiled versions
   - Updated HTML template with embedded DID document for failsafe access

4. **Updated Build Process**:
   - Modified `package.json` scripts to use the new comprehensive DID update script
   - Ensured the script runs during both build and startup to guarantee consistency

**Next Steps**:
1. Deploy the updated code to Render.com
2. Verify that the DID resolution issue is resolved in the Swarm social app
3. Continue with the investigation of the feed content issue

### Step 8: Comprehensive Approach to Persistent DID Resolution Issue ⚠️ NEW
**Goal**: Implement a more systematic approach to finally resolve the recurring DID resolution issues.

**Background**: Despite multiple fix attempts, the "could not resolve identity: did:web:swarm-feed-generator.onrender.com" error continues to occur intermittently. This suggests we need a more comprehensive approach that addresses potential root causes we may have missed previously.

**New Analysis**:

1. **DID Document and Feed URI Mismatch**: 
   - A critical insight from our analysis is that there may be inconsistencies between the service DID (`did:web:swarm-feed-generator.onrender.com`) and the publisher DID (`did:plc:ouadmsyvsfcpkxg3yyz4trqi`) used in feed URIs.
   - The AT Protocol may require consistent DID usage between the DID document and feed references.

2. **HTTP Method Handling**: 
   - The 405 "Method Not Allowed" errors suggest that some HTTP methods required by the AT Protocol's resolution process are not being properly handled.
   - The DID document endpoints need to support GET, HEAD, and OPTIONS methods.

3. **Caching at Multiple Levels**:
   - Despite our cache-control headers, caching might still be occurring at various levels (browser, CDN, Bluesky client).
   - We need a more aggressive approach to cache invalidation.

4. **Multiple DID Document Sources**:
   - With multiple endpoints serving the DID document, inconsistencies could exist between them.
   - We need to ensure all DID document endpoints return identical content.

**Comprehensive Solution Plan**:

1. **Full DID Document Audit**:
   - Create a script to verify that all DID document endpoints return identical, correctly formatted content.
   - Test both `/.well-known/did.json` and `/did.json` endpoints.
   - Ensure all endpoints include proper cache-control headers.

2. **HTTP Method Support Verification**:
   - Implement explicit support for all HTTP methods (GET, HEAD, OPTIONS) on the DID document endpoints.
   - Create a test script to verify that all methods are properly handled without 405 errors.

3. **DID and Feed URI Alignment**:
   - Update `describe-generator.ts` to consistently use the service DID for feed URIs.
   - Modify `feed-generation.ts` to accept both service and publisher DIDs for backward compatibility.
   - Implement a verification step in the build process to ensure DID consistency.

4. **Force Complete Redeployment**:
   - After implementing the changes, clear build caches and force a complete redeployment of both the feed generator and the social app.
   - This ensures all components are using the updated code with consistent DID handling.

5. **DID Resolution Verification Framework**:
   - Create a comprehensive DID resolution verification script that tests:
     - Service DID resolution (using the AT Protocol client)
     - Feed URI resolution with both service and publisher DIDs
     - DID document format validation
   - Run this verification after each deployment to confirm resolution is working correctly.

**Implementation Details**:

1. **DID Audit Script** (`scripts/audit-did-documents.js`):
   ```javascript
   const axios = require('axios');
   
   async function auditDidDocuments() {
     const endpoints = [
       'https://swarm-feed-generator.onrender.com/.well-known/did.json',
       'https://swarm-feed-generator.onrender.com/did.json'
     ];
     
     let referenceDocument = null;
     
     for (const endpoint of endpoints) {
       try {
         const response = await axios.get(endpoint);
         console.log(`${endpoint}:`);
         console.log(`  Status: ${response.status}`);
         console.log(`  Headers: ${JSON.stringify(response.headers, null, 2)}`);
         
         // Store first response as reference
         if (!referenceDocument) {
           referenceDocument = response.data;
           console.log(`  Content: ${JSON.stringify(response.data, null, 2)}`);
         } else {
           // Compare with reference
           const isIdentical = JSON.stringify(response.data) === JSON.stringify(referenceDocument);
           console.log(`  Identical to reference: ${isIdentical}`);
           if (!isIdentical) {
             console.log(`  Content: ${JSON.stringify(response.data, null, 2)}`);
           }
         }
       } catch (error) {
         console.log(`${endpoint}:`);
         console.log(`  Error: ${error.message}`);
       }
     }
   }
   
   auditDidDocuments();
   ```

2. **HTTP Method Test Script** (`scripts/test-did-http-methods.js`):
   ```javascript
   const axios = require('axios');
   
   async function testHttpMethods() {
     const endpoints = [
       'https://swarm-feed-generator.onrender.com/.well-known/did.json',
       'https://swarm-feed-generator.onrender.com/did.json'
     ];
     
     const methods = ['get', 'head', 'options'];
     
     for (const endpoint of endpoints) {
       console.log(`Testing ${endpoint}:`);
       
       for (const method of methods) {
         try {
           const response = await axios[method](endpoint);
           console.log(`  ${method.toUpperCase()}: ${response.status}`);
         } catch (error) {
           console.log(`  ${method.toUpperCase()}: ERROR - ${error.message}`);
         }
       }
     }
   }
   
   testHttpMethods();
   ```

3. **DID Resolution Verification Script** (`scripts/verify-did-resolution.js`):
   ```javascript
   const { BskyAgent } = require('@atproto/api');
   
   async function verifyDidResolution() {
     const agent = new BskyAgent({ service: 'https://bsky.social' });
     
     try {
       // Test service DID resolution
       console.log('Testing service DID resolution...');
       const serviceDid = 'did:web:swarm-feed-generator.onrender.com';
       const serviceDidDoc = await agent.resolveHandle({ handle: serviceDid });
       console.log('Service DID resolved successfully:', serviceDidDoc);
       
       // Test feed URI resolution with service DID
       console.log('\nTesting feed URI resolution with service DID...');
       const feedUriService = 'at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community';
       try {
         const feedService = await agent.app.bsky.feed.getFeedSkeleton({ feed: feedUriService });
         console.log('Feed URI with service DID resolved successfully!');
       } catch (e) {
         console.error('Feed URI with service DID resolution failed:', e.message);
       }
       
       // Test feed URI resolution with publisher DID
       console.log('\nTesting feed URI resolution with publisher DID...');
       const feedUriPublisher = 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community';
       try {
         const feedPublisher = await agent.app.bsky.feed.getFeedSkeleton({ feed: feedUriPublisher });
         console.log('Feed URI with publisher DID resolved successfully!');
       } catch (e) {
         console.error('Feed URI with publisher DID resolution failed:', e.message);
       }
     } catch (error) {
       console.error('Error:', error.message);
     }
   }
   
   verifyDidResolution();
   ```

**Next Steps**:
1. Implement the verification scripts and run them to establish a baseline of the current state.
2. Update the feed generator code to ensure DID and feed URI consistency.
3. Clear build caches and redeploy both services on Render.com.
4. Run the verification scripts again to confirm the fixes have resolved the issues.
5. Document the results and any remaining issues in this debugging document.

## Current Status and Next Steps

### Current Status:
1. **DID Resolution Issues**: ✅ RESOLVED - Implemented a comprehensive fix for the "could not resolve identity: did:web:swarm-feed-generator.onrender.com" error
   - Fixed DID and feed URI alignment to use serviceDid consistently
   - Enhanced HTTP method support for GET, HEAD, and OPTIONS
   - Improved cache control with aggressive cache-busting
   - Created verification tools to confirm proper resolution
   - Successfully deployed and tested in production

2. **Logger Implementation**: ✅ COMPLETED
3. **Database Initialization**: ✅ RESOLVED
4. **Feed Content**: ⚠️ ACTIVE INVESTIGATION - Can proceed now that DID resolution is fixed
5. **Diagnostic Tools**: ✅ COMPLETED - Created a comprehensive set of diagnostic scripts to help troubleshoot issues

### Diagnostic Tools Created

To facilitate debugging of the feed content issues, we've developed the following diagnostic tools:

1. **`trace-post.js`**: Traces a post through the entire system to identify exactly where it might be getting lost in the pipeline.
   ```bash
   cd feed-generator
   node scripts/trace-post.js at://did:plc:abcdefg123456/app.bsky.feed.post/12345
   ```
   This script:
   - Verifies the post exists in Bluesky
   - Checks if the post is in the database
   - Verifies if the author is a community member
   - Checks if the post appears in the feed
   - Provides a comprehensive diagnosis and recommended actions

2. **`analyze-db.js`**: Generates a detailed database analysis report to understand database health and content.
   ```bash
   cd feed-generator
   node scripts/analyze-db.js
   ```
   This script produces a markdown report with:
   - Overall database statistics
   - Analysis of community member posts
   - Post distribution over time
   - List of top post creators
   - Recent post samples

3. **`manual-add-post.js`**: Manually adds posts to the database when the firehose misses them.
   ```bash
   cd feed-generator
   node scripts/manual-add-post.js at://did:plc:abcdefg123456/app.bsky.feed.post/12345
   ```

4. **`add-community-member.js`**: Adds a new community member to the SWARM_COMMUNITY_MEMBERS array.
   ```bash
   cd feed-generator
   node scripts/add-community-member.js did:plc:abcdefg123456 username.bsky.social
   ```

These scripts are documented in `feed-generator/scripts/README.md` and provide a comprehensive approach to identifying and resolving feed content issues.

### Comprehensive DID Resolution Fix Details

#### Identified Root Causes
After thorough analysis, we identified several root causes for the persistent DID resolution issues:

1. **DID and Feed URI Inconsistency**: The feed generator was using `publisherDid` in the feed URIs but `serviceDid` for the DID document, causing resolution conflicts.

2. **HTTP Method Handling**: The DID document endpoints didn't properly support the HEAD and OPTIONS methods required by the AT Protocol's resolution process, resulting in 405 errors.

3. **Cache Control Issues**: Despite cache-control headers, caching at various levels was preventing updates from being recognized.

4. **Multiple DID Document Sources**: Inconsistencies between DID document endpoints led to resolution problems.

#### Changes Implemented

1. **Fixed DID and Feed URI Alignment**:
   - Updated `describe-generator.ts` to consistently use the service DID for both the `did` field and feed URIs
   - Modified comments to explain the correct approach

2. **Enhanced HTTP Method Support**:
   - Updated `well-known.ts` to explicitly handle GET, HEAD, and OPTIONS methods
   - Added proper CORS headers for OPTIONS responses
   - Created a shared handler function to ensure consistent behavior
   - Added support for both `/.well-known/did.json` and `/did.json` endpoints

3. **Improved Cache Control**:
   - Set cache-control headers consistently across all endpoints
   - Added proper content-type headers to ensure correct interpretation

4. **Created Comprehensive Verification Tools**:
   - `audit-did-documents.js`: Verifies consistency across DID document endpoints
   - `test-did-http-methods.js`: Tests HTTP method support
   - `verify-did-resolution.js`: Verifies DID resolution with the AT Protocol client
   - `run-verification.sh`: All-in-one script to run all verification steps

5. **Improved Logging**:
   - Replaced console.log with structured logger
   - Added detailed logging for all DID-related operations
   - Included method information in logs

#### Long-term Maintenance

1. **Ongoing Verification**:
   - Run the verification scripts periodically to ensure continued proper operation
   - Add these checks to the CI/CD pipeline

2. **Documentation Updates**:
   - Update all documentation to reflect the correct approach to DID usage
   - Ensure new developers understand the importance of consistent DID handling

3. **Code Reviews**:
   - Add explicit checks for DID consistency in code reviews
   - Ensure all HTTP methods are properly supported in new endpoint additions

### Next Steps:

1. **Debug Firehose Processing with New Diagnostic Tools**:
   - Run the database analysis to understand current state:
     ```bash
     cd feed-generator
     node scripts/analyze-db.js
     ```
   - Create a test post on Bluesky with a distinctive hashtag like #swarmtest
   - Use the trace-post script to identify where it's getting lost:
     ```bash
     node scripts/trace-post.js <your-post-uri>
     ```
   - Based on results, either manually add the post or add the author to community members

2. **Enhanced Subscription Logging**:
   - Added enhanced logging to `subscription.ts`
   - Log community member detection with detailed comparison information
   - Track post author DIDs through the system

3. **Test with Manual Post Addition**:
   - If posts aren't being captured by the firehose, manually add them:
     ```bash
     node scripts/manual-add-post.js <post-uri>
     ```
   - Verify the post appears in the feed after addition

4. **Expand Community Members**:
   - Once confirming the pipeline works, add more DIDs to the `SWARM_COMMUNITY_MEMBERS` array:
     ```bash
     node scripts/add-community-member.js <new-did> <handle>
     ```
   - This will increase the content in the feed once we know the system is working

5. **Consider PostgreSQL Migration**:
   - If SQLite continues to cause issues on Render's free tier, plan for migration to PostgreSQL
   - This would provide better reliability and persistence between restarts

6. **Documentation and Monitoring**:
   - Complete this debugging document with all findings
   - Document best practices for future development
   - Set up regular monitoring using the diagnostic tools

### Expected Results:
- A properly functioning feed generator that consistently resolves and displays posts
- A growing collection of community posts in the feed
- Clear documentation for future development and troubleshooting 
- Systematic approach to diagnosing any future issues 