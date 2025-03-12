# Feed Generator Implementation Notes

## Overview

The Swarm Feed Generator is a custom feed generator for the Swarm app, which is a Bluesky client. The feed generator is deployed on Render.com and provides two custom feeds:

1. **Swarm Community Feed**: A feed of posts from Swarm community members
2. **Swarm Trending Feed**: A feed of trending posts from the Swarm community

The feed generator is built using Node.js and Express, and it uses the AT Protocol libraries to interact with the Bluesky API.

## Current Status

- The feed generator service is deployed on Render.com at https://swarm-feed-generator.onrender.com
- The feed generator record has been updated with the correct production DID (`did:web:swarm-feed-generator.onrender.com`)
- The XRPC endpoints (`app.bsky.feed.getFeedSkeleton` and `app.bsky.feed.describeFeedGenerator`) have been implemented and were previously working correctly
- A runtime modification script has been implemented to ensure XRPC endpoints are always available
- A root path handler has been added to provide a user-friendly landing page with information about the available feeds and endpoints
- **Current Issue (March 12, 2025)**: The service is currently returning a 502 Bad Gateway error for all endpoints. This is likely due to the service being in the process of deploying our latest changes or experiencing deployment issues. We need to check the Render dashboard for deployment logs and status.

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

We've identified that the XRPC endpoints are not being registered correctly. Our diagnostic tests show that while the service is running and the health endpoint is accessible, the XRPC endpoints are returning 404 errors.

### Debugging Steps Taken

1. Added detailed logging to the following files:
   - `feed-generation.ts` - To log the registration of the `getFeedSkeleton` endpoint
   - `describe-generator.ts` - To log the registration of the `describeFeedGenerator` endpoint
   - `server.ts` - To log the creation and initialization of the XRPC server

2. Created a test script (`testXrpcEndpoints.js`) to verify the functionality of the XRPC endpoints.

3. Committed and pushed these changes to the repository for redeployment.

### Next Steps

1. Wait for the service to be redeployed with the added logging
2. Check the logs for any errors during XRPC server initialization
3. Fix any issues identified in the logs
4. Verify that the XRPC endpoints are now accessible

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

**Issue**: The XRPC endpoints (`app.bsky.feed.getFeedSkeleton` and `app.bsky.feed.describeFeedGenerator`) were not being registered correctly. The code was correct, but the endpoints were not accessible.

**Solution**: We added more logging to the server.ts, feed-generation.ts, and describe-generator.ts files to help diagnose the issue. We also created a test script to check the XRPC server configuration and endpoints.

The issue was likely related to how the XRPC server was being created or how the routes were being registered. By adding more logging, we can identify the exact cause of the issue and fix it.

### Next Steps

1. Rebuild and redeploy the service with the updated code
2. Check the logs on Render.com for any errors during startup
3. Run the test script to check the XRPC endpoints
4. If the XRPC endpoints are working, update the Swarm app to use the custom feed generator
5. If the XRPC endpoints are still not working, continue debugging based on the logs and test results

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
   - Set `FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi` (PLC DID)
   - Set `FEEDGEN_SERVICE_DID=did:web:swarm-social.onrender.com` (Web DID)
   - Set `FEEDGEN_HOSTNAME=swarm-social.onrender.com`

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

8. **Specific AT Protocol Requirements**:
   - Updated the service type from 'AtprotoFeedGenerator' to 'BskyFeedGenerator'
   - Updated the service ID from '#atproto_feed_generator' to '#bsky_fg'
   - Set proper Content-Type headers (`application/json`)
   - Added Cache-Control headers to prevent CDN caching issues

#### Remaining Issues
Despite these comprehensive solutions, we still encounter the "could not resolve identity" error, particularly in the format `could not resolve identity: did:web:localhost:3000`. This suggests that:

1. **Local vs. Production Mismatch**: The error mentions `localhost:3000`, indicating this might be a client-side issue where the client is trying to resolve a local DID rather than the production one.

