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