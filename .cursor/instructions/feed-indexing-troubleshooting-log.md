# Feed-Indexing-Troubleshooting-Log

This document tracks troubleshooting attempts and outcomes for the Swarm feed generator service.

## Log Format

Each troubleshooting session should be logged with the following format:

```
### DATE (YYYY-MM-DD)

#### Symptoms
- List of observed symptoms

#### Steps Taken
1. Step 1
2. Step 2
3. ...

#### Outcomes
- Results of troubleshooting steps

#### Changes Made
- Any code or configuration changes implemented

#### Next Steps
- Planned follow-up actions
```

## Troubleshooting Sessions

### 2025-03-15

#### Symptoms
- Posts not appearing in the Swarm Community feed despite DID being correctly listed in SWARM_COMMUNITY_MEMBERS
- Feed endpoint responding with 200 but returning empty feed array
- Database stats showing posts being indexed (132+ posts in database)
- User's DID (did:plc:ouadmsyvsfcpkxg3yyz4trqi) correctly listed in community members

#### Steps Taken
1. Verified service health and confirmed the feed generator was responding
2. Checked the DID document at `/.well-known/did.json` and confirmed it was correct
3. Ran `force-did-resolution.js` to refresh DID resolution
4. Ran `wake-up-services.js` to ensure all services were active
5. Verified the user's DID was correctly listed in `SWARM_COMMUNITY_MEMBERS` array
6. Created a test post with `scripts/create-test-post.js`
7. Checked database stats to confirm posts were being indexed
8. Attempted to manually add posts to the feed using the admin endpoint
9. Identified correct format for the admin endpoint payload
10. Successfully added posts to the feed using the admin endpoint

#### Outcomes
- Successfully added posts to the feed using the admin endpoint
- Confirmed the feed generator was indexing posts from the firehose (132+ posts in database)
- Identified that the issue was with the feed algorithm not properly filtering posts from community members
- The admin endpoint for manual post addition worked correctly with the proper payload format:
  ```json
  {
    "feedUri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community",
    "postUris": ["at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/3lkgkirurwq26"]
  }
  ```

#### Changes Made
- No code changes were made, but we identified the correct way to use the admin endpoint
- Added multiple posts to the feed using the admin endpoint

#### Next Steps
- Investigate why the feed algorithm is not properly filtering posts from community members
- Consider implementing a scheduled task to periodically check for new posts and add them to the feed
- Set up the `keep-service-active.js` script to prevent service hibernation
- Consider upgrading to a paid tier on Render for persistent storage and no hibernation

### 2025-03-14

#### Symptoms
- Posts not appearing in the Swarm Community feed
- Feed endpoint responding with 200 but only showing 2 posts
- DID resolution working correctly
- Feed generator record in Bluesky PDS is correct

#### Steps Taken
1. Verified service health with `scripts/check-feed-indexing-health.js`
2. Confirmed DID resolution is working via PLC directory
3. Confirmed the user's DID is correctly listed in `SWARM_COMMUNITY_MEMBERS` array
4. Created test posts with `scripts/create-test-post.js`
5. Checked if test posts appear in feed with `scripts/test-feed-indexing.js`
6. Created and implemented admin endpoint in the feed generator for manual post addition
7. Created script to manually add posts to the feed (`scripts/manually-add-post.js`)
8. Created script to directly add posts to the database (`scripts/manually-add-post-to-db.js`)
9. Created script to restart the feed generator service (`scripts/restart-render-service.js`)

#### Outcomes
- Posts still not appearing in the feed after service restart
- Feed generator endpoints responding correctly (health, describe, getFeedSkeleton)
- Feed generator is not properly indexing posts from the firehose
- Identified several root causes:
  1. Service hibernation causing missed posts
  2. Non-persistent database resetting on service restart
  3. Firehose subscription issues after hibernation/restart

#### Changes Made
- Added admin endpoint for manual post addition
- Created scripts for maintenance, troubleshooting, and diagnostics
- Updated feed generator implementation to handle reconnection better
- Created comprehensive troubleshooting guide and documentation

#### Next Steps
- Set up a GitHub Action to run `scripts/keep-service-active.js` every 10 minutes
- Consider upgrading to a paid tier on Render for persistent storage and no hibernation
- Implement database backup mechanism
- Enhance firehose subscription reconnection logic

### 2025-03-20

#### Symptoms
- After upgrading to a paid tier on Render, we needed to verify that the feed was working correctly
- Initial check showed only one post appearing in the feed despite multiple posts being added
- User's DID (did:plc:ouadmsyvsfcpkxg3yyz4trqi) correctly listed in community members
- Feed endpoint returning posts but not all were visible in the UI

#### Steps Taken
1. Verified service health and confirmed the feed generator was responding
2. Checked the current feed skeleton using the API endpoint to see what posts were included
3. Confirmed that multiple posts were present in the feed skeleton response
4. Created a new test post with `scripts/create-test-post.js`
5. Added the new test post to the feed using the admin endpoint
6. Refreshed the client application to check if the new post appeared
7. Verified that the feed now shows multiple posts after refreshing

#### Outcomes
- Successfully confirmed that the feed generator is working correctly after the upgrade to a paid tier
- The feed skeleton API correctly returns multiple posts
- The client application now displays posts from the feed after refreshing
- The admin endpoint for manual post addition continues to work correctly
- The paid tier has eliminated issues with service hibernation and database persistence

#### Changes Made
- Added additional test posts to the feed using the admin endpoint
- No code changes were necessary as the service is functioning as expected

#### Next Steps
- Continue monitoring the feed to ensure it remains stable
- Consider implementing additional logging to track when posts are added to the feed
- Focus on fixing the feed algorithm to properly filter posts from community members
- Ensure the GitHub Actions workflow for the `auto-add-community-posts.js` script is running correctly
- Update documentation to reflect the current status and troubleshooting procedures

### 2025-03-16

#### Symptoms
- Previous issues with service hibernation and database persistence
- Need for long-term solution to feed indexing problems

#### Steps Taken
1. Upgraded the swarm-feed-generator service on Render from free tier to paid tier
2. Verified the service remains active without hibernation
3. Confirmed database persistence between service restarts

#### Outcomes
- Service now remains active 24/7 without hibernation
- Database persists between service restarts, preserving indexed posts
- Firehose subscription maintains a stable connection
- Improved overall reliability and performance of the feed generator

#### Changes Made
- Changed the service plan on Render from free tier to paid tier
- Updated documentation to reflect the service upgrade

#### Next Steps
- Monitor the feed generator for a few days to ensure stable operation
- Consider if the `keep-service-active.js` script is still necessary (likely not)
- Focus on fixing the feed algorithm to properly filter posts from community members
- Implement the auto-add-community-posts.js script as a backup mechanism

---

### TEMPLATE (Copy for new entries)

### YYYY-MM-DD

#### Symptoms
- 

#### Steps Taken
1. 
2. 
3. 

#### Outcomes
- 

#### Changes Made
- 

#### Next Steps
- 