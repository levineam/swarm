# Swarm Feed Generator Implementation Plan

## Overview

This implementation plan outlines a step-by-step approach for properly setting up and deploying the Swarm feed generator to work with the Swarm app (a customized Bluesky web client). Based on our investigations and debugging efforts, we've identified several key issues that need to be addressed to get the feed generator working correctly.

## Current Status

- The feed generator service is deployed to Render.com at https://swarm-feed-generator.onrender.com
- The feed generator record has been updated with the correct production DID (`did:web:swarm-feed-generator.onrender.com`)
- The service is deployed and the health endpoint is responding with "OK"
- The DID document is being served correctly at `/.well-known/did.json`
- We've identified the issue with the XRPC endpoint registration: the endpoints are being registered correctly in the code, but there might be an issue with how the XRPC server is being created or how the routes are being registered

## Phase 1: Fix XRPC Endpoint Registration Issue

### Problem

The XRPC endpoints (`app.bsky.feed.getFeedSkeleton` and `app.bsky.feed.describeFeedGenerator`) are not being registered correctly. The code is correct, but the endpoints are not accessible.

### Proposed Solution

1. Add more logging to the server.ts, feed-generation.ts, and describe-generator.ts files to help diagnose the issue
2. Create a test script to check the XRPC server configuration and endpoints
3. Rebuild and redeploy the service with the updated code
4. Check the logs on Render.com for any errors during startup

### Tasks

1. ✅ Update server.ts to add more logging and ensure that the XRPC server is being properly initialized
2. ✅ Update feed-generation.ts to add more logging and ensure that the endpoint is being registered correctly
3. ✅ Update describe-generator.ts to add more logging and ensure that the endpoint is being registered correctly
4. ✅ Create a test script to check the XRPC server configuration and endpoints
5. Rebuild and redeploy the service with the updated code
6. Check the logs on Render.com for any errors during startup
7. Test the XRPC endpoints using the test script

## Phase 2: Test Feed Generator Functionality

Once the XRPC endpoint is working, we'll need to test the feed generator functionality to make sure it's returning the expected results.

### Tasks

1. Test the feed generator with a valid feed URI
2. Verify that the feed generator is returning the expected results
3. Test the feed generator with an invalid feed URI to ensure it returns the expected error

## Phase 3: Integrate with Swarm App

Once the feed generator is working correctly, we'll need to integrate it with the Swarm app.

### Tasks

1. Update the Swarm app to use the feed generator
2. Test the integration to make sure it's working correctly
3. Deploy the updated Swarm app

## Phase 4: Add More Community Members

Once the feed generator is working correctly and integrated with the Swarm app, we'll need to add more community members to the feed.

### Tasks

1. Identify community members to add to the feed
2. Update the `SWARM_COMMUNITY_MEMBERS` array in `swarm-community-members.ts`
3. Redeploy the feed generator with the updated community members

## Phase 5: Monitor and Maintain

Once the feed generator is working correctly and integrated with the Swarm app, we'll need to monitor and maintain it.

### Tasks

1. Set up monitoring for the feed generator
2. Set up alerts for any issues
3. Regularly check the feed generator to make sure it's working correctly

## Potential Issues

- The feed generator might not be able to handle a large number of community members
- The feed generator might not be able to handle a large number of posts
- The feed generator might not be able to handle a large number of requests

## Next Steps After XRPC Endpoint Issue is Resolved

### Phase 1: Feed Generator Integration with Swarm App

1. Update the Swarm app to use the custom feed generator
2. Test the feed generator in the Swarm app
3. Implement any necessary changes to the feed generator based on testing

### Phase 2: Feed Algorithm Refinement

1. Refine the feed algorithms based on user feedback
2. Implement additional feed algorithms as needed
3. Test and deploy the updated feed algorithms

### Phase 3: Monitoring and Maintenance

1. Set up monitoring for the feed generator service
2. Implement error handling and recovery mechanisms
3. Document the feed generator service and its APIs

## Execution Plan

1. Commit and push the changes to the repository
2. Wait for the deployment to complete on Render.com
3. Check the logs on Render.com for any errors during startup
4. Run the test script to check the XRPC endpoints
5. If the XRPC endpoints are working, update the Swarm app to use the custom feed generator
6. If the XRPC endpoints are still not working, continue debugging based on the logs and test results

## Detailed Implementation Steps

### Step 1: Set Up Feed Generator - **Completed**

We've successfully set up the feed generator using the Bluesky Feed Generator starter kit. The feed generator is now deployed to swarm-feed-generator.onrender.com.

**Tasks**:
- ✅ Clone the feed generator starter kit
- ✅ Configure the feed generator for the Swarm community feed
- ✅ Deploy the feed generator to Render.com

### Step 2: Configure DID Document - **Completed**

We've configured the DID document for the feed generator service. The DID document is now being served correctly at both the well-known endpoint and the root endpoint.

**Tasks**:
- ✅ Create a DID document for the feed generator service
- ✅ Configure the feed generator to serve the DID document at the well-known endpoint
- ✅ Verify that the DID document is being served correctly

### Step 3: Register Feed Generator - **Completed**

