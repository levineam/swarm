# Feed-Indexing-Troubleshooting

This document provides a comprehensive troubleshooting guide for the Swarm feed generator service, focusing on the persistent issue of posts not appearing in the feed.

## Problem Overview

The primary issue is that posts from Swarm Community members are not consistently appearing in the Swarm Community feed, despite:
- The service being operational
- The DID resolution working correctly
- The feed generator record being properly registered in Bluesky
- The user's DID being correctly listed in the `SWARM_COMMUNITY_MEMBERS` array
- Posts being successfully indexed in the database

## Diagnostic Steps

### 1. Verify Service Health

```bash
# Check basic service health
curl -i https://swarm-feed-generator.onrender.com/health

# Check if feed endpoints are responding
curl -i https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
curl -i https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community

# Run the feed indexing health check script
node scripts/check-feed-indexing-health.js
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

### 4. Check Database Status

```bash
# Check database stats to see if posts are being indexed
curl -s "https://swarm-feed-generator.onrender.com/admin/stats" | jq

# Check if posts from a specific DID are being indexed
curl -s "https://swarm-feed-generator.onrender.com/admin/stats?did=YOUR_DID_HERE" | jq
```

### 5. Test Feed Indexing

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

4. **Feed Algorithm Filtering Issues**:
   - Posts may be correctly indexed in the database but not appearing in the feed
   - The feed algorithm may not be properly filtering posts from community members
   - The query in `swarm-community.ts` may not be correctly using the `SWARM_COMMUNITY_MEMBERS` array

5. **HTTP Method Handling**:
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
   node scripts/check-feed-indexing-health.js
   ```

#### Step 2: Verify Your DID is in the Community Members List

1. Check the Swarm community members file:
   ```bash
   cat swarm-feed-generator/feed-generator/src/swarm-community-members.ts
   ```

2. Make sure your DID is correctly listed in the `SWARM_COMMUNITY_MEMBERS` array.

#### Step 3: Check if Posts are Being Indexed

1. Check the database stats:
   ```bash
   curl -s "https://swarm-feed-generator.onrender.com/admin/stats" | jq
   ```

2. Check if posts from your DID are being indexed:
   ```bash
   curl -s "https://swarm-feed-generator.onrender.com/admin/stats?did=YOUR_DID_HERE" | jq
   ```

#### Step 4: Restart the Feed Generator Service

1. Restart the service manually via the Render dashboard, or:
2. Use the restart script (requires Render API key):
   ```bash
   node scripts/restart-render-service.js
   ```

#### Step 5: Test with a New Post

1. Create a test post:
   ```bash
   node scripts/create-test-post.js
   ```

2. Wait 5-10 minutes for the post to be indexed.

3. Check if the post appears in the feed:
   ```bash
   node scripts/test-feed-indexing.js
   ```

#### Step 6: Manually Add Posts to the Feed

If posts are being indexed but not appearing in the feed, you can manually add them using the admin endpoint:

1. Get the URI of the post you want to add.

2. Use the admin endpoint to add the post to the feed:
   ```bash
   curl -X POST "https://swarm-feed-generator.onrender.com/admin/update-feed" \
     -H "Content-Type: application/json" \
     -d '{
       "feedUri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community",
       "postUris": ["at://did:plc:yourdid/app.bsky.feed.post/postid"]
     }'
   ```

3. Check if the post appears in the feed after manual addition:
   ```bash
   curl -s "https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community" | jq
   ```

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
Date: 2025-03-15
Time: 16:30 UTC
Symptoms: 
- Posts not appearing in feed
- Feed endpoint responding with 200 but returning empty feed array
- Database stats showing posts being indexed (132+ posts in database)

Steps Taken:
1. Verified service health (all endpoints responding)
2. Confirmed DID resolution working
3. Created test post at 16:33 UTC
4. Checked database stats - post indexed but not in feed
5. Manually added post using admin endpoint

Outcome:
- Post appeared in feed after manual addition
- Concluded that feed algorithm is not properly filtering posts

