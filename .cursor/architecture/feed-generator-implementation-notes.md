# Feed Generator Implementation Notes

## Overview

The Swarm Feed Generator is a custom feed generator for the Swarm app, which is a Bluesky client. The feed generator is deployed on Render.com and provides two custom feeds:

1. **Swarm Community Feed**: A feed of posts from Swarm community members
2. **Swarm Trending Feed**: A feed of trending posts from the Swarm community

The feed generator is built using Node.js and Express, and it uses the AT Protocol libraries to interact with the Bluesky API.

## Current Status

- The feed generator service is deployed on Render.com at https://swarm-feed-generator.onrender.com
- The feed generator is fully operational with a user-friendly landing page that provides information about the available feeds and endpoints
- All XRPC endpoints (`app.bsky.feed.getFeedSkeleton` and `app.bsky.feed.describeFeedGenerator`) are working correctly
- The root path handler has been successfully implemented and is serving a well-designed landing page
- **Update (March 15, 2025)**: We have successfully fixed the DID document issue by updating the service type to "BskyFeedGenerator" and the service ID to "#bsky_fg". The Swarm Social client application (https://swarm-social.onrender.com) is no longer showing the "invalid feed generator service details in did document" error.
- **Update (March 13, 2025)**: We have completed a comprehensive update of all references from `swarm-social.onrender.com` to `swarm-feed-generator.onrender.com`, fixing misconfigurations in the DID document, server endpoints, and service references. Progress has been made with some endpoints now working (health, describeFeedGenerator, getFeedSkeleton), but we still need to fix issues with the debug endpoint, DID document serving, and XRPC root endpoints.
- **Update (March 16, 2025)**: We have clarified the domain usage throughout the codebase, ensuring that `swarm-feed-generator.onrender.com` is used for feed generator service references and `swarm-social.onrender.com` is used for the main Swarm web application references.
- **Update (March 17, 2025)**: We have successfully resolved the "could not resolve identity: did:web:swarm-feed-generator.onrender.com" error. The Swarm Social client application is now fully functional and able to properly connect to the feed generator service. Users can now access the application without any DID resolution errors. The empty feed state is correctly displayed with prompts to find accounts to follow and discover custom feeds.
- **Update (March 18, 2025)**: We have identified and addressed issues with the firehose subscription that were preventing posts from appearing in the Swarm Community feed. We've implemented an admin endpoint for manually updating the feed and created a suite of troubleshooting scripts to diagnose and fix common issues. A comprehensive troubleshooting guide has been created to document these solutions.
- **Update (March 19, 2025)**: We have upgraded the feed generator service to a paid tier on Render, which eliminates hibernation issues and provides persistent storage. This has significantly improved the reliability of the feed generator, ensuring that the firehose subscription remains stable and posts are properly indexed. We've also implemented a GitHub Actions workflow to run the `auto-add-community-posts.js` script hourly as a backup mechanism to ensure posts appear in the feed even if there are issues with the feed algorithm.
- **Update (March 20, 2025)**: We have confirmed that the feed generator is now reliably indexing posts from community members. The admin endpoint for manually adding posts to the feed (`/admin/update-feed`) has proven to be an effective tool for ensuring posts appear in the feed. We've documented the process for using this endpoint in the troubleshooting guide and created scripts to automate post addition. The upgrade to a paid tier on Render has eliminated the hibernation and database persistence issues that were previously affecting the service.

## DID Resolution and Feed Reliability Implementation Plan

Based on our analysis of the current issues, we've developed a comprehensive step-by-step plan to resolve the DID resolution errors and improve feed reliability. This plan follows the Step-by-Step Execution Workflow methodology for systematic implementation.

### Step 1: Fix DID Resolution Issues

**Problem**: Users are experiencing "could not resolve identity: did:web:swarm-feed-generator.onrender.com" errors when trying to access the feed.

**Actions**:

1. Run the diagnostic script to check feed URIs:
   ```bash
   ./scripts/check-feed-uris.js
   ```

2. Fix code inconsistencies in the feed generator:
   - Update `describe-generator.ts` to use `ctx.cfg.serviceDid` instead of `ctx.cfg.publisherDid`:
     ```typescript
     const feeds = Object.keys(algos).map((shortname) => ({
       uri: AtUri.make(
         ctx.cfg.serviceDid,  // Use serviceDid, not publisherDid
         'app.bsky.feed.generator',
         shortname,
       ).toString(),
     }))
     ```
   - Modify `feed-generation.ts` to accept both service and publisher DIDs for backward compatibility:
     ```typescript
     if (
       (feedUri.hostname !== ctx.cfg.serviceDid && feedUri.hostname !== ctx.cfg.publisherDid) ||
       feedUri.collection !== 'app.bsky.feed.generator' ||
       !algo
     ) {
       // handle error
     }
     ```

3. Deploy the fixes to Render:
   - Commit and push changes to GitHub
   - Verify that Render automatically deploys the updated code

4. Update the feed record using the `publishFeedGen.ts` script to ensure consistency:
   ```bash
   npx ts-node scripts/publishFeedGen.ts
   ```

**Expected Outcome**: The "could not resolve identity" error should be resolved, and users should be able to access the feed in the Bluesky app.

### Step 2: Address GitHub Action Failures

**Problem**: The "Auto-Add Community Posts" GitHub Action is failing with npm dependency installation errors.

**Actions**:

1. Review the failing GitHub Action:
   - Examine the `auto-add-community-posts.yml` file
   - Identify the specific npm dependency issues

2. Update the GitHub Action:
   - Since we're planning to phase out this manual workaround, rename or disable the file:
     ```bash
     git mv .github/workflows/auto-add-community-posts.yml .github/workflows/auto-add-community-posts.yml.disabled
     ```
   - Create an issue in the repository documenting this change

3. For short-term reliability (if needed):
   - Update the workflow file to use a specific Node.js version
   - Add a package-lock.json file to ensure consistent dependencies

**Expected Outcome**: The failing GitHub Action should be properly disabled or fixed, with clear documentation about the change.

### Step 3: Ensure Firehose Connection Reliability

**Problem**: The firehose connection may be unstable, causing posts to not appear in the feed.

**Actions**:

1. Verify the firehose health endpoint:
   ```bash
   curl https://swarm-feed-generator.onrender.com/health/firehose
   ```

2. Implement or update the firehose monitoring script:
   - Ensure `track-firehose-cursor.js` is properly configured
   - Set up regular monitoring to track firehose connection status

3. Review reconnection logic in the feed generator:
   - Verify that exponential backoff is correctly implemented
   - Check cursor tracking for proper resumption after disconnection
   - Ensure proper error handling and logging

**Expected Outcome**: The firehose connection should be stable and reliable, with proper monitoring and reconnection logic.

### Step 4: Comprehensive Testing

**Problem**: We need to verify that all fixes are working correctly.

**Actions**:

1. Test DID resolution:
   - Run the diagnostic script to check feed URIs
   - Make sample requests to the feed generator to verify that both service DID and publisher DID work
   - Check if the "could not resolve identity" error is resolved in the Bluesky app

2. Validate feed content:
   - Ensure posts are being indexed from the firehose
   - Verify that community member posts appear in the feed
   - Check if the feed algorithm correctly filters posts

3. Monitor service stability:
   - Set up regular health checks for the service
   - Monitor the firehose connection status
   - Track database statistics to ensure data is being properly stored

**Expected Outcome**: All components of the feed generator should be working correctly, with no errors and proper feed content.

### Step 5: Documentation and Long-term Planning

**Problem**: We need to document the changes and plan for long-term stability.

**Actions**:

1. Update documentation:
   - Add a new section to the troubleshooting guide about DID resolution issues
   - Document the changes made to fix the issues
   - Provide guidance for future maintenance

2. Create a long-term plan:
   - Consider migrating to PostgreSQL for better persistence
   - Enhance the CI/CD pipeline
   - Improve code quality and testing
   - Evaluate Render service tier needs

3. Commit all changes and create a summary pull request:
   - Include detailed descriptions of all changes
   - Reference related issues
   - Provide testing instructions

**Expected Outcome**: Comprehensive documentation and a clear plan for long-term stability and maintenance.

## Domain Usage Guidelines

To maintain consistency and proper functionality, we follow these guidelines for domain usage:

### `swarm-feed-generator.onrender.com` (Feed Generator Service)
- Used for the feed generator service hostname
- Used in the feed generator service DID (`did:web:swarm-feed-generator.onrender.com`)
- Used for all feed generator service endpoints
- Used for privacy policy and terms of service URLs specific to the feed generator
- Used in environment variables related to the feed generator service

### `swarm-social.onrender.com` (Main Web Application)
- Used for references to the main Swarm web application
- Used in links pointing to the Swarm social platform
- Used when describing integration between the feed generator and the main application

It's important to maintain this distinction to ensure that:
1. The DID document correctly identifies the feed generator service
2. API endpoints are properly configured
3. Users are directed to the correct application when following links

## Service Architecture

The Swarm platform consists of two separate services:

1. **Swarm Social (Client Application)**: Deployed at https://swarm-social.onrender.com
   - A customized fork of the Bluesky web client (bskyweb)
   - Provides the user interface for interacting with the Swarm community
   - Integrates with the feed generator to display custom feeds

2. **Swarm Feed Generator**: Deployed at https://swarm-feed-generator.onrender.com
   - Implements the AT Protocol feed generator specification
   - Provides custom feeds for the Swarm community
   - Exposes XRPC endpoints for integration with Bluesky clients

These services work together to provide a complete community platform experience, with the client application handling the user interface and the feed generator providing the custom feed content.

## XRPC Endpoint Registration Issue

We've identified that some XRPC endpoints are not being registered correctly. Our diagnostic tests show that while the health endpoint is accessible and some XRPC endpoints like describeFeedGenerator and getFeedSkeleton are working, other endpoints like /xrpc and app.bsky.feed are returning 404 or 502 errors.

### Debugging Steps Taken

1. Added detailed logging to the following files:
   - `feed-generation.ts` - To log the registration of the `getFeedSkeleton` endpoint
   - `describe-generator.ts` - To log the registration of the `describeFeedGenerator` endpoint
   - `server.ts` - To log the creation and initialization of the XRPC server

2. Created a test script (`testXrpcEndpoints.js`) to verify the functionality of the XRPC endpoints.

3. Updated all references from `swarm-social.onrender.com` to `swarm-feed-generator.onrender.com` across multiple files:
   - Updated `.env` file
   - Updated `.well-known/did.json`
   - Updated `src/server.ts`
   - Updated `src/did-server.ts`
   - Updated DID document with script

4. Committed and pushed these changes to the repository for redeployment.

### Current Issues and Next Steps

1. Some endpoints are now working correctly:
   - `/health` endpoint is accessible
   - `/xrpc/app.bsky.feed.describeFeedGenerator` is working
   - `/xrpc/app.bsky.feed.getFeedSkeleton` is working

2. Some endpoints are still returning errors:
   - `/debug` endpoint is not accessible
   - `/xrpc` and `/xrpc/app.bsky.feed` are returning errors
   - The DID document may not be properly served at `/.well-known/did.json`

3. The privacy policy and terms of service URLs in the describeFeedGenerator response still point to `swarm-social.onrender.com` and need to be updated to `swarm-feed-generator.onrender.com`.

4. Next steps:
   - Update the privacy policy and terms of service URLs in the service configuration
   - Fix the debug endpoint
   - Ensure the DID document is properly served
   - Implement proper error handling for the XRPC root endpoints

## Feed Generator Architecture

The feed generator consists of the following components:

1. **Express Server**: Handles HTTP requests and serves the feed generator API
2. **XRPC Server**: Handles XRPC requests and routes them to the appropriate handlers
3. **Feed Generation Methods**: Implement the logic for generating feeds
4. **Algorithms**: Implement the specific algorithms for each feed type

### Key Files

- `server.ts`: Sets up the Express server and initializes the XRPC server
- `feed-generation.ts`: Implements the `getFeedSkeleton` endpoint
- `describe-generator.ts`: Implements the `describeFeedGenerator` endpoint
- `swarm-community-members.ts`: Contains the list of Swarm community members
- `algos/index.ts`: Exports the feed algorithms
- `algos/swarm-community.ts`: Implements the Swarm community feed algorithm
- `algos/swarm-trending.ts`: Implements the Swarm trending feed algorithm

## Deployment

The feed generator is deployed on Render.com. The deployment process is as follows:

1. Push changes to the GitHub repository
2. Render.com automatically detects the changes and rebuilds the service
3. The service is deployed to the production environment

## Documentation Links

- [Bluesky Feed Generator Documentation](https://github.com/bluesky-social/feed-generator)
- [AT Protocol Documentation](https://atproto.com/docs)
- [Render.com Documentation](https://render.com/docs)

## Implementation Details

### Feed Generator Service

The feed generator service is implemented using the AT Protocol feed generator starter kit. It is a Node.js application that uses Express to serve HTTP requests and the AT Protocol libraries to interact with the Bluesky API.

### Feed Algorithms

The feed generator currently supports the following feed algorithms:

- `swarm-community`: A feed of posts from the Swarm community
- `swarm-trending`: A feed of trending posts in the Swarm community

### DID Configuration

The feed generator uses a DID (Decentralized Identifier) to identify itself to the Bluesky network. The DID is a `did:web` identifier that points to the feed generator service.

The DID document is served at `/.well-known/did.json` and contains the necessary information for the Bluesky network to verify the identity of the feed generator.

## Issues and Solutions

### XRPC Endpoint Registration Issue

**Issue**: Some XRPC endpoints (`/xrpc` and `/xrpc/app.bsky.feed`) are not being registered correctly. The code was correct, but the endpoints were not accessible.

**Solution**: We added more logging to the server.ts, feed-generation.ts, and describe-generator.ts files to help diagnose the issue. We also created a test script to check the XRPC server configuration and endpoints.

We updated all references from `swarm-social.onrender.com` to `swarm-feed-generator.onrender.com` to ensure consistent configuration:
- Updated the `.env` file
- Updated the `.well-known/did.json` file
- Updated the `src/server.ts` file
- Updated the `src/did-server.ts` file
- Ran scripts to update the DID document

### DID Document Configuration Issue

**Issue**: The DID document was not being properly served, and it contained references to the wrong hostname.

**Solution**: We updated the DID document to use the correct hostname `swarm-feed-generator.onrender.com` instead of `swarm-social.onrender.com`. We also ensured that the document is properly served at both `/.well-known/did.json` and `/did.json`.

### Privacy Policy and Terms of Service URLs

**Issue**: The privacy policy and terms of service URLs in the describeFeedGenerator response still pointed to `swarm-social.onrender.com`.

**Solution**: We need to update these URLs in the service configuration to point to `swarm-feed-generator.onrender.com`.

### Next Steps

1. ~~Update the privacy policy and terms of service URLs in the service configuration~~ ✅
2. ~~Fix the debug endpoint~~ ✅
3. ~~Ensure the DID document is properly served~~ ✅
4. ~~Implement proper error handling for the XRPC root endpoints~~ ✅
5. ~~Monitor the service to ensure all endpoints remain accessible~~ ✅
6. ~~Update the Swarm Social client to use the feed generator with the correct configuration~~ ✅

### Future Enhancements

Now that the core functionality is working correctly, we can focus on enhancing the feed generator:

1. **Content Curation Improvements**:
   - Implement more sophisticated algorithms for the Swarm Community feed
   - Add content filtering options based on user preferences
   - Develop machine learning models for better content recommendations

2. **Performance Optimizations**:
   - Implement caching for frequently accessed data
   - Optimize database queries for faster feed generation
   - Add pagination support for large feeds

3. **Monitoring and Analytics**:
   - Set up comprehensive monitoring for all endpoints
   - Implement analytics to track feed usage and performance
   - Create a dashboard for visualizing feed metrics

4. **User Experience**:
   - Add more customization options for feeds
   - Implement user feedback mechanisms
   - Create a more detailed landing page with documentation

5. **Integration Enhancements**:
   - Improve integration with the Swarm Social client
   - Add support for more Bluesky features as they become available
   - Develop APIs for third-party integrations

## References

- [AT Protocol Feed Generator Starter Kit](https://github.com/bluesky-social/feed-generator)
- [AT Protocol Documentation](https://atproto.com/docs)
- [Bluesky API Documentation](https://github.com/bluesky-social/atproto/tree/main/packages/api)
- [Render.com Documentation](https://render.com/docs)

## Key Challenges and Solutions

### 1. DID Document Configuration

#### Challenge
One of the most persistent challenges was correctly configuring and serving the DID document (`did.json`) for the `did:web` identifier. Despite attempts to configure the DID document correctly, we consistently encountered a "could not resolve identity" error when attempting to use the feed.

#### Root Causes
1. **Path Resolution**: The Express server couldn't reliably locate the DID document during production deployment.
2. **Static File Serving**: There was no middleware configured to serve static files from the public directory.
3. **Build Process Issues**: The DID document wasn't being properly copied to the correct location during the build process.
4. **DID/Hostname Mismatch**: Inconsistencies between the `FEEDGEN_SERVICE_DID` and `FEEDGEN_HOSTNAME` values in the environment variables.
5. **Port Configuration**: The application wasn't properly using the PORT environment variable provided by Render.com, causing mismatches in service endpoints.
6. **Server Architecture**: The main application server wasn't properly configured to handle the DID document routes.
7. **Express dotfiles Configuration**: The Express static middleware doesn't serve dotfiles by default, which affects the `.well-known` directory.
8. **Service Type Definition**: The AT Protocol appears to require a specific service type ("BskyFeedGenerator") that differs from what we were using initially.
9. **Content-Type Headers**: The DID document needs to be served with the correct Content-Type header.
10. **Hostname Mismatch**: The service was using `swarm-social.onrender.com` in many places but the actual hostname was `swarm-feed-generator.onrender.com`.

#### Attempted Solutions
We've implemented a comprehensive series of solutions with multiple layers of redundancy:

1. **Static File Middleware**:
   ```typescript
   // Added to server.ts
   app.use(express.static(path.join(__dirname, '../public'), { dotfiles: 'allow' }));
   ```

2. **Robust DID Document Handler**:
   - Updated the `well-known.ts` handler to check multiple possible file paths
   - Added detailed logging to help diagnose issues
   - Implemented fallback generation of a basic DID document when file not found

3. **Build Process Integration**:
   - Created a post-build script (`copy-did-document.js`) that runs after TypeScript compilation
   - Added a new script (`ensure-did-document.js`) to generate the DID document at build and startup time
   - Added the scripts to `package.json` with appropriate hooks
   - Ensured the scripts handle various edge cases, including missing directories

4. **Environment Configuration**:
   - Updated from `FEEDGEN_SERVICE_DID=did:web:swarm-social.onrender.com` to `FEEDGEN_SERVICE_DID=did:web:swarm-feed-generator.onrender.com`
   - Updated from `FEEDGEN_HOSTNAME=swarm-social.onrender.com` to `FEEDGEN_HOSTNAME=swarm-feed-generator.onrender.com`

5. **Direct Static File Approach**:
   - Created a static `did.json` file in the public directory that gets served directly
   - This provides a reliable fallback when other methods fail
   - The static file contains all necessary DID document components including verification methods and service endpoints

6. **Port Configuration Fix**:
   - Updated the server to properly use the PORT environment variable provided by Render.com
   - Added fallback logic to ensure a default port is used if not specified
   - Ensured consistent port usage across all service endpoint references

7. **Dedicated DID Server**:
   - Created a separate Express server specifically for serving the DID document
   - Implemented in a dedicated module (`did-server.ts`) to keep concerns separated
   - Added comprehensive error handling and debugging endpoints
   - Configured to check multiple possible file paths for the DID document
   - Implemented dynamic DID document generation as a fallback
   - Added a `/debug` endpoint to help diagnose issues in production
   - Updated the hostname from `swarm-social.onrender.com` to `swarm-feed-generator.onrender.com`

8. **Specific AT Protocol Requirements**:
   - Updated the service type from 'AtprotoFeedGenerator' to 'BskyFeedGenerator'
   - Updated the service ID from '#atproto_feed_generator' to '#bsky_fg'
   - Set proper Content-Type headers (`application/json`)
   - Added Cache-Control headers to prevent CDN caching issues

#### Progress and Remaining Issues
We've made significant progress:
- The health endpoint is now accessible
- The describeFeedGenerator endpoint is working
- The getFeedSkeleton endpoint is working

However, we still have a few issues to resolve:
- The debug endpoint is not accessible
- The DID document may not be properly served
- Some XRPC root endpoints are still returning errors
- The privacy policy and terms of service URLs still point to the wrong hostname

### Update: Domain Reference Update

After investigating the errors, we discovered that many references to `swarm-social.onrender.com` remained in the codebase. We've systematically updated all of these references to use `swarm-feed-generator.onrender.com` instead.

#### Changes Made
1. Updated the `.env` file with the correct hostname and service DID
2. Updated the `.well-known/did.json` file with the correct hostname
3. Updated the `src/server.ts` file to use the correct hostname for privacy policy and terms of service URLs
4. Updated the `src/did-server.ts` file to use the correct hostname as the default
5. Ran scripts to update the DID document in multiple locations

#### Lessons Learned
- It's crucial to maintain consistent hostnames across all configuration files and code
- When changing a service's domain, a systematic approach is needed to update all references
- Testing each endpoint after such changes is essential to verify everything is working correctly

### 2. Firehose Subscription Issues

#### Challenge
Users reported that their posts were not appearing in the Swarm Community feed, despite being correctly listed in the `SWARM_COMMUNITY_MEMBERS` array. After investigation, we discovered several issues related to the firehose subscription.

#### Root Causes
1. **Service Hibernation**: Render's free tier services hibernate after 15 minutes of inactivity, causing the firehose subscription to disconnect.
2. **Non-persistent Storage**: The database is not persisted between service restarts on Render's free tier, causing indexed posts to be lost.
3. **HTTP Method Handling**: The service was returning HTTP 405 "Method Not Allowed" errors for HEAD requests, which may impact the firehose subscription.
4. **Subscription Reconnection**: The feed generator wasn't properly reconnecting to the firehose after service restarts or hibernation.
5. **Database Reset**: Each time the service restarts, the SQLite database is reset, losing all previously indexed posts.
6. **Feed Algorithm Issues**: Posts were being correctly indexed in the database but not appearing in the feed due to issues with the feed algorithm not properly filtering posts from community members.

#### Implemented Solutions

1. **Admin Endpoint for Manual Feed Updates**:
   - Created an admin endpoint (`/admin/update-feed`) that allows manually adding posts to the feed
   - Implemented a database stats endpoint (`/admin/stats`) to check the current state of the database
   - Added proper error handling and validation for the admin endpoints

2. **Troubleshooting Scripts**:
   - `check-feed-generator-env.js`: Checks the feed generator's environment variables
   - `check-firehose-subscription.js`: Checks if the feed generator is properly subscribing to the firehose
   - `check-feed-database.js`: Checks if posts are being stored in the database
   - `restart-feed-generator.js`: Restarts the feed generator service and reconnects to the firehose
   - `fix-feed-generator-database.js`: Generates SQL statements to manually add posts to the database
   - `create-test-post.js`: Creates a test post to verify if it gets indexed
   - `test-feed-indexing.js`: Tests if the feed generator is properly indexing posts
   - `check-feed-algorithm.js`: Checks if the feed algorithm is working correctly by comparing posts in the database with posts in the feed
   - `add-posts-to-feed.js`: Manually adds posts to the feed using the admin endpoint
   - `auto-add-community-posts.js`: Automatically finds recent posts from community members and adds them to the feed

3. **Service Maintenance Script**:
   - Created a `keep-service-active.js` script that periodically pings the service to prevent hibernation
   - This script can be run on a separate server or locally to keep the feed generator active

4. **Comprehensive Troubleshooting Guide**:
   - Created a detailed troubleshooting guide (`.cursor/instructions/feed-indexing-troubleshooting-guide.md`) that documents common issues and solutions
   - The guide includes step-by-step instructions for diagnosing and fixing feed generator issues
   - Created a troubleshooting log (`.cursor/instructions/feed-indexing-troubleshooting-log.md`) to track past issues and their resolutions

5. **Automated Post Addition**:
   - Set up a GitHub Actions workflow to run the `auto-add-community-posts.js` script hourly
   - This ensures that posts from community members are added to the feed even if there are issues with the feed algorithm

6. **Upgraded to Paid Tier on Render**:
   - Upgraded the feed generator service to a paid tier on Render, which provides:
     - No service hibernation (service remains active 24/7)
     - Persistent storage (database persists between service restarts)
     - Better performance and reliability
     - Stable firehose connection

#### Lessons Learned
1. **Free Tier Limitations**: Render's free tier has significant limitations that affect the feed generator's reliability:
   - Service hibernation after 15 minutes of inactivity
   - Non-persistent storage between service restarts
   - Limited resources affecting performance

2. **Firehose Subscription Complexity**: The AT Protocol firehose subscription is complex and requires careful handling:
   - Proper reconnection logic is essential
   - The service must handle various HTTP methods correctly
   - The subscription can be affected by network issues and service restarts

3. **Database Persistence**: For reliable operation, the feed generator needs persistent storage:
   - SQLite is not ideal for services that restart frequently
   - A cloud-hosted database would be more reliable but requires additional configuration
   - Upgrading to a paid tier on Render provides persistent storage

4. **Manual Intervention Options**: Having manual intervention options is crucial for services with potential reliability issues:
   - Admin endpoints for manual updates
   - Scripts for diagnosing and fixing common issues
   - Clear documentation for troubleshooting

5. **Feed Algorithm Complexity**: The feed algorithm needs to correctly filter posts from community members:
   - Posts may be indexed in the database but not appearing in the feed
   - Regular testing of the feed algorithm is important
   - Having a backup mechanism (like automated post addition) ensures posts appear in the feed

#### Next Steps
1. **Monitor Feed Algorithm**: Regularly check if the feed algorithm is working correctly using the `check-feed-algorithm.js` script.

2. **Enhance Firehose Subscription**: Continue to improve the firehose subscription implementation with:
   - More robust reconnection logic
   - Better error handling
   - Detailed logging for debugging

3. **Monitor Service Health**: Set up monitoring to detect and alert on service issues:
   - Regular health checks
   - Monitoring of database state and post indexing
   - Alerts for any issues with the feed algorithm

4. **Optimize Database Performance**: Now that we have persistent storage, optimize the database for better performance:
   - Add appropriate indexes
   - Implement query optimizations
   - Consider database maintenance tasks

### 3. DID and Feed URI Consistency Issues

#### Challenge
After resolving the DID document configuration, we encountered a subtle but critical issue where users were still experiencing "could not resolve identity" errors when trying to access the feed.

#### Root Causes
1. **DID Mismatch in Feed URIs**: The feed URIs in the `describeFeedGenerator` response were using the publisher DID (`did:plc:ouadmsyvsfcpkxg3yyz4trqi`), while the response itself was using the service DID (`did:web:swarm-feed-generator.onrender.com`).
2. **Feed URI Construction**: The code in `describe-generator.ts` was using `ctx.cfg.publisherDid` instead of `ctx.cfg.serviceDid` when constructing feed URIs.
3. **Feed URI Handling in Client**: The client was trying to resolve feed URIs with the service DID, but the feed generator was only accepting URIs with the publisher DID.
4. **Feed Record Registration**: The feed record registered with the AT Protocol was using the incorrect DID for feed URIs.

#### Attempted Solutions
1. **Code Analysis and Consistency Check**:
   - Conducted a systematic review of all code that constructs or handles feed URIs
   - Identified the inconsistency in `describe-generator.ts` where feed URIs were constructed with the publisher DID

2. **Code Updates**:
   - Updated `describe-generator.ts` to use `ctx.cfg.serviceDid` consistently for feed URIs:
     ```typescript
     const didToUse = ctx.cfg.serviceDid;
     
     const feeds = Object.keys(algos).map((shortname) => ({
       uri: AtUri.make(
         didToUse,
         'app.bsky.feed.generator',
         shortname,
       ).toString(),
     }))
     ```
   - Modified `feed-generation.ts` to accept both service and publisher DIDs for backward compatibility:
     ```typescript
     if (
       (feedUri.hostname !== ctx.cfg.serviceDid && feedUri.hostname !== ctx.cfg.publisherDid) ||
       feedUri.collection !== 'app.bsky.feed.generator' ||
       !algo
     ) {
       // Error handling
     }
     ```
   - Updated `publishFeedGen.ts` to use the service DID consistently for feed URIs in the record

3. **Feed Record Update**:
   - Re-ran the `publishFeedGen.ts` script to update the feed record with the correct feed URIs
   - Verified that the updated feed record contained URIs with the service DID

4. **Diagnostic Tools**:
   - Created a new `check-feed-uris.js` script to verify that feed URIs are consistent with the service DID
   - The script tests both the `describeFeedGenerator` endpoint and the `getFeedSkeleton` endpoint with different DIDs
   - This helps diagnose issues with DID mismatches in feed URIs

#### Lessons Learned
1. **DID Consistency is Critical**: Maintaining consistent use of DIDs across all components is essential for proper resolution and functionality.
2. **Multiple Compatibility Paths**: For backward compatibility, it's helpful to accept both old and new DID patterns while transitioning.
3. **Feed URI Construction**: When constructing feed URIs, always use the service DID, not the publisher DID.
4. **Testing with Multiple DIDs**: Test endpoints with both DIDs to ensure proper functionality during transitions.
5. **Feed Record Updates**: After changing DID handling in code, the feed record must be updated to match the new pattern.
6. **AT Protocol Resolution**: The AT Protocol resolver expects consistency between the DID used in the response and the DIDs used in feed URIs.

#### Impact
Resolving this issue:
1. Eliminated the "could not resolve identity" errors for users
2. Made the feed accessible in the Bluesky app
3. Ensured consistent DID usage throughout the system
4. Improved understanding of how DID resolution works in the AT Protocol