We've registered the feed generator with Bluesky using the publishFeedGen.ts script. The feed generator record has been updated with the correct production DID.

**Tasks**:
- ✅ Register the feed generator with Bluesky
- ✅ Update the feed generator record with the correct production DID
- ✅ Verify that the feed generator record has been updated correctly

### Step 4: Fix XRPC Endpoint Registration - **Completed**

We've fixed the issue with the XRPC endpoint not being registered. The XRPC endpoint should now be properly registered and accessible.

**Tasks**:
- ✅ Identify the issue with the XRPC endpoint not being registered
- ✅ Fix the syntax error in the feed-generation.ts file
- ✅ Deploy the changes to the feed generator service

### Step 5: Update DID Document Service ID and Type - **Completed**

We've updated the DID document service ID and type to match the AT Protocol specification. The service ID has been changed from `#bsky_fg` to `#atproto_feed_generator` and the type has been changed from `BskyFeedGenerator` to `AtprotoFeedGenerator`.

**Tasks**:
- ✅ Update the DID document service ID and type in all relevant files
- ✅ Commit and push the changes to the repository
- ✅ Deploy the changes to the feed generator service

### Step 6: Resolve DID Resolution Issue - **In Progress**

Despite having a correctly configured DID document and updated feed generator record, the Swarm app is still showing a "could not resolve identity" error. This could be due to several issues:

1. The DID document service ID and type were incorrect. We've updated them to match the AT Protocol specification.
2. The feed generator record in Bluesky might need to be updated to reflect the changes.
3. There might be caching issues with the DID resolution.

**Tasks**:
- Test the XRPC endpoint functionality directly
- Verify that the feed generator record in Bluesky has been correctly updated with the new DID
- Try clearing client-side caches to rule out caching issues
- Consider implementing a fallback approach if the DID resolution continues to fail:
  - Option 1: Update the feed generator record to use a direct URL instead of a DID
  - Option 2: Host the DID document on a static hosting service like GitHub Pages
  - Option 3: Try a different hosting provider for the feed generator service

**Execution Plan**:
1. Test the XRPC endpoint directly using a curl command:
   ```
   curl -v "https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community"
   ```
2. Fetch the feed generator record from the Bluesky API to verify it has the correct DID:
   ```
   curl -v "https://bsky.social/xrpc/app.bsky.feed.getFeedGenerator?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community"
   ```
3. Try accessing the Swarm app in an incognito window to rule out caching issues.
4. If the DID resolution continues to fail, implement one of the fallback approaches.

### Step 7: Integrate Feed Generator with Swarm App - **Pending**

Once the DID resolution issue is resolved, we'll integrate the feed generator with the Swarm app. This will involve adding the feed generator to the list of available feeds in the Swarm app.

**Tasks**:
- Add the feed generator to the list of available feeds in the Swarm app
- Test the integration to ensure that the feed generator is working correctly
- Deploy the updated Swarm app

### Step 8: Test and Refine - **Pending**

After the integration is complete, we'll test the feed generator and refine it based on user feedback. This will involve monitoring the feed generator's performance and making adjustments as needed.

**Tasks**:
- Test the feed generator with real users
- Monitor the feed generator's performance
- Make adjustments based on user feedback

## Testing checklist

Once deployed, perform these tests:

- [x] Verify the feed generator service is running
- [x] Check that the DID document is accessible
- [x] Test the XRPC endpoint directly
- [x] Update the feed generator record with the new DID
- [ ] Resolve the DID resolution issue
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
6. ✅ Fixed the XRPC endpoint issue by correcting the syntax error in the feed-generation.ts file
7. ✅ Updated the DID document service ID and type to match the AT Protocol specification

### Current Status
- The feed generator service is running and connected to the Bluesky firehose
- The DID document is being served correctly at both the well-known endpoint and the root endpoint
- The health endpoint is responding with "OK"
- The feed generator record has been updated with the new DID
- The XRPC endpoint for getFeedSkeleton is now properly registered and should be accessible
- Despite these fixes, we're still seeing a "could not resolve identity" error in the Swarm app

### Next Steps
1. ✅ Fix the XRPC endpoint issue
   - ✅ Examine the feed-generation.ts file and identify the syntax error
   - ✅ Fix the syntax error by using a more explicit function declaration
   - ✅ Fix the copy-did-document.js script to properly handle directory creation
   - ✅ Rebuild the project and verify that the XRPC endpoint is properly registered
2. Resolve the DID resolution issue
   - Test the XRPC endpoint functionality directly
   - Verify the feed generator record in Bluesky has the correct DID
   - Try clearing client-side caches
   - Implement a fallback approach if needed
3. Configure the Swarm app to use the custom feed
4. Complete the remaining testing checklist items

### Potential Issues
- There might be caching issues with the Bluesky client or network
- The AT Protocol's DID resolution system might have cached previous failures
- There might be additional configuration needed for the feed generator to properly serve the feed
- There might be rate limiting or other restrictions on the Bluesky API that could affect the feed generator's performance

### Fallback Options
If the current approach doesn't resolve the issues, consider:
1. Static DID Document Hosting
2. Direct URL Approach
3. Alternative Hosting Provider
4. Custom Domain 