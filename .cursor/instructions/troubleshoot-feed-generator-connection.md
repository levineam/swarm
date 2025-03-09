# Troubleshoot Feed Generator Connection Issues

This document outlines a systematic approach to troubleshoot and fix the connection issues with the Swarm feed generator.

## Current Status

- ✅ The feed generator successfully connects to the Bluesky firehose and receives posts
- ✅ The HTTP endpoints (e.g., `/xrpc/app.bsky.feed.describeFeedGenerator`) are now responding correctly
- ✅ The issue has been resolved by changing the network binding configuration

## Solution

The issue was resolved by making the following changes to the `.env` file:

1. Changed `FEEDGEN_HOSTNAME` from 'localhost:3000' to just 'localhost'
2. Added `FEEDGEN_LISTENHOST=0.0.0.0` to bind to all network interfaces
3. Updated `FEEDGEN_SERVICE_DID` to use the correct DID: 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'

These changes allowed the server to:
- Bind to all network interfaces (0.0.0.0) instead of just localhost
- Use the correct DID for the service
- Properly separate the hostname and port in the configuration

## Step 1: Verify Server Configuration ✅

1. **Check the server binding configuration**:
   - Examined `src/index.ts` to verify the port and host settings
   - Confirmed that `FEEDGEN_LISTENHOST` was not set correctly in the `.env` file
   - No conflicts with port 3000 were found

2. **Execution**:
   - Ran `lsof -i :3000` to check if any process was already using port 3000
   - Modified the `.env` file to use the correct configuration

## Step 2: Debug Server Startup ✅

1. **Run with verbose logging**:
   - Started the server with additional debug flags
   - Captured console output during startup

2. **Execution**:
   - Ran the server and observed the startup logs
   - Confirmed that the server was starting but not binding correctly

## Step 3: Inspect Network Configuration ✅

1. **Check network interfaces**:
   - Verified that the server was not binding to the correct network interface
   - Tested binding to `0.0.0.0` instead of `localhost`

2. **Execution**:
   - Modified the `.env` file to set `FEEDGEN_LISTENHOST=0.0.0.0`
   - Restarted the server and tested the connection
   - Confirmed that the endpoints were now responding correctly

## Deployment Instructions

To deploy this fix to the production environment:

1. Update the environment variables in the Render dashboard:
   - Set `FEEDGEN_HOSTNAME` to 'swarm-social.onrender.com' (without the port)
   - Set `FEEDGEN_LISTENHOST` to '0.0.0.0'
   - Ensure `FEEDGEN_SERVICE_DID` is set to 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'

2. Redeploy the service on Render

3. Verify the deployment by accessing:
   ```
   https://swarm-social.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
   ```

## Troubleshooting Tips

- **Network binding**: Always bind to `0.0.0.0` in production environments to ensure the service is accessible from all network interfaces
- **Environment variables**: Double-check all environment variables, especially those related to networking and DIDs
- **Testing endpoints**: Use curl or a browser to test endpoints directly before integrating with other services 