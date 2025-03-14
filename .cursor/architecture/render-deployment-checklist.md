## Render Deployment Checklist

This document provides a step-by-step guide for deploying and maintaining the Swarm Feed Generator on Render.com.

### Prerequisites

- A Render.com account
- A GitHub repository with the feed generator code
- A domain for the feed generator (optional, but recommended)

### Deployment Steps

1. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Set the name to "swarm-feed-generator"
   - Set the build command to `cd feed-generator && npm install`
   - Set the start command to `cd feed-generator && node dist/index.js`
   - Set the Node.js version to 18 or higher

2. **Configure Environment Variables**
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will automatically set this)
   - `FEEDGEN_HOSTNAME`: Your domain (e.g., `swarm-feed-generator.onrender.com`)
   - `FEEDGEN_PUBLISHER_DID`: Your DID (e.g., `did:plc:ouadmsyvsfcpkxg3yyz4trqi`)
   - `FEEDGEN_SERVICE_DID`: `did:web:swarm-feed-generator.onrender.com` (or your custom domain)
   - `FEEDGEN_SUBSCRIPTION_ENDPOINT`: `wss://bsky.network`
   - `DATABASE_URL`: `sqlite:swarm-feed.db` (for SQLite)
   - `ADMIN_TOKEN`: A secure token for admin endpoints (optional)
   - `RENDER_API_KEY`: Your Render API key (for maintenance scripts)
   - `RENDER_SERVICE_ID`: The ID of your feed generator service on Render

3. **Deploy the Service**
   - Click "Create Web Service"
   - Wait for the deployment to complete
   - Verify the service is running by visiting the URL provided by Render

4. **Configure DNS (if using a custom domain)**
   - Add a CNAME record pointing to your Render service
   - Verify the DNS configuration

5. **Register the Feed Generator with Bluesky**
   - Run the `scripts/registerFeed.js` script to register your feed
   - Verify the feed is registered by checking the Bluesky app

### Post-Deployment Verification

1. **Verify the Feed Generator is Running**
   - Visit `https://swarm-feed-generator.onrender.com/health` to check the health endpoint
   - It should return `{"status":"ok"}`

2. **Verify the Feed Generator Record in Bluesky PDS**
   - Run `scripts/checkFeedRecord.js` to verify the feed record
   - Ensure the DID in the record matches your `FEEDGEN_SERVICE_DID`

3. **Verify DID Resolution**
   - Visit `https://plc.directory/did:web:swarm-feed-generator.onrender.com` to check DID resolution
   - It should return the DID document
   - If it returns a 404, run `scripts/force-did-resolution.js` to force resolution

4. **Test Feed Indexing**
   - Make a test post on Bluesky
   - Run `scripts/test-feed-indexing.js` to check if your post is being indexed
   - If your post is not being indexed, see the troubleshooting section

### Maintenance Tasks

1. **Keep the Service Active**
   - Render free tier services hibernate after 15 minutes of inactivity
   - Run `scripts/keep-service-active.js` periodically to keep the service active
   - Consider setting up a cron job or GitHub Action to run this script every 10 minutes

2. **Monitor the Service**
   - Check the Render logs regularly for any errors
   - Set up alerts for service downtime (if using a paid tier)

3. **Backup the Database**
   - The SQLite database is not persisted between service restarts on the free tier
   - Consider implementing a backup solution if using a paid tier

4. **Update the Service**
   - When making changes to the code, push to GitHub and Render will automatically redeploy
   - Verify the service is running after each deployment

### Troubleshooting

1. **DID Resolution Issues**
   - If the DID is not resolving, run `scripts/force-did-resolution.js`
   - Verify the `FEEDGEN_SERVICE_DID` environment variable is set correctly
   - Check that your domain is correctly configured

2. **Feed Indexing Issues**
   - If posts are not appearing in the feed, check the following:
     - Verify the feed generator is running and connected to the firehose
     - Check that your DID is in the `SWARM_COMMUNITY_MEMBERS` array
     - Restart the feed generator service using `scripts/restart-render-service.js`
     - Check the Render logs for any errors
   - On the free tier, the database is not persisted between service restarts, which means:
     - Posts may be lost when the service restarts
     - The service may hibernate after 15 minutes of inactivity
     - Consider upgrading to a paid tier for better reliability

3. **Service Hibernation**
   - If the service is hibernating, run `scripts/keep-service-active.js`
   - Set up a cron job or GitHub Action to run this script every 10 minutes
   - Consider upgrading to a paid tier to avoid hibernation

4. **Database Issues**
   - On the free tier, the SQLite database is stored in ephemeral storage
   - This means the database is reset when the service restarts
   - Consider upgrading to a paid tier and using a persistent database

### Upgrading to a Paid Tier

If you're experiencing issues with the free tier, consider upgrading to a paid tier for:

- No service hibernation
- Persistent storage
- Better performance
- More reliable service

### Scripts Reference

- `scripts/registerFeed.js`: Registers the feed with Bluesky
- `scripts/checkFeedRecord.js`: Checks the feed record in the Bluesky PDS
- `scripts/test-feed-indexing.js`: Tests if posts are being indexed
- `scripts/force-did-resolution.js`: Forces DID resolution
- `scripts/keep-service-active.js`: Keeps the service active
- `scripts/restart-render-service.js`: Restarts the feed generator service
- `scripts/manually-add-post-to-db.js`: Manually adds a post to the feed database (requires direct database access)

### Conclusion

Deploying and maintaining a feed generator on Render requires careful attention to the limitations of the free tier. By following this checklist and using the provided scripts, you can ensure your feed generator remains operational and reliable.

For production use, we strongly recommend upgrading to a paid tier to avoid issues with service hibernation and database persistence. 