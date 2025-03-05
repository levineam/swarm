# Deploying the Swarm Feed Generator

This document provides instructions for deploying the Swarm Feed Generator on Render.

## Prerequisites

- A [Render](https://render.com/) account
- Git repository with your feed generator code
- Bluesky account credentials

## Deployment Steps

### 1. Sign up for Render

If you don't already have a Render account, sign up at [Render](https://render.com/).

### 2. Create a New Web Service

1. From your Render dashboard, click **New** and select **Web Service**.
2. Connect your GitHub/GitLab repository containing the feed generator code.
3. Configure the service:
   - **Name**: `swarm-feed-generator` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Select the appropriate plan (Free tier works for testing)

### 3. Configure Environment Variables

Add the following environment variables in the Render dashboard:

- `PORT`: `3000`
- `FEEDGEN_HOSTNAME`: This will be automatically set to your Render service URL
- `FEEDGEN_PUBLISHER_DID`: `did:plc:ouadmsyvsfcpkxg3yyz4trqi`
- `FEEDGEN_LABELS_ENABLED`: `false`
- `FEEDGEN_SERVICE_DID`: `did:web:feed.swarm.example.com`
- `FEEDGEN_SUBSCRIPTION_ENDPOINT`: `wss://bsky.network`
- `DATABASE_URL`: `sqlite:swarm-feed.db`
- `BLUESKY_ACCESS_TOKEN`: Your Bluesky access token (obtained in Step 1)
- `BLUESKY_USERNAME`: Your Bluesky username
- `BLUESKY_PASSWORD`: Your Bluesky password

### 4. Deploy the Service

1. Click **Create Web Service** to deploy your feed generator.
2. Render will automatically build and deploy your service with HTTPS enabled.
3. Once deployment is complete, note the URL of your service (e.g., `https://swarm-feed-generator.onrender.com`).

### 5. Verify Deployment

1. Visit your service URL to verify it's running.
2. You should see a message indicating the feed generator is running.

## Updating the Deployment

When you push changes to your repository, Render will automatically rebuild and redeploy your service.

## Troubleshooting

- **Service not starting**: Check the logs in the Render dashboard for error messages.
- **Database issues**: Ensure your database path is correct and the directory is writable.
- **Authentication errors**: Verify your Bluesky credentials and access token are correct.

## Next Steps

After successful deployment:

1. Update your DID document to point to your new service URL.
2. Create the algorithm record in the AT Protocol.
3. Update your client application to use the new feed URI. 