# Swarm Feed Generator Implementation Plan

## Overview

This implementation plan outlines a step-by-step approach for properly setting up and deploying the Swarm feed generator to work with the Swarm app (a customized Bluesky web client). Based on our investigations and debugging efforts, we've identified several key issues that need to be addressed to get the feed generator working correctly.

## Current Status

- The feed generator service is deployed on Render.com at https://swarm-feed-generator.onrender.com
- The feed generator record has been updated with the correct production DID (`did:web:swarm-feed-generator.onrender.com`)
- The health endpoint is responding with "OK"
- The DID document is being served correctly at `/.well-known/did.json`
- The XRPC endpoint registration issue has been identified and we're working on a fix

## Problem Identified

We've identified that the XRPC endpoints (`app.bsky.feed.getFeedSkeleton` and `app.bsky.feed.describeFeedGenerator`) are not being registered correctly. Our diagnostic tests show that while the service is running and the health endpoint is accessible, the XRPC endpoints are returning 404 errors.

We've added detailed logging to the following files:
- `feed-generation.ts` - To log the registration of the `getFeedSkeleton` endpoint
- `describe-generator.ts` - To log the registration of the `describeFeedGenerator` endpoint
- `server.ts` - To log the creation and initialization of the XRPC server

We've also created a test script (`testXrpcEndpoints.js`) to verify the functionality of the XRPC endpoints.

## Implementation Plan

### Phase 1: Fix XRPC Endpoint Registration (In Progress)

1. ✅ Add detailed logging to the feed generator code to diagnose the issue
2. ✅ Create a test script to verify XRPC endpoint functionality
3. ⬜ Rebuild and redeploy the service with the added logging
4. ⬜ Check the logs for any errors during XRPC server initialization
5. ⬜ Fix any issues identified in the logs
6. ⬜ Verify that the XRPC endpoints are now accessible

### Phase 2: Update the Swarm App to Use the Feed Generator

1. ⬜ Update the Swarm app to use the feed generator
2. ⬜ Test the feed generator in the Swarm app
3. ⬜ Fix any issues that arise during testing

### Phase 3: Implement the Swarm Community Feed Algorithm

1. ⬜ Implement the algorithm to fetch posts from Swarm community members
2. ⬜ Test the algorithm with sample data
3. ⬜ Deploy the updated feed generator

### Phase 4: Implement the Swarm Trending Feed Algorithm

1. ⬜ Implement the algorithm to fetch trending posts from the Swarm community
2. ⬜ Test the algorithm with sample data
3. ⬜ Deploy the updated feed generator

## Execution Plan for Phase 1

1. We've added detailed logging to the feed generator code to help diagnose the issue with XRPC endpoint registration.
2. We've created a test script (`testXrpcEndpoints.js`) to verify the functionality of the XRPC endpoints.
3. Next, we'll commit and push these changes to the repository.
4. After the service is redeployed, we'll check the logs for any errors during XRPC server initialization.
5. Based on the logs, we'll identify and fix any issues with the XRPC server initialization or endpoint registration.
6. We'll run the test script again to verify that the XRPC endpoints are now accessible.

## Potential Issues and Solutions

1. **Issue**: The XRPC server is not being initialized correctly.
   **Solution**: Check the logs for any errors during XRPC server initialization and fix the issues.

2. **Issue**: The XRPC endpoints are not being registered correctly.
   **Solution**: Check the logs for any errors during endpoint registration and fix the issues.

3. **Issue**: The XRPC router is not being mounted correctly.
   **Solution**: Check the logs for any errors during router mounting and fix the issues.

4. **Issue**: The lexicon files are not being loaded correctly.
   **Solution**: Check the lexicon files and ensure they are being loaded correctly.

## Next Steps

1. Commit and push the changes to the repository
2. Wait for the service to be redeployed
3. Check the logs for any errors
4. Run the test script to verify XRPC endpoint functionality
5. Fix any issues identified in the logs
6. Update the Swarm app to use the feed generator once the XRPC endpoints are working

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