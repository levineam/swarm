# Swarm Feed Generator Scripts

This directory contains utility scripts for the Swarm Feed Generator. These scripts help with debugging, maintenance, and data management of the feed generator.

## Diagnostic Tools

### Post Handling

- **`manual-add-post.js`**: Manually add a post to the database when the firehose missed it.
  ```bash
  node scripts/manual-add-post.js at://did:plc:abcdefg123456/app.bsky.feed.post/12345
  ```

- **`trace-post.js`**: Trace a post through the system to see where it might be getting lost.
  ```bash
  node scripts/trace-post.js at://did:plc:abcdefg123456/app.bsky.feed.post/12345
  ```

### Community Management

- **`add-community-member.js`**: Add a new DID to the SWARM_COMMUNITY_MEMBERS array.
  ```bash
  node scripts/add-community-member.js did:plc:abcdefg123456 username.bsky.social
  ```

### Database Analysis

- **`analyze-db.js`**: Generate a comprehensive analysis report of the database state.
  ```bash
  node scripts/analyze-db.js
  ```
  This will create a `database-analysis-report.md` file with detailed statistics.

## When to Use These Scripts

- **Empty Feed Issues**: Use `analyze-db.js` to check database status, then `trace-post.js` to follow specific posts through the system.
  
- **Missing Posts**: Use `manual-add-post.js` to add posts that the firehose may have missed.

- **Adding Users**: Use `add-community-member.js` to expand the community member list so more posts appear in the feed.

## Deployment Notes

After making changes to community members or other configuration:

1. Commit your changes:
   ```bash
   git add ../src/swarm-community-members.ts
   git commit -m "Add new community member"
   ```

2. Push to the repository:
   ```bash
   git push
   ```

3. Redeploy on Render.com by selecting "Clear build cache & deploy" for the swarm-feed-generator service.

## Troubleshooting Steps

1. Check if posts exist in the database using `analyze-db.js`
2. Verify if authors are in the community members list
3. Test specific posts with `trace-post.js`
4. Add missing posts with `manual-add-post.js`
5. Add missing community members with `add-community-member.js`

For further details, see the full diagnostic guide in `../database-analysis-report.md`. 