Changes Made:
- Added posts to the feed using the admin endpoint
```

## Long-Term Solutions

For a more permanent solution to these issues, consider:

1. **Upgrading to a Paid Tier on Render**: ✅ **IMPLEMENTED**
   - The service has been upgraded to a paid tier, which eliminates hibernation issues and provides persistent storage.
   - This has significantly improved the reliability of the feed generator, ensuring that the firehose subscription remains stable and posts are properly indexed.
   - We've observed much better performance and reliability since the upgrade, with fewer instances of posts not appearing in the feed.

2. **Implementing a More Robust Database Solution**:
   - Use a managed database service instead of SQLite
   - Set up regular database backups
   - With the paid tier on Render, the SQLite database is now persistent, but a managed database would provide additional reliability.

3. **Improving Firehose Subscription Logic**:
   - Enhance reconnection handling
   - Implement better error recovery
   - Add comprehensive logging for subscription events
   - The paid tier has reduced the need for this by keeping the service active 24/7, but improvements to the firehose subscription logic would still be beneficial.

4. **Fixing the Feed Algorithm**:
   - Review and fix the query in `swarm-community.ts`
   - Ensure it correctly filters posts from community members
   - Add logging to debug the filtering process
   - This remains a priority even with the paid tier, as the feed algorithm is still not consistently filtering posts correctly.

5. **Implementing a Scheduled Task for Post Addition**: ✅ **IMPLEMENTED**
   - Created a script (`auto-add-community-posts.js`) that periodically checks for new posts from community members
   - Automatically adds these posts to the feed using the admin endpoint
   - Set up a GitHub Actions workflow to run this script hourly
   - This ensures that posts appear in the feed even if there are issues with the feed algorithm.

6. **Setting Up Monitoring and Alerts**:
   - Configure alerts for service downtime
   - Monitor database size and performance
   - Track firehose connection status
   - This becomes more important with the paid tier to ensure we're getting value from the service.

## Current Status (March 20, 2025)

The feed generator service is now running on a paid tier on Render, which has resolved many of the issues we were experiencing:

1. **Service Hibernation**: The service now runs 24/7 without hibernation, ensuring that it doesn't miss posts published during inactive periods.

2. **Database Persistence**: The SQLite database is now persistent between service restarts, preserving indexed posts even when the service is redeployed.

3. **Firehose Subscription**: The firehose subscription is more stable due to the continuous operation of the service.

4. **Post Visibility**: Posts are more reliably appearing in the feed, though we still occasionally need to use the admin endpoint to manually add posts.

5. **Automated Post Addition**: The `auto-add-community-posts.js` script runs hourly via GitHub Actions, ensuring that recent posts from community members are added to the feed even if there are issues with the feed algorithm.

Despite these improvements, we should continue to monitor the feed generator and address any remaining issues with the feed algorithm to ensure a seamless experience for users.

## Maintenance Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/check-feed-indexing-health.js` | Checks if all service endpoints are responding | `node scripts/check-feed-indexing-health.js` |
| `scripts/force-did-resolution.js` | Forces DID resolution | `node scripts/force-did-resolution.js` |
| `scripts/keep-service-active.js` | Keeps the service active to prevent hibernation | `node scripts/keep-service-active.js` |
| `scripts/restart-render-service.js` | Restarts the feed generator service on Render | `node scripts/restart-render-service.js` |
| `scripts/create-test-post.js` | Creates a test post with a unique identifier | `node scripts/create-test-post.js` |
| `scripts/test-feed-indexing.js` | Tests if posts are being indexed | `node scripts/test-feed-indexing.js` |
| `scripts/manually-add-post.js` | Manually adds a post to the feed | `node scripts/manually-add-post.js <post-uri>` |
| `scripts/manually-add-post-to-db.js` | Directly adds a post to the database | `node scripts/manually-add-post-to-db.js <post-uri>` |
| `scripts/checkFeedRecord.js` | Checks the feed generator record in Bluesky | `node scripts/checkFeedRecord.js` |
| `scripts/wake-up-services.js` | Wakes up all services to ensure they're active | `node scripts/wake-up-services.js` |

## Admin Endpoint Reference

The feed generator includes an admin endpoint for manually adding posts to the feed:

### POST /admin/update-feed

Adds posts to a specific feed.

**Request Body:**
```json
{
  "feedUri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community",
  "postUris": [
    "at://did:plc:yourdid/app.bsky.feed.post/postid1",
    "at://did:plc:yourdid/app.bsky.feed.post/postid2"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added 2 posts to feed swarm-community",
  "feedUri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community",
  "postCount": 2
}
```

### GET /admin/stats

Returns statistics about the database, including the total number of posts and recent posts.

**Query Parameters:**
- `did` (optional): Filter posts by creator DID

**Response:**
```json
{
  "message": "Database stats endpoint",
  "timestamp": "2025-03-15T16:40:44.891Z",
  "postCount": 132,
  "recentPosts": [
    {
      "uri": "at://did:plc:example/app.bsky.feed.post/example",
      "cid": "bafyreianp3p4qcluywtmix3ccbah37o5hpiemwgctjhrrckdindbow3eje",
      "indexedAt": "2025-03-15T16:40:34.289Z",
      "creator": "did:plc:example"
    }
  ]
}
```

## Conclusion

Troubleshooting the Swarm feed generator requires a systematic approach to identify and address the various issues that can prevent posts from appearing in the feed. By following this guide and using the provided scripts, you can effectively diagnose and resolve these issues over time.

The most common issue is that posts are being indexed in the database but not appearing in the feed due to issues with the feed algorithm. In these cases, manually adding posts to the feed using the admin endpoint is an effective workaround while the underlying issues are being addressed.

Remember to regularly check the service health and consider implementing the long-term solutions to avoid recurring problems.

---

**Last Updated**: March 15, 2025  
**Created By**: Claude AI Assistant  
**Version**: 1.1 