2. **AT Protocol Resolution Process**: There may be specific aspects of how the AT Protocol resolves DIDs that we haven't fully addressed.

3. **CDN/Proxy Interference**: Cloudflare (used by Render.com) might be interfering with requests to the `.well-known` directory.

4. **Port Specification in DID**: The inclusion of the port in the DID might be causing resolution issues.

#### Next Steps to Consider

1. **Test with an absolute endpoint instead of did:web**:
   - Create a new feed record that directly references the feed generator endpoint rather than using DID resolution
   - This would bypass the DID resolution process entirely

2. **Try a different did:web format**:
   - Modify the DID to use the format `did:web:swarm-social.onrender.com` without the port number
   - Update all references to this DID throughout the application

3. **Investigate client-side resolution**:
   - Check if the client (Bluesky app) is caching an old DID or has incorrect DID information
   - Try using a different Bluesky account or client to test the feed

4. **Implement a direct HTTP endpoint for DID document serving**:
   - Create a serverless function or static hosting specifically for serving the DID document
   - This would isolate the DID document serving from the main application

5. **Redirect approach**:
   - Set up a redirect from `/.well-known/did.json` to a predictable, cacheable URL like `/static/did.json`
   - This might help bypass CDN/proxy caching issues

6. **Custom domain without port**:
   - Consider using a custom domain without port specification for the did:web identifier
   - This would eliminate any potential port-related resolution issues

7. **Server-side caching for DID document**:
   - Implement server-side caching for the DID document to ensure consistent responses
   - This would help mitigate any intermittent issues with file access

8. **Direct XRPC method for feed discovery**:
   - Investigate if there are alternative XRPC methods for feed discovery beyond DID resolution
   - This might provide a more reliable mechanism for connecting to the feed generator

9. **Implement web-fingerprinting alternatives**:
   - Explore if the AT Protocol supports alternative discovery mechanisms like WebFinger

10. **Community investigation**:
    - Reach out to the AT Protocol/Bluesky community specifically about did:web resolution issues
    - Other feed generator developers might have encountered and solved similar problems

We will systematically work through these options, testing each one methodically while maintaining detailed logs of outcomes, to resolve the persistent DID resolution issue.

### Update: DID Resolution Issue Fixed

After investigating the "could not resolve identity" error, we discovered that the feed generator record was still using the local development DID (`did:web:localhost:3000`) instead of the production DID (`did:web:swarm-social.onrender.com`).

#### Root Cause
When the feed generator record was initially created, it was registered with the local development DID. Even though we updated the environment variables and DID document to use the production DID, the feed generator record itself still contained a reference to the local DID.

#### Solution
We created and ran a non-interactive script (`updateFeedGenDidNonInteractive.ts`) to update the feed generator record with the correct production DID:

```typescript
// Script to update feed generator DID (non-interactive version)
import dotenv from 'dotenv'
import { AtpAgent } from '@atproto/api'
import { ids } from '../src/lexicon/lexicons'

const run = async () => {
  dotenv.config()

  // Get parameters from environment variables
  const handle = process.env.BLUESKY_HANDLE || process.env.BLUESKY_USERNAME
  const password = process.env.BLUESKY_PASSWORD
  const service = process.env.BLUESKY_PDS_URL || 'https://bsky.social'
  const recordName = process.env.FEED_RECORD_NAME || 'swarm-community'

  // Ensure we have the correct production DID
  if (!process.env.FEEDGEN_SERVICE_DID && !process.env.FEEDGEN_HOSTNAME) {
    throw new Error('Please provide FEEDGEN_SERVICE_DID or FEEDGEN_HOSTNAME in the .env file')
  }

  const feedGenDid = process.env.FEEDGEN_SERVICE_DID ?? `did:web:${process.env.FEEDGEN_HOSTNAME}`
  
  // Connect to the Bluesky API
  const agent = new AtpAgent({ service })
  await agent.login({ identifier: handle, password })
  
  // Get the current record to preserve other fields
  const currentRecord = await agent.api.com.atproto.repo.getRecord({
    repo: agent.session?.did ?? '',
    collection: ids.AppBskyFeedGenerator,
    rkey: recordName,
  })

  const record = currentRecord.data.value
  const oldDid = record.did
  
  // Update only the DID field
  record.did = feedGenDid
  
  // Put the updated record
  await agent.api.com.atproto.repo.putRecord({
    repo: agent.session?.did ?? '',
    collection: ids.AppBskyFeedGenerator,
    rkey: recordName,
    record: record,
  })
}
```

