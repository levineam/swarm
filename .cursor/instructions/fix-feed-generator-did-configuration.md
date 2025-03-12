# Fix Feed Generator DID Configuration

This document outlines the steps to fix the feed generator DID configuration for the Swarm social app deployed on Render.

## Current Status

- ✅ The DID `did:plc:ouadmsyvsfcpkxg3yyz4trqi` is properly registered in the PLC directory.
- ✅ The algorithm record has been created with URI: `at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`.
- ✅ The `.env` file has been updated with the correct DID configuration:
  ```
  FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi
  FEEDGEN_SERVICE_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi
  ```
- ✅ The client application is using the correct feed URI:
  ```typescript
  export const FEED_URI =
    'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'
  ```
- ✅ The feed generator service is properly configured to use the DIDs from the environment variables.

## Next Steps

1. **Deploy the Updated Feed Generator Service**:
   - Push the changes to the repository.
   - Deploy the updated feed generator service to Render.
   - Ensure the service is accessible at `https://swarm-social.onrender.com`.

2. **Verify the Feed Generator Service**:
   - After deployment, verify that the feed generator service is working correctly by accessing:
     ```
     https://swarm-social.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
     ```
   - The response should include the correct DID and feed URI.

3. **Test the Feed in the Client Application**:
   - Open the client application and navigate to the Swarm Community feed.
   - Verify that posts from Swarm community members are displayed.

4. **Update the Swarm Community Members List**:
   - Add relevant DIDs to the `SWARM_COMMUNITY_MEMBERS` array in `swarm-community-members.ts`.
   - This will ensure that posts from these users are included in the feed.

5. **Monitor the Feed Generator Service**:
   - Keep an eye on the logs to ensure the service is functioning correctly.
   - Check for any errors related to DID resolution or feed generation.

## Troubleshooting

If you encounter issues with the feed generator service:

1. **Check the DID Configuration**:
   - Verify that the DIDs in the `.env` file match the DID in the PLC directory.
   - Ensure the algorithm record URI is correct.

2. **Check the Feed Generator Service Logs**:
   - Look for any errors related to DID resolution or feed generation.
   - Ensure the service is properly connected to the Bluesky firehose.

3. **Verify the Feed Generator Endpoint**:
   - Test the feed generator endpoint directly:
     ```
     curl https://swarm-social.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community
     ```
   - The response should include a feed skeleton with posts from Swarm community members.

4. **Update the Bluesky Access Token**:
   - If the feed generator is unable to connect to the Bluesky firehose, the access token may have expired.
   - Generate a new token using the `get-bluesky-token.js` script and update the `.env` file. 