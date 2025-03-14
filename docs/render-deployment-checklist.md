# Render Deployment Checklist

This document provides a step-by-step checklist for deploying and verifying the Swarm services on Render.

## Pre-Deployment Checklist

- [ ] Ensure all code changes are committed and pushed to the repository
- [ ] Verify that all environment variables are correctly set in the Render dashboard
- [ ] Check that the DID document configuration is correct in the codebase
- [ ] Ensure the feed generator record in Bluesky PDS has the correct DID
- [ ] Verify that the feed URI constants in the client code are correct

## Deployment Steps

### 1. Deploy the Feed Generator Service

- [ ] Go to the Render dashboard and navigate to the feed generator service
- [ ] Click "Manual Deploy" and select "Clear build cache & deploy"
- [ ] Monitor the deployment logs for any errors
- [ ] Wait for the deployment to complete (status should change to "Live")

### 2. Deploy the Main Web Application

- [ ] Go to the Render dashboard and navigate to the main web application
- [ ] Click "Manual Deploy" and select "Clear build cache & deploy"
- [ ] Monitor the deployment logs for any errors
- [ ] Wait for the deployment to complete (status should change to "Live")

## Post-Deployment Verification

### 1. Using the Deployment Tools

Follow this recommended sequence to verify your deployment:

```bash
# Make sure you're in the project root directory
cd /path/to/social-app

# Install dependencies if needed
npm install

# 1. First, wake up the services that might have spun down
node scripts/wake-up-services.js

# 2. Wait a moment for services to fully initialize
echo "Waiting 10 seconds for services to initialize..."
sleep 10

# 3. Run the comprehensive health check
node scripts/health-check.js

# 4. If there are issues with the feed generator record, verify it
node swarm-feed-generator/feed-generator/scripts/checkFeedRecord.js

# 5. If the DID in the feed generator record is incorrect, update it
# node swarm-feed-generator/feed-generator/scripts/updateFeedGenDid.js

# 6. If you're experiencing DID resolution issues, force refresh the DID resolution
node scripts/force-did-resolution.js

# 7. If posts aren't appearing in the feed, test the feed indexing
node scripts/test-feed-indexing.js
```

### 2. Manual Verification Steps

- [ ] Visit the main web application at https://swarm-social.onrender.com
- [ ] Verify that the application loads correctly
- [ ] Check that you can log in and view your profile
- [ ] Visit the feed generator service at https://swarm-feed-generator.onrender.com
- [ ] Verify that the landing page loads correctly
- [ ] Check the DID document at https://swarm-feed-generator.onrender.com/.well-known/did.json
- [ ] Verify that the XRPC endpoints are working:
  - [ ] Health endpoint: https://swarm-feed-generator.onrender.com/xrpc/_health
  - [ ] DescribeFeedGenerator: https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
  - [ ] GetFeedSkeleton: https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community
- [ ] Log in to the Bluesky app and check if the Swarm Community feed is available and working

## Keeping Services Active

Render's free tier spins down services after periods of inactivity, which can cause issues with DID resolution and feed indexing. To prevent these issues, consider the following strategies:

### 1. Run the Keep-Service-Active Script

The `keep-service-active.js` script periodically pings the services to keep them active:

```bash
# Run the script in the background
node scripts/keep-service-active.js &

# To stop the script, find its process ID and kill it
ps aux | grep keep-service-active
kill <PID>
```

### 2. Set Up a Scheduled Task

For a more permanent solution, set up a scheduled task (cron job) to periodically ping the services:

```bash
# Example cron job that runs every 10 minutes
*/10 * * * * cd /path/to/social-app && node scripts/wake-up-services.js >> /path/to/logs/wake-up.log 2>&1
```

### 3. Use a Third-Party Service

Consider using a third-party service like UptimeRobot or Pingdom to periodically ping your services.

## Troubleshooting Common Issues

### DID Resolution Issues

If you encounter DID resolution issues (e.g., "could not resolve identity: did:web:swarm-feed-generator.onrender.com"):

1. **Check the DID document**:
   - Verify that the DID document is being served correctly at `/.well-known/did.json`
   - Ensure the document has the correct service endpoint configuration

2. **Check the feed generator record**:
   - Run the `checkFeedRecord.js` script to verify the DID in the feed generator record
   - If incorrect, run the `updateFeedGenDid.js` script to update it

3. **Force refresh the DID resolution**:
   - Run the `force-did-resolution.js` script to attempt to force refresh the DID resolution
   - Clear your browser cache and reload the page

4. **Wake up the services**:
   - Run the `wake-up-services.js` script to ensure all services are active
   - Wait a few minutes for the services to fully initialize

### Service Unavailable Issues

If the feed generator service is unavailable or returning errors:

1. **Check Render logs**:
   - Go to the Render dashboard and check the logs for any errors
   - Look for startup errors or crashes

2. **Cold Start Delay**:
   - Remember that Render's free tier spins down services after periods of inactivity
   - The first request after inactivity may take 30-60 seconds to process
   - Make a few requests to "wake up" the service

3. **Environment Variables**:
   - Verify that all required environment variables are set correctly in the Render dashboard
   - Check for typos or missing variables

### Feed Not Showing Posts

If the feed is not showing posts:

1. **Check the firehose subscription**:
   - Run the `test-feed-indexing.js` script to verify if posts are being properly indexed
   - Check the Render logs for any subscription errors

2. **Check the database**:
   - Verify that posts are being indexed in the database
   - Check if the database is being persisted between service restarts

3. **Check the community members list**:
   - Verify that the correct DIDs are listed in the `SWARM_COMMUNITY_MEMBERS` array
   - Make sure your DID is included if you want your posts to appear in the feed

## Render Free Tier Considerations

When using Render's free tier, be aware of these limitations:

1. **Service Spin Down**:
   - Services on the free tier will spin down after 15 minutes of inactivity
   - The first request after inactivity will take 30-60 seconds to process
   - This can cause DID resolution issues and feed indexing problems

2. **Database Persistence**:
   - SQLite databases are stored in the filesystem, which is ephemeral on Render's free tier
   - Consider using a persistent database solution for production

3. **Resource Limitations**:
   - Free tier services have limited CPU and memory resources
   - Performance may be affected during high load

4. **Monthly Usage Limits**:
   - Free tier services have monthly usage limits
   - Monitor your usage to avoid unexpected charges

## Conclusion

Following this checklist will help ensure that your Swarm services are deployed correctly and functioning properly on Render. If you encounter any issues not covered in this document, refer to the Render documentation or seek assistance from the development team. 