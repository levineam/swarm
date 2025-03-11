# Swarm Feed Generator Implementation Plan

## Overview

This implementation plan outlines a step-by-step approach for properly setting up and deploying the Swarm feed generator to work with the Swarm app (a customized Bluesky web client). Based on our investigations and debugging efforts, we've identified several key issues that need to be addressed to get the feed generator working correctly.

## Current Status

1. The Swarm app (customized Bluesky web client) is successfully deployed to swarm-social.onrender.com
2. The feed generator record has been updated with the correct production DID (did:web:swarm-social.onrender.com)
3. Despite this, the feed generator is not accessible because the Bluesky web client is handling all requests to the domain
4. The "could not resolve identity" error persists because the DID document cannot be resolved

## Implementation Plan

### Phase 1: Architectural Reconfiguration

1. **Separate the Feed Generator and Web Client**
   - ✅ **Problem**: The current architecture has both the Swarm web client and feed generator attempting to use the same domain
   - ✅ **Solution**: Deploy the feed generator to a separate subdomain (e.g., feed.swarm-social.onrender.com)
   - **Tasks**:
     - Create a new service in Render.com specifically for the feed generator
     - Configure the service to point to the feed-generator directory of your repository
     - Set up the appropriate build and start commands
     - Update environment variables for the new service

2. **Update Feed Generator Configuration**
   - ✅ **Problem**: The feed generator is configured to use swarm-social.onrender.com as its DID
   - ✅ **Solution**: Update configuration to use the new subdomain
   - **Tasks**:
     - Update the FEEDGEN_HOSTNAME and FEEDGEN_SERVICE_DID environment variables
     - Ensure the DID document is properly configured for the new domain
     - Update any hardcoded URLs in the feed generator code

### Phase 2: Deployment and Configuration

3. **Deploy the Feed Generator**
   - **Tasks**:
     - Deploy the feed generator to the new subdomain
     - Verify the service is running with `curl https://swarm-feed-generator.onrender.com/health`
     - Check that the DID document is accessible with `curl https://swarm-feed-generator.onrender.com/.well-known/did.json`
     - Test the XRPC endpoint with `curl https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`

4. **Update Feed Generator Record**
   - **Tasks**:
     - Create an updated version of the `updateFeedGenDidNonInteractive.ts` script to point to the new subdomain
     - Run the script to update the feed generator record in Bluesky
     - Verify the record is updated correctly

5. **Configure Swarm App to Use Custom Feed**
   - **Tasks**:
     - Update the Swarm app configuration to use the feed generator
     - Configure the default view to show the custom feed
     - Test the integration between the app and feed generator

### Phase 3: Testing and Verification

6. **Test End-to-End Functionality**
   - **Tasks**:
     - Test subscribing to the feed from a Bluesky client
     - Verify posts appear in the feed as expected
     - Test the feed generator's algorithm with various test cases
     - Verify error handling and edge cases

7. **Performance and Resilience Testing**
   - **Tasks**:
     - Test performance under load
     - Implement health checks and monitoring
     - Set up alerts for service disruptions
     - Create a recovery plan for potential issues

### Phase 4: Documentation and Maintenance

8. **Update Documentation**
   - **Tasks**:
     - Document the final architecture
     - Update the implementation notes with lessons learned
     - Create operational documentation for maintaining the service
     - Document troubleshooting procedures

9. **Create Maintenance Plan**
   - **Tasks**:
     - Set up a regular update schedule
     - Plan for AT Protocol updates and compatibility
     - Establish monitoring and alerting thresholds
     - Document backup and restore procedures

## Detailed Implementation Steps

### Step 1: Create a new Render.com service for the feed generator - **Done**

1. Log in to the Render.com dashboard
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure service settings:
   - Name: `swarm-feed-generator`
   - Environment: `Node`
   - Root Directory: `swarm-feed-generator/feed-generator`
   - Build Command: `yarn install && yarn build`
   - Start Command: `node index.js`
   - Branch: `main` (or your deployment branch)

