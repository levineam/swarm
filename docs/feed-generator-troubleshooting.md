# Feed Generator Troubleshooting Guide

This document provides guidance for troubleshooting issues with the Swarm feed generator, particularly focusing on the problem of posts not appearing in the feed.

## Common Issues

### 1. DID Resolution Issues

The feed generator uses a DID (Decentralized Identifier) to identify itself to the AT Protocol network. If the DID is not properly configured or cannot be resolved, it can cause issues with the feed generator.

**Symptoms:**
- Error message: "could not resolve identity: did:web:swarm-feed-generator.onrender.com"
- Feed generator record shows incorrect DID
- Posts not appearing in the feed

**Solutions:**
- Ensure the `.well-known/did.json` file is being served correctly
- Verify that the `FEEDGEN_SERVICE_DID` environment variable is set to `did:web:swarm-feed-generator.onrender.com`
- Check that the DID document contains the correct service endpoints

### 2. Firehose Subscription Issues

The feed generator subscribes to the AT Protocol firehose to receive real-time updates about new posts. If this subscription is not working properly, posts won't be indexed.

**Symptoms:**
- Posts not appearing in the feed
- No subscription information in the debug endpoint
- Feed contains only a few posts or no posts at all

**Solutions:**
- Restart the feed generator service to reconnect to the firehose
- Check the Render logs for any errors related to the firehose subscription
- Verify that the `FEEDGEN_SUBSCRIPTION_ENDPOINT` environment variable is set to `wss://bsky.network`

### 3. Database Persistence Issues

On Render's free tier, the database is not persisted between service restarts. This means that if the service restarts, all indexed posts will be lost.

**Symptoms:**
- Posts disappear from the feed after service restarts
- Feed contains only recent posts

**Solutions:**
- Upgrade to a paid Render tier with persistent storage
- Implement a backup and restore mechanism for the database
- Use the admin endpoint to manually add posts to the database

### 4. Environment Variable Configuration

Incorrect environment variables can cause various issues with the feed generator.

**Symptoms:**
- Service not starting properly
- Endpoints returning errors
- Posts not being indexed

**Solutions:**
- Verify that all required environment variables are set correctly
- Check the debug endpoint for the current configuration
- Update environment variables in the Render dashboard if needed

## Troubleshooting Scripts

We've created several scripts to help diagnose and fix issues with the feed generator:

### 1. `check-feed-generator-env.js`

This script checks the feed generator's environment variables to ensure they are correctly configured.

```bash
node scripts/check-feed-generator-env.js
```

### 2. `check-firehose-subscription.js`

This script checks if the feed generator is properly subscribing to the firehose.

```bash
node scripts/check-firehose-subscription.js
```

### 3. `check-feed-database.js`

This script connects to the feed generator's database and checks if posts are being stored.

```bash
node scripts/check-feed-database.js
```

### 4. `restart-feed-generator.js`

This script sends requests to the feed generator to wake it up and reconnect to the firehose.

```bash
node scripts/restart-feed-generator.js
```

### 5. `fix-feed-generator-database.js`

This script generates SQL statements to manually add your posts to the feed generator's database.

```bash
node scripts/fix-feed-generator-database.js
```

### 6. `create-test-post.js`

This script creates a test post with a unique identifier to see if it gets indexed by the feed generator.

```bash
node scripts/create-test-post.js
```

### 7. `test-feed-indexing.js`

This script tests if the feed generator is properly indexing posts from your account.

```bash
node scripts/test-feed-indexing.js
```

## Admin Endpoint

We've also implemented an admin endpoint for the feed generator that allows you to manually update the feed. This is particularly useful for adding posts to the feed when the firehose subscription is not working properly.

### How to Use the Admin Endpoint

1. Deploy the updated feed generator with the admin endpoint
2. Use curl to manually update the feed:

```bash
curl -X POST https://swarm-feed-generator.onrender.com/admin/update-feed \
  -H "Content-Type: application/json" \
  -d '{"feedUri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community", "postUris": ["post-uri-1", "post-uri-2"]}'
```

3. Check database stats with:

```bash
curl https://swarm-feed-generator.onrender.com/admin/stats
```

## Recommended Environment Variables

The following environment variables should be set in the Render dashboard:

1. `FEEDGEN_HOSTNAME=swarm-feed-generator.onrender.com`
2. `FEEDGEN_LISTENHOST=0.0.0.0`
3. `FEEDGEN_SERVICE_DID=did:web:swarm-feed-generator.onrender.com`
4. `FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi`
5. `FEEDGEN_SUBSCRIPTION_ENDPOINT=wss://bsky.network`
6. `FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY=3000`

## Render Free Tier Limitations

Render's free tier has several limitations that can affect the feed generator:

1. **Service Hibernation**: Free tier services hibernate after 15 minutes of inactivity, which can cause the firehose subscription to disconnect.
2. **Non-persistent Storage**: The database is not persisted between service restarts, which means indexed posts will be lost.
3. **Limited Resources**: Free tier services have limited CPU and memory, which can affect performance.

To mitigate these issues, consider:

1. Using the `keep-service-active.js` script to periodically ping the service and prevent hibernation
2. Implementing the admin endpoint to manually add posts to the database
3. Upgrading to a paid Render tier for better performance and persistent storage

## Next Steps

If you're still experiencing issues with the feed generator, consider:

1. Checking the Render logs for any errors
2. Restarting the feed generator service
3. Manually adding posts to the database using the admin endpoint
4. Upgrading to a paid Render tier for better reliability 