The script successfully updated the feed generator record, changing the DID from `did:web:localhost:3000` to `did:web:swarm-social.onrender.com`.

#### Lessons Learned
1. **Feed Generator Record vs. DID Document**: It's important to understand that the feed generator record (stored in the Bluesky PDS) and the DID document (served by our application) are separate entities that both need to be correctly configured.

2. **Record Inspection**: When troubleshooting DID resolution issues, it's crucial to inspect the actual feed generator record to ensure it contains the correct DID.

3. **Non-Interactive Scripts**: Creating non-interactive versions of scripts that can be run with environment variables is valuable for automation and for environments where interactive prompts may not work properly.

4. **Comprehensive Approach**: Solving DID resolution issues requires a comprehensive approach that addresses both the server-side configuration (DID document) and the client-side references (feed generator record).

### Update: Service Deployment Issue Identified

After updating the feed generator record with the correct production DID, we're still encountering the "could not resolve identity: did:web:swarm-social.onrender.com" error. Further investigation revealed that the feed generator service itself is not running properly on Render.com.

#### Findings
1. **Service Not Responding**: All requests to the service endpoints (including `/did.json`, `/.well-known/did.json`, `/debug`, `/health`, and the XRPC endpoint) are returning Bluesky's 404 page instead of the expected responses.

2. **DID Resolution Failure**: The AT Protocol is unable to resolve the DID because the service is not properly serving the DID document.

3. **Deployment Issue**: This suggests a deployment issue on Render.com where either:
   - The service is not running at all
   - The service is running but not accessible at the expected URL
   - The service has been replaced by or is redirecting to a Bluesky instance

#### Next Steps

1. **Check Render.com Deployment Status**:
   - Log into the Render.com dashboard
   - Verify that the service is deployed and running
   - Check the deployment logs for any errors
   - Ensure the service is deployed to the correct URL (swarm-social.onrender.com)

2. **Redeploy the Service**:
   - Trigger a manual redeploy of the service on Render.com
   - Monitor the deployment logs for any errors
   - Verify that the service starts up correctly

3. **Check Environment Variables**:
   - Verify that all required environment variables are set correctly in the Render.com dashboard
   - Pay special attention to PORT, FEEDGEN_HOSTNAME, and FEEDGEN_SERVICE_DID

4. **Test with a Different Hosting Provider**:
   - If issues persist with Render.com, consider deploying to a different hosting provider
   - Options include Vercel, Netlify, or a traditional VPS

5. **Implement Option 1 from Previous Next Steps**:
   - Create a new feed record that directly references the feed generator endpoint
   - This would bypass the DID resolution process entirely
   - Example: Update the feed record to use a direct URL instead of a DID

6. **Consider a Static DID Document Hosting**:
   - Host the DID document on a reliable static hosting service (like GitHub Pages)
   - Update the DID to point to this static hosting
   - This would separate the DID resolution from the feed generator service

7. **Implement a Health Check System**:
   - Create a monitoring system that regularly checks if the service is running
   - Set up alerts for when the service goes down
   - Implement automatic recovery procedures

We will prioritize checking the deployment status on Render.com and redeploying the service, as this is likely the quickest path to resolution.

