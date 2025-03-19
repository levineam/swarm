# Swarm Feed Generator: Technical Assessment & Debug Guide

This document provides a comprehensive overview of the Swarm Feed Generator, focusing on the current implementation, identified issues, and a strategic plan for resolving them.

## Current Status Summary

| Component | Status | Description |
|-----------|--------|-------------|
| **DID Resolution** | ✅ RESOLVED | Fixed misalignment between service DID and feed URIs |
| **Logger Implementation** | ✅ COMPLETED | Enhanced logging throughout the system |
| **Database Initialization** | ✅ RESOLVED | Ensured proper database table and index creation |
| **Diagnostic Tools** | ✅ COMPLETED | Created comprehensive scripts for troubleshooting |
| **Feed Content** | ⚠️ ACTIVE INVESTIGATION | Feed appears empty despite firehose connection |

## System Architecture

The Swarm Feed Generator consists of two primary services:

1. **swarm-feed-generator**
   - Hosted on Render.com (paid tier with persistent storage)
   - Connects to the AT Protocol firehose
   - Processes and filters posts for the feed
   - Primary service responsible for the feed algorithm

2. **swarm-social**
   - Front-end application 
   - Displays feeds and content to users
   - No persistent storage required

## Identified Issues

### 1. Empty Feed Issue

The swarm-community feed appears empty despite having fixed the DID resolution issues. Our investigation has identified potential causes:

- **Firehose Processing:** Events are being received but posts may not be properly filtered or stored
- **Community Member Recognition:** Potential issues in the logic that identifies posts from community members
- **Database Storage/Retrieval:** Posts may not be properly stored or queried

### 2. DID Resolution (Resolved)

We identified and fixed several issues with DID resolution:

- **Root Cause:** Inconsistency between service DID and feed URIs
- **Solution:** Standardized use of service DID throughout the system
- **Implementation:** Updated DID document format, HTTP method handling, and cache control

### 3. Limited Community Members

Currently, `SWARM_COMMUNITY_MEMBERS` includes only one entry:
- `did:plc:ouadmsyvsfcpkxg3yyz4trqi` (andrarchy.bsky.social)

This is intentional for initial testing but will need expansion once the pipeline is verified.

## Diagnostic Tools

We've created a comprehensive set of diagnostic tools to facilitate troubleshooting:

1. **`trace-post.js`**
   - Traces a post through the entire system
   - Identifies exactly where posts might be getting lost
   - Provides actionable recommendations

2. **`analyze-db.js`**
   - Generates a detailed database analysis report
   - Shows community member post statistics
   - Provides insight into database health and content

3. **`manual-add-post.js`**
   - Adds posts directly to the database
   - Bypasses firehose for testing purposes
   - Helps validate the feed algorithm independently

4. **`add-community-member.js`**
   - Simplifies adding new community members
   - Updates the SWARM_COMMUNITY_MEMBERS array

All tools are documented in `swarm-feed-generator/feed-generator/scripts/README.md`.

## Firehose Processing Investigation

Our codebase analysis reveals the following key components in the post processing pipeline:

1. **Entry Point:** `subscription.ts` - `handleEvent()` method processes firehose events
2. **Filtering Logic:** Posts are filtered based on community membership
3. **Algorithm:** `swarm-community.ts` defines how posts are selected and ranked

Enhanced logging has been added to:
- Track all posts coming through the firehose
- Log detailed information about community member detection
- Provide visibility into database operations

## Recommended Diagnostic Approach

### Step 1: Database Analysis

Run the database analysis tool to understand the current state:
```bash
cd feed-generator
node scripts/analyze-db.js
```

This will generate a report detailing:
- Total posts in the database
- Posts from community members
- Recent post history
- Time distribution of posts

### Step 2: Post Tracing

Create a test post and trace it through the system:

1. Post on Bluesky from an account in the community members list
2. Include a unique hashtag like #swarmtest
3. Copy the post URI
4. Run the trace-post script:
   ```bash
   cd feed-generator
   node scripts/trace-post.js <post-uri>
   ```
5. Follow the diagnostic recommendations in the output

### Step 3: Manual Post Addition

If the firehose is missing posts, add them manually:
```bash
cd feed-generator
node scripts/manual-add-post.js <post-uri>
```

Verify the post appears in the feed after addition.

### Step 4: Community Member Expansion

If needed, add more community members:
```bash
cd feed-generator
node scripts/add-community-member.js <new-did> <handle>
```

## Implementation Details

### Feed Algorithm

The feed algorithm is defined in `swarm-community.ts` and follows this process:

1. Queries the database for posts from community members
2. Orders them by indexedAt (newest first)
3. Formats them for the feed skeleton response

Key code snippet:
```typescript
let builder = db
  .selectFrom('post')
  .where('creator', 'in', memberDids)
  .selectAll()
  .orderBy('indexedAt', 'desc')
  .orderBy('cid', 'desc')
  .limit(limit)
```

### Firehose Subscription

The firehose subscription is handled in `subscription.ts` with this key logic:

```typescript
const swarmPostsToCreate = ops.posts.creates
  .filter((create) => {
    return isSwarmCommunityMember(create.author);
  })
  .map((create) => {
    return {
      uri: create.uri,
      cid: create.cid,
      creator: create.author,
      indexedAt: new Date().toISOString(),
    }
  })
```

Enhanced logging has been added to help diagnose where this filtering might be failing.

## Next Steps

1. **Run Database Analysis**
   - Execute the analyze-db.js script
   - Review the report for any anomalies or insights

2. **Test with Known Post**
   - Create a test post from a community member account
   - Trace it through the system using trace-post.js
   - Identify exactly where it might be getting lost

3. **Address Any Issues Found**
   - If posts aren't being stored, fix firehose filtering
   - If posts are stored but not displayed, fix feed algorithm
   - If community member detection is failing, fix comparison logic

4. **Expand the Community**
   - Once pipeline is verified, add more community members
   - Monitor feed growth as members are added

5. **Deploy and Monitor**
   - Push changes to Render.com
   - Monitor with enhanced logging
   - Periodically run analysis tools to verify continued operation

## Long-term Considerations

1. **Database Scaling**
   - Consider migration to PostgreSQL if volume increases
   - Implement proper indexing for performance

2. **Monitoring and Alerts**
   - Add monitoring for firehose disconnections
   - Create alerts for empty feed conditions

3. **Documentation**
   - Document the diagnostic process for future reference
   - Create a troubleshooting guide for common issues

---

*This document serves as a comprehensive reference for understanding and resolving issues with the Swarm Feed Generator. It will be updated as new information becomes available or issues are resolved.* 