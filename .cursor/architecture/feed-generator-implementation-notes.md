# Feed Generator Implementation Notes

## Overview

This document captures the implementation challenges, solutions, and lessons learned during the development and deployment of the Swarm Community's feed generator for the AT Protocol/Bluesky ecosystem. It serves as a reference for maintaining the current implementation and as guidance for future development work.

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
FEEDGEN_HOSTNAME=swarm-social.onrender.com
FEEDGEN_LISTENHOST=0.0.0.0
FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi
FEEDGEN_LABELS_ENABLED=false
FEEDGEN_SERVICE_DID=did:web:swarm-social.onrender.com
FEEDGEN_SUBSCRIPTION_ENDPOINT=wss://bsky.network
DATABASE_URL=sqlite:swarm-feed.db
```

### Important URLs

- Feed Generator Endpoint: `https://swarm-social.onrender.com`
- DID Document URL: `https://swarm-social.onrender.com/.well-known/did.json`
- Alternative DID Document URL: `https://swarm-social.onrender.com/did.json`
- Debug Info: `https://swarm-social.onrender.com/debug`
- Health Check: `https://swarm-social.onrender.com/health`
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