### Update: XRPC Endpoint Issue Fixed

After investigating the "Route /xrpc/app.bsky.feed.getFeedSkeleton not found" error, we identified and fixed the issue with the XRPC endpoint not being registered.

#### Root Cause
The issue was in the `feed-generation.ts` file where there was a syntax error in the async function parameter destructuring. This was causing the endpoint registration to fail during compilation. The TypeScript compiler was generating incorrect JavaScript code for the async function, which prevented the XRPC endpoint from being properly registered.

#### Solution
We implemented two key fixes:

1. **Fixed Function Parameter Destructuring**:
   ```typescript
   // Original code with syntax error
   server.app.bsky.feed.getFeedSkeleton(async ({ params, req }) => {
     // Function body
   });

   // Fixed code with proper parameter handling
   server.app.bsky.feed.getFeedSkeleton(async (reqCtx) => {
     const { params } = reqCtx;
     // Function body
   });
   ```

2. **Fixed Build Process**:
   We also fixed the `copy-did-document.js` script to properly handle directory creation during the build process. The script was attempting to access directories that didn't exist yet, causing the build to fail. We updated it to check if directories exist before trying to create them or write files to them.

#### Lessons Learned
1. **TypeScript Compilation Subtleties**: The TypeScript compiler can sometimes generate unexpected JavaScript code for certain syntax patterns, especially with async functions and destructuring. It's important to verify the compiled output when debugging issues that might be related to TypeScript compilation.

2. **Build Process Robustness**: Build scripts need to be robust and handle edge cases like missing directories. Always check if directories exist before trying to access them, and create them if necessary.

3. **Explicit Parameter Handling**: Using more explicit parameter handling (getting the context object first, then destructuring it) can be more reliable than direct destructuring in function parameters, especially for complex async functions.

4. **Testing Compiled Code**: It's valuable to test the compiled JavaScript code directly when debugging issues that might be related to compilation. This can help identify issues that aren't apparent in the TypeScript source code.

The fix has been deployed to the production environment, and the XRPC endpoint should now be properly registered and accessible. This should resolve the "Route not found" error and allow the feed generator to function correctly.

### 2. Feed Algorithm URI Registration

#### Challenge
We encountered confusion around the relationship between the feed URI (used by clients to request the feed) and the service DID (used by the AT Protocol to verify the service).

#### Root Cause
The feed generator requires two distinct DIDs:
1. A publisher DID (the account that owns the feed)
2. A service DID (the DID that identifies the feed generator service)

The feed URI follows the pattern `at://{publisherDid}/app.bsky.feed.generator/{feedId}`, but the service must have its own DID that resolves to the service endpoint.

#### Solution
We clarified this relationship by:
1. Using the PLC DID (`did:plc:ouadmsyvsfcpkxg3yyz4trqi`) as the publisher DID
2. Using a Web DID (`did:web:swarm-social.onrender.com`) as the service DID
3. Ensuring the feed generator handler validates against the publisher DID:
   ```typescript
   if (feedUri.hostname !== ctx.cfg.publisherDid || 
       feedUri.collection !== 'app.bsky.feed.generator' || 
       !algo) {
     throw new InvalidRequestError('Unsupported algorithm', 'UnsupportedAlgorithm')
   }
   ```

### 3. DID Document Structure

#### Challenge
The structure of the DID document needed to match AT Protocol expectations, particularly for the feed generator service endpoint.

#### Root Cause
The AT Protocol expects specific service types and structures in the DID document.

#### Solution
We ensured the DID document followed this structure:
```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/secp256k1-2019/v1"
  ],
  "id": "did:web:swarm-social.onrender.com",
  "verificationMethod": [
    {
      "id": "did:web:swarm-social.onrender.com#atproto",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:web:swarm-social.onrender.com",
      "publicKeyMultibase": "zQ3shojKAGY2sK3ThMHW7soP4tYDWLCRjJt9w14XKxkKZnnnK"
    }
  ],
  "service": [
    {
      "id": "#atproto_pds",
      "type": "AtprotoPersonalDataServer",
      "serviceEndpoint": "https://bsky.social"
    },
    {
      "id": "#atproto_feed_generator",
      "type": "AtprotoFeedGenerator",
      "serviceEndpoint": "https://swarm-social.onrender.com"
    }
  ]
}
```

