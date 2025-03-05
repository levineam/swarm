# Bluesky Account Setup for Feed Generator

This directory contains scripts to help set up your Bluesky account for the feed generator.

## Step 1: Create a Bluesky Account

1. Go to [Bluesky Social](https://bsky.app/) and create a new account.
2. Record your **handle** (e.g., `yourhandle.bsky.social`) and **password**.

## Step 2: Obtain an Access Token

### Option 1: Using the provided script

1. Install dependencies:
   ```bash
   cd swarm-feed-generator/scripts
   npm install @atproto/api
   ```

2. Run the script:
   ```bash
   node get-bluesky-token.js <your-handle> <your-password>
   ```
   Replace `<your-handle>` with your Bluesky handle (e.g., `yourhandle.bsky.social`) and `<your-password>` with your password.

3. The script will output your access token. Save this token securely.

### Option 2: Using curl

You can also obtain an access token using curl:

```bash
curl -X POST https://bsky.social/xrpc/com.atproto.server.createSession \
-H "Content-Type: application/json" \
-d '{"identifier": "yourhandle.bsky.social", "password": "yourpassword"}'
```

Replace `yourhandle.bsky.social` and `yourpassword` with your actual credentials.

## Step 3: Store the Access Token Securely

Add the access token to your feed generator's environment variables:

1. Open your `.env` file in the feed generator directory.
2. Add the following line:
   ```
   BLUESKY_ACCESS_TOKEN=your_access_token
   ```
   Replace `your_access_token` with the token you obtained.

**IMPORTANT**: 
- Never commit this token to version control. Make sure your `.env` file is included in your `.gitignore`.
- The access token will expire after some time (typically within a few hours).
- When the token expires, you'll need to generate a new one using the script.
- For production deployment, consider setting up a token refresh mechanism.

## Token Expiration and Refresh

Access tokens from Bluesky have a limited lifespan (typically a few hours). For a production deployment, you should implement a token refresh mechanism that:

1. Detects when the token has expired (usually through a 401 Unauthorized response)
2. Automatically generates a new token using the stored credentials
3. Updates the environment with the new token
4. Retries the failed request

For development purposes, you can manually regenerate the token using the script whenever needed. 