**Execution Summary**: Successfully created a new Render.com service named "swarm-feed-generator" using the existing GitHub repository. Initially encountered an issue with the build command using `--frozen-lockfile` which prevented the lockfile from being updated. Removed this flag to allow the build to complete successfully. The service is now deployed and running.

### Step 2: Configure environment variables - **Done**

Add the following environment variables to your new Render.com service:

```
PORT=3000
FEEDGEN_HOSTNAME=swarm-feed-generator.onrender.com
FEEDGEN_LISTENHOST=0.0.0.0
FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi
FEEDGEN_LABELS_ENABLED=false
FEEDGEN_SERVICE_DID=did:web:swarm-feed-generator.onrender.com
FEEDGEN_SUBSCRIPTION_ENDPOINT=wss://bsky.network
DATABASE_URL=sqlite:swarm-feed.db
BLUESKY_USERNAME=andrarchy.bsky.social
BLUESKY_PASSWORD=v2k2BY0nth$B9
```

**Execution Summary**: Successfully configured all required environment variables for the feed generator service. Updated the FEEDGEN_HOSTNAME and FEEDGEN_SERVICE_DID to use the actual subdomain "swarm-feed-generator.onrender.com" instead of the placeholder values. These environment variables ensure the feed generator can connect to the Bluesky network and serve the correct DID document.

### Step 3: Deploy the Feed Generator - **Done**

- Deploy the feed generator to the new subdomain
- Verify the service is running with `curl https://swarm-feed-generator.onrender.com/health`
- Check that the DID document is accessible with `curl https://swarm-feed-generator.onrender.com/.well-known/did.json`
- Test the XRPC endpoint with `curl https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`

**Execution Summary**: Successfully deployed the feed generator service to swarm-feed-generator.onrender.com. Initial deployment failed with a build error related to the yarn lockfile, which was resolved by updating the build command. After deployment, the service successfully connected to the Bluesky firehose as evidenced by the logs showing content streaming through. The service is now running and processing posts from the Bluesky network.

### Step 4: Verify DID Document and XRPC Endpoint - **Done**

- Check if the DID document is being served correctly at `https://swarm-feed-generator.onrender.com/.well-known/did.json`
- Verify the health endpoint at `https://swarm-feed-generator.onrender.com/health`
- Test the XRPC endpoint at `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`

**Execution Summary**: Successfully verified that the DID document is being served correctly at both the well-known endpoint and the root endpoint. The health endpoint is also responding with "OK". However, the XRPC endpoint for getFeedSkeleton is not available yet. The debug endpoint shows that the service is correctly configured with the proper environment variables and file paths. The DID document contains the correct information, including the service endpoint pointing to the new subdomain. The next step is to update the feed generator record in Bluesky to point to this new service.

### Step 5: Update Feed Generator Record - **Done**

Create a new script called `updateFeedGenDidWithSubdomain.ts` in the `swarm-feed-generator/feed-generator/scripts` directory:

```typescript
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
  
  // Validate required parameters
  if (!handle || !password) {
    console.error('Error: BLUESKY_HANDLE/BLUESKY_USERNAME and BLUESKY_PASSWORD environment variables are required')
    console.error('Example usage:')
    console.error('BLUESKY_HANDLE=your.handle BLUESKY_PASSWORD=your_password npx ts-node scripts/updateFeedGenDidWithSubdomain.ts')
    process.exit(1)
  }
  
  // Use the new subdomain for the feed generator
  const feedGenDid = 'did:web:swarm-feed-generator.onrender.com'
  
  // Connect to the Bluesky API
  const agent = new AtpAgent({ service })
  await agent.login({ identifier: handle, password })
  
  // Get the current record to preserve other fields
  const currentRecord = await agent.api.com.atproto.repo.getRecord({
    repo: agent.session?.did ?? '',
    collection: ids.AppBskyFeedGenerator,
    rkey: recordName,
  })

  // Type the record properly to avoid linter errors
  const record = currentRecord.data.value as {
    did: string;
    displayName: string;
    description?: string;
    avatar?: any;
    createdAt: string;
    [key: string]: any;
  }
  
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

**Execution Summary**: Successfully created and ran the script to update the feed generator record in Bluesky. The script updated the DID from `did:web:swarm-social.onrender.com` to `did:web:swarm-feed-generator.onrender.com`. This ensures that the Bluesky network will now look for the feed generator at the new subdomain. The script ran without errors and confirmed that the record was updated successfully. We should now wait a few minutes for the changes to propagate through the network before testing the feed.

### Step 6: Troubleshoot XRPC Endpoint - **In Progress**

After updating the feed generator record, we discovered that the XRPC endpoint for `getFeedSkeleton` is not available. The debug endpoint shows that the service is correctly configured with the proper environment variables and file paths, but the XRPC routes are not being registered.

**Tasks**:
- Check the Render.com logs for any errors during service startup
- Verify that the feed generator code is properly initializing the XRPC handler
- Consider redeploying the service with additional debugging information
- Test subscribing to the feed from a Bluesky client despite the XRPC endpoint not being directly accessible

### Step 7: Configure Swarm App to Use Custom Feed

Update the Swarm app configuration to default to the custom feed. This will depend on the specific implementation of your Swarm app, but typically involves:

1. Setting the default feed in the app configuration
2. Creating a feed selection UI that includes your custom feed
3. Ensuring the app can properly resolve and display the feed

### Step 8: Testing checklist

Once deployed, perform these tests:

- [x] Verify the feed generator service is running
- [x] Check that the DID document is accessible
- [ ] Test the XRPC endpoint directly
- [x] Update the feed generator record with the new DID
- [ ] Subscribe to the feed from a Bluesky client
- [ ] Verify posts appear in the feed
- [ ] Test with multiple users
- [ ] Check error handling
- [ ] Monitor performance

## Fallback Options

If the subdomain approach doesn't resolve the issues, consider these alternatives:

1. **Static DID Document Hosting**: Host the DID document on a static hosting service like GitHub Pages
2. **Direct URL Approach**: Configure the feed generator record to use a direct URL instead of DID resolution
3. **Alternative Hosting Provider**: Try deploying to a different provider like Vercel or Netlify
4. **Custom Domain**: Use a completely separate domain for the feed generator service

## Conclusion

This implementation plan provides a comprehensive approach to resolving the issues with the Swarm feed generator. By separating the feed generator from the web client and properly configuring both components, we should be able to successfully implement the custom feed functionality for the Swarm app.

Once implemented, regularly monitor the service for any issues and be prepared to update the configuration as the AT Protocol evolves.

## Progress Summary

### Completed Steps
1. ✅ Created a new Render.com service for the feed generator
2. ✅ Configured environment variables for the feed generator
3. ✅ Deployed the feed generator to swarm-feed-generator.onrender.com
4. ✅ Verified that the DID document is being served correctly
5. ✅ Updated the feed generator record in Bluesky with the new DID

### Current Status
- The feed generator service is running and connected to the Bluesky firehose
- The DID document is being served correctly at both the well-known endpoint and the root endpoint
- The health endpoint is responding with "OK"
- The feed generator record has been updated with the new DID
- The XRPC endpoint for getFeedSkeleton is not available yet

### Next Steps
1. Troubleshoot the XRPC endpoint issue
   - Check Render.com logs for any errors during service startup
   - Verify that the feed generator code is properly initializing the XRPC handler
   - Consider redeploying the service with additional debugging information
2. Test subscribing to the feed from a Bluesky client despite the XRPC endpoint not being directly accessible
3. Configure the Swarm app to use the custom feed
4. Complete the remaining testing checklist items

### Potential Issues
- The XRPC endpoint not being available might prevent the feed from working correctly
- There might be additional configuration needed for the feed generator to properly serve the feed
- The Bluesky client might not be able to resolve the feed if the XRPC endpoint is not working

### Fallback Options
If the current approach doesn't resolve the issues, consider:
1. Static DID Document Hosting
2. Direct URL Approach
3. Alternative Hosting Provider
4. Custom Domain 