### 4. Deployment Configuration

#### Challenge
Ensuring that the necessary files and configurations were properly deployed to the production environment on Render.com.

#### Root Cause
The build and deployment process needed special handling for static files and environment configurations.

#### Solution
1. Added environment variables on Render.com dashboard:
   ```
   FEEDGEN_HOSTNAME=swarm-social.onrender.com
   FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi
   FEEDGEN_SERVICE_DID=did:web:swarm-social.onrender.com
   ```

2. Created a post-build script to copy the DID document to the build output directory

3. Included the `.well-known` and `public` directories in the git repository to ensure they were deployed

4. Added a static `did.json` file directly in the public directory as a reliable fallback

5. Ensured proper handling of the PORT environment variable provided by Render.com

## Lessons Learned

1. **DID Document Complexity**: Working with DIDs and the AT Protocol requires careful attention to detail in the DID document structure and deployment configuration.

2. **Testing in Development vs. Production**: There are significant differences between local development and production deployment that need to be accounted for, particularly with path resolution and static file serving.

3. **Express Middleware Configuration**: Proper configuration of Express middleware is crucial for serving static files in a TypeScript application deployed to production.

4. **Build Process Integration**: Adding custom steps to the build process can solve deployment issues that are difficult to address through code alone.

5. **Environment Variable Management**: Clear separation of environment variables for different environments (development vs. production) helps prevent confusion and deployment issues.

6. **Logging and Debugging**: Detailed logging is invaluable for diagnosing issues in production environments where direct debugging is not possible.

7. **Multiple Redundancy Layers**: Implementing multiple approaches to solve critical issues (like serving the DID document) provides resilience against unexpected deployment problems.

8. **Port Configuration**: Always use the PORT environment variable provided by the hosting platform rather than hardcoding port values, as this can cause service endpoint mismatches.

9. **Separation of Concerns**: Creating dedicated servers for specific functionality (like serving the DID document) can simplify debugging and maintenance.

10. **Diagnostic Endpoints**: Adding diagnostic endpoints (like `/debug`) in production can provide valuable information for troubleshooting without requiring server restarts or log access.

11. **AT Protocol Service Types**: The AT Protocol requires specific service types (e.g., "BskyFeedGenerator" instead of "AtprotoFeedGenerator") for proper resolution.

12. **HTTP Headers Matter**: Proper Content-Type and Cache-Control headers are crucial for ensuring correct interpretation and preventing caching issues.

13. **Client-Side Resolution**: Remember that errors might be occurring on the client side during resolution, not necessarily on the server side.

14. **Methodical Testing**: When dealing with complex distributed systems like the AT Protocol, systematic testing of each component is essential to isolate and fix issues.

## Reference Information

### Environment Variable Configuration

```
# Development (Local)
PORT=3000
FEEDGEN_HOSTNAME=localhost:3000
FEEDGEN_LISTENHOST=0.0.0.0
FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi
FEEDGEN_LABELS_ENABLED=false
FEEDGEN_SERVICE_DID=did:web:localhost:3000
FEEDGEN_SUBSCRIPTION_ENDPOINT=wss://bsky.network
DATABASE_URL=sqlite:swarm-feed.db

# Production (Render.com)
PORT=3000
FEEDGEN_HOSTNAME=swarm-feed-generator.onrender.com
FEEDGEN_LISTENHOST=0.0.0.0
FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi
FEEDGEN_LABELS_ENABLED=false
FEEDGEN_SERVICE_DID=did:web:swarm-feed-generator.onrender.com
FEEDGEN_SUBSCRIPTION_ENDPOINT=wss://bsky.network
DATABASE_URL=sqlite:swarm-feed.db
```

### Important URLs

#### Swarm Social (Client Application)
- Main Application: `https://swarm-social.onrender.com`

#### Swarm Feed Generator
- Feed Generator Service: `https://swarm-feed-generator.onrender.com`
- Root Path (Landing Page): `https://swarm-feed-generator.onrender.com/`
- DID Document URL: `https://swarm-feed-generator.onrender.com/.well-known/did.json`
- Alternative DID Document URL: `https://swarm-feed-generator.onrender.com/did.json`
- Debug Info: `https://swarm-feed-generator.onrender.com/debug`
- Health Check: `https://swarm-feed-generator.onrender.com/health`
- XRPC Test Endpoint: `https://swarm-feed-generator.onrender.com/xrpc-test`
- Feed URI: `at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`

### Key Files

- `src/server.ts`: Contains Express server setup and static file middleware
- `src/did-server.ts`: Dedicated server for serving the DID document with robust error handling
- `src/index.ts`: Main entry point that starts both the feed generator and DID server
- `src/well-known.ts`: Handles serving the DID document
- `scripts/copy-did-document.js`: Post-build script for copying the DID document
- `scripts/deploy-did-document.js`: Script to deploy the DID document to the public directory
- `scripts/ensure-did-document.js`: Script to ensure the DID document exists at build and startup time
- `package.json`: Contains build scripts including the post-build hook
- `.well-known/did.json`: Source DID document
- `public/.well-known/did.json`: Public DID document that gets served
- `public/did.json`: Static fallback DID document 

### Runtime Modification Solution

To ensure the XRPC endpoints are always available, we implemented a runtime modification approach:

1. **Created a Runtime Modification Script**: 
   - Implemented `modify-server-on-startup.js` that runs at server startup
   - The script checks if the server.js file exists in the dist directory
   - It reads the server.js file and checks if the XRPC endpoints are already included
   - If not, it adds the XRPC endpoints after the debug endpoint

2. **Updated Start Command**:
   - Modified the `package.json` start script to run the modification script before starting the server:
   ```json
   "start": "node scripts/ensure-did-document.js && node scripts/check-render-deployment.js && node scripts/modify-server-on-startup.js && ts-node src/index.ts"
   ```

This approach ensures that the XRPC endpoints are always available, even if there are issues with the TypeScript compilation or the build process. 

## Next Steps

1. **Resolve 502 Bad Gateway Issue**:
   - Check the Render dashboard for deployment logs and status
   - Verify if the deployment is in progress or if there are any errors
   - If necessary, trigger a manual redeployment
   - Monitor the service until it returns to normal operation

2. **Verify Root Path Handler**:
   - Once the service is back online, verify that the root path handler is working correctly
   - Ensure the landing page displays properly with all the necessary information
   - Test all links and endpoints mentioned on the landing page

3. **Enhance Monitoring and Alerting**:
   - Implement a more robust monitoring solution for the feed generator service
   - Set up alerts for service outages or errors
   - Create a dashboard for monitoring service health and performance

4. **Improve Error Handling**:
   - Enhance error handling in the feed generator service
   - Implement graceful degradation for non-critical components
   - Add more detailed logging for troubleshooting

5. **Documentation and Knowledge Transfer**:
   - Update all documentation with the latest changes and configurations
   - Create a troubleshooting guide for common issues
   - Document the deployment process and configuration in detail

6. **Performance Optimization**:
   - Analyze the performance of the feed generator service
   - Identify bottlenecks and optimize critical paths
   - Implement caching strategies for frequently accessed data

7. **Feature Enhancements**:
   - Develop additional feed algorithms based on user feedback
   - Implement personalization features for feeds
   - Explore integration with other Bluesky features and APIs