# Feed-Indexing-Troubleshooting

This document provides a comprehensive troubleshooting guide for the Swarm feed generator service, focusing on the persistent issue of posts not appearing in the feed.

## Problem Overview

The primary issue is that posts from Swarm Community members are not consistently appearing in the Swarm Community feed, despite:
- The service being operational
- The DID resolution working correctly
- The feed generator record being properly registered in Bluesky
- The user's DID being correctly listed in the `SWARM_COMMUNITY_MEMBERS` array

## Diagnostic Steps

### 1. Verify Service Health

```bash
# Check basic service health
curl -i https://swarm-feed-generator.onrender.com/health

# Check if feed endpoints are responding
curl -i https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
curl -i https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community

# Run the service health check script
node scripts/check-service-health.js
```

### 2. Verify DID Resolution

```bash
# Check DID resolution via PLC directory
curl -i https://plc.directory/did:web:swarm-feed-generator.onrender.com

# If the DID is not resolving, force resolution
node scripts/force-did-resolution.js
```

### 3. Verify Feed Generator Record

```bash
# Check if the feed generator record exists and has the correct DID
node scripts/checkFeedRecord.js
```

### 4. Test Feed Indexing

```bash
# Create a test post
node scripts/create-test-post.js

# Check if the post appears in the feed (wait a few minutes after posting)
node scripts/test-feed-indexing.js
```

## Root Causes

Through extensive troubleshooting, we've identified several root causes for the feed indexing issues:

1. **Service Hibernation**: 
   - Render's free tier services hibernate after 15 minutes of inactivity
   - When hibernated, the service misses posts published during that time
   - The service takes time to "wake up" when accessed again

2. **Non-Persistent Database**: 
   - The SQLite database is stored in ephemeral storage on Render's free tier
   - The database is reset when the service restarts or is redeployed
   - Previously indexed posts are lost after a service restart

3. **Firehose Subscription Issues**:
   - The feed generator may not correctly reconnect to the firehose after hibernation
   - The reconnection logic may have limitations in handling service interruptions
   - There might be rate limiting or connection issues with the firehose service

4. **HTTP Method Handling**:
   - Some HTTP requests (particularly HEAD requests) might not be properly handled
   - This can affect how the service responds to certain requests

## Troubleshooting Steps

### Problem: Posts Not Appearing in Feed

#### Step 1: Wake Up and Check the Service

1. Visit the service URL to wake it up:
   ```bash
   curl -i https://swarm-feed-generator.onrender.com/
   ```

2. Check if the service is responding to health checks:
   ```bash
   curl -i https://swarm-feed-generator.onrender.com/health
   ```

3. Run the comprehensive health check script:
   ```bash
   node scripts/check-service-health.js
   ```

#### Step 2: Verify Your DID is in the Community Members List

1. Check the Swarm community members file:
   ```bash
   cat swarm-feed-generator/feed-generator/src/swarm-community-members.ts
   ```

2. Make sure your DID is correctly listed in the `SWARM_COMMUNITY_MEMBERS` array.

#### Step 3: Restart the Feed Generator Service

1. Restart the service manually via the Render dashboard, or:
2. Use the restart script (requires Render API key):
   ```bash
   node scripts/restart-render-service.js
   ```

#### Step 4: Test with a New Post

1. Create a test post:
   ```bash
   node scripts/create-test-post.js
   ```

2. Wait 5-10 minutes for the post to be indexed.

3. Check if the post appears in the feed:
   ```bash
   node scripts/test-feed-indexing.js
   ```

#### Step 5: Manually Add Posts to the Feed

If posts are still not appearing, you can try manually adding them:

1. Get the URI of the post you want to add.

2. Use the manual post addition script:
   ```bash
   node scripts/manually-add-post.js at://did:plc:yourdid/app.bsky.feed.post/postid
   ```

3. Check if the post appears in the feed after manual addition.

### Problem: Service Frequently Hibernating

1. Set up a script to keep the service active:
   ```bash
   node scripts/keep-service-active.js
   ```

2. Configure a cron job or scheduled task to run this script every 10-15 minutes.

3. Consider using a service like UptimeRobot to ping the service regularly.

## Tracking Progress and Debugging

It's helpful to maintain a log of troubleshooting attempts and their outcomes. For each troubleshooting session:

1. Record the date and time
2. List the symptoms observed
3. Document the steps taken
4. Note the outcomes of each step
5. Document any changes made to the service

### Example Troubleshooting Log Entry

```
Date: 2025-03-14
Time: 15:00 UTC
Symptoms: 
- Posts not appearing in feed
- Feed endpoint responding with 200 but only returning 2 posts

Steps Taken:
1. Verified service health (all endpoints responding)
2. Confirmed DID resolution working
3. Restarted service using scripts/restart-render-service.js
4. Created test post at 15:10 UTC
5. Ran test-feed-indexing.js at 15:20 UTC - post still not in feed
6. Manually added post using scripts/manually-add-post.js

Outcome:
- Post appeared in feed after manual addition
- Concluded that firehose subscription is not working correctly

Changes Made:
- Added adminAuth middleware and endpoint for manual post addition
- Committed changes to the repository
```

## Long-Term Solutions

For a more permanent solution to these issues, consider:

1. **Upgrading to a Paid Tier on Render**:
   - No service hibernation
   - Persistent storage
   - Better performance and reliability

2. **Implementing a More Robust Database Solution**:
   - Use a managed database service instead of SQLite
   - Set up regular database backups

3. **Improving Firehose Subscription Logic**:
   - Enhance reconnection handling
   - Implement better error recovery
   - Add comprehensive logging for subscription events

4. **Setting Up Monitoring and Alerts**:
   - Configure alerts for service downtime
   - Monitor database size and performance
   - Track firehose connection status

## Maintenance Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/check-service-health.js` | Checks if all service endpoints are responding | `node scripts/check-service-health.js` |
| `scripts/force-did-resolution.js` | Forces DID resolution | `node scripts/force-did-resolution.js` |
| `scripts/keep-service-active.js` | Keeps the service active to prevent hibernation | `node scripts/keep-service-active.js` |
| `scripts/restart-render-service.js` | Restarts the feed generator service on Render | `node scripts/restart-render-service.js` |
| `scripts/create-test-post.js` | Creates a test post with a unique identifier | `node scripts/create-test-post.js` |
| `scripts/test-feed-indexing.js` | Tests if posts are being indexed | `node scripts/test-feed-indexing.js` |
| `scripts/manually-add-post.js` | Manually adds a post to the feed | `node scripts/manually-add-post.js <post-uri>` |
| `scripts/manually-add-post-to-db.js` | Directly adds a post to the database | `node scripts/manually-add-post-to-db.js <post-uri>` |
| `scripts/checkFeedRecord.js` | Checks the feed generator record in Bluesky | `node scripts/checkFeedRecord.js` |

## Conclusion

Troubleshooting the Swarm feed generator requires a systematic approach to identify and address the various issues that can prevent posts from appearing in the feed. By following this guide and using the provided scripts, you can effectively diagnose and resolve these issues over time.

Remember to regularly check the service health and consider implementing the long-term solutions to avoid recurring problems.

---

**Last Updated**: March 14, 2025  
**Created By**: Claude AI Assistant  
**Version**: 1.0 