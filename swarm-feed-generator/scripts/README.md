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

# Swarm Feed Generator Verification Scripts

This directory contains scripts for verifying the proper configuration and operation of the Swarm Feed Generator service, with a focus on DID resolution and feed URI handling.

## Background

The "could not resolve identity: did:web:swarm-feed-generator.onrender.com" error has been a persistent issue in the Swarm social app. These scripts help diagnose and verify the resolution of this issue.

## Scripts

### 1. DID Document Audit (`audit-did-documents.js`)

This script verifies that all DID document endpoints (`/.well-known/did.json` and `/did.json`) return identical, correctly formatted content with proper cache-control headers.

```bash
node audit-did-documents.js
```

### 2. HTTP Method Test (`test-did-http-methods.js`)

This script tests that the DID document endpoints properly support all required HTTP methods (GET, HEAD, OPTIONS). The AT Protocol requires support for these methods for proper DID resolution.

```bash
node test-did-http-methods.js
```

### 3. DID Resolution Verification (`verify-did-resolution.js`)

This script uses the AT Protocol client to verify DID resolution and feed URI accessibility, testing both the service DID and publisher DID.

```bash
node verify-did-resolution.js
```

## All-in-One Runner

For convenience, a shell script is provided to run all verification steps:

```bash
chmod +x run-verification.sh
./run-verification.sh
```

## Interpreting Results

### Audit DID Documents

- Both endpoints should return 200 status codes
- Headers should include proper cache-control directives
- Content should be identical between endpoints
- Service type should be `BskyFeedGenerator`
- Service ID should be `#bsky_fg`

### HTTP Method Test

- All methods (GET, HEAD, OPTIONS) should return successful status codes
- No 405 "Method Not Allowed" errors should be present

### DID Resolution Verification

- Service DID resolution should succeed
- Both feed URIs (with service DID and publisher DID) should resolve correctly

## Common Issues and Solutions

1. **405 Method Not Allowed**: The server doesn't support HEAD or OPTIONS methods. Update the Express routes to explicitly handle these methods.

2. **DID Document Inconsistency**: The DID document content is different between endpoints. Use the update-all-did-documents.js script to ensure consistency.

3. **Feed URI Mismatch**: The feed URIs in the describeFeedGenerator response use a different DID than the did field. Update describe-generator.ts to use the same DID consistently.

4. **Cache-Control Headers Missing**: The DID document is being cached. Ensure cache-control headers are added to all responses.

## After Verification

If all verification scripts pass without errors, the DID resolution issue should be resolved. Deploy the updated code to Render.com with "Clear build cache & deploy" to ensure a fresh build with the new changes. 