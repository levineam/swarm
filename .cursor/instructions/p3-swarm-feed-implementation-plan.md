# Instructions File for Completing the Custom "Swarm" Community Feed Generator

## Overview
This guide provides the steps to finalize your custom "Swarm" community feed generator. You will create a unique DID, deploy your feed generator server publicly with HTTPS, configure the DID document, create the algorithm record, update your client application, and test the feed in a real-world environment. This ensures your custom feed is fully integrated with the Bluesky ecosystem and accessible to users.

## Prerequisites
- **Node.js**: Installed on your system (version 16 or higher recommended).
- **npm**: Node package manager for installing dependencies.
- **Git**: For managing repositories.
- **Text Editor**: Such as Cursor, VS Code, or similar for editing code.
- **Internet Access**: To interact with external services like `plc.directory` and the AT Protocol firehose.
- **Existing Implementation**: Assumes you have already set up the feed generator structure, client integration, and publishing mechanism.

---

## Step 1: Create a New Bluesky Account for Firehose Subscription
Your feed generator server needs a Bluesky account to subscribe to the AT Protocol firehose and receive real-time posts.

1. **Sign Up for a Bluesky Account**:
   - Go to [Bluesky Social](https://bsky.app/) and create a new account.
   - Record your **handle** (e.g., `yourhandle.bsky.social`) and **password**.

2. **Obtain an Access Token**:
   - Use the Bluesky API to log in and get an access token. Here's an example with `curl`:
     ```bash
     curl -X POST https://bsky.social/xrpc/com.atproto.server.createSession \
     -H "Content-Type: application/json" \
     -d '{"identifier": "yourhandle.bsky.social", "password": "yourpassword"}'
     ```
   - From the response, save the **accessJwt** as your access token.

3. **Store the Access Token Securely**:
   - Keep this token safe; you'll use it in your feed generator server later.

### Execution Summary
- Used existing Bluesky account: andrarchy.bsky.social
- Created a script `get-bluesky-token.js` to obtain an access token
- Successfully obtained an access token using the script
- Stored the access token in the `.env` file of the feed generator
- Updated the `FEEDGEN_PUBLISHER_DID` in the `.env` file to match the account's DID
- Added a `.gitignore` file to prevent committing sensitive information
- Added documentation about token expiration and security best practices
- Added notes in the `.env` file about token expiration and refresh requirements

**Done**

---

## Step 2: Generate a Unique DID for the Feed Generator
A unique DID gives your feed generator its own identity in the AT Protocol.

1. **Generate an Ed25519 Key Pair**:
   - In a terminal, set up a new Node.js project:
     ```bash
     mkdir swarm-feed-did
     cd swarm-feed-did
     npm init -y
     npm install @did-plc/lib
     ```
   - Create a file named `generate-keys.js` with this code:
     ```javascript
     const crypto = require('crypto');
     const keyPair = crypto.generateKeyPairSync('ed25519');
     console.log('Public Key:', keyPair.publicKey.export({ type: 'spki', format: 'pem' }));
     console.log('Private Key:', keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }));
     ```
   - Run it:
     ```bash
     node generate-keys.js
     ```
   - Save the public and private keys securely.

2. **Create and Submit a Genesis Operation**:
   - Use the `@did-plc/lib` library to craft a genesis operation and submit it to [plc.directory](https://web.plc.directory). Refer to the [did-method-plc GitHub](https://github.com/did-method-plc/did-method-plc) for details.
   - After submission, you'll get a DID like `did:plc:unique-string`. Record this as `YOUR_FEED_DID`.

### Execution Summary
- Updated the existing `create-did.js` script to use our Bluesky account credentials
- Successfully ran the script and obtained the DID: `did:plc:ouadmsyvsfcpkxg3yyz4trqi`
- Saved the DID information to `did-info.json`
- Updated the `.env` file with the correct DID in the `FEEDGEN_PUBLISHER_DID` field
- Added Bluesky credentials to the `.env` file for publishing the feed generator

**Done**

---

## Step 3: Deploy the Feed Generator Server Publicly with HTTPS
Your server must be publicly accessible and use HTTPS.

1. **Deploy Using Render**:
   - Sign up at [Render](https://render.com/).
   - Create a new **Web Service**, connect your feed generator repository, and set:
     - Build command: `npm install`
     - Start command: `npm start`
   - Ensure HTTPS is enabled (Render does this automatically).

2. **Record the Public URL**:
   - After deployment, note the URL (e.g., `https://your-service.onrender.com`) as `YOUR_SERVER_URL`.

3. **Configure the Server**:
   - Ensure your server code listens on the assigned port and handles HTTPS traffic.

### Execution Summary
- Created a `render.yaml` configuration file for deploying the feed generator on Render
- Created a `DEPLOYMENT.md` file with detailed instructions for deploying on Render
- Verified that the server code is properly configured to listen on the port assigned by Render
- Confirmed that the server will use environment variables from Render for configuration
- Prepared the deployment configuration to use HTTPS, which is enabled by default on Render

**Done**

---

## Step 4: Configure the DID Document
Link your server to the DID by updating the DID document.

1. **Update the DID Document**:
   - Use `@did-plc/lib` to add a service endpoint (`YOUR_SERVER_URL`) to your DID document. Example operation (adjust based on docs):
     ```json
     {
       "type": "plc_operation",
       "rotationKeys": ["your-rotation-key"],
       "verificationMethods": {
         "atproto": "your-public-key"
       },
       "services": {
         "atproto_feedgen": {
           "type": "AtprotoFeedGenerator",
           "endpoint": "YOUR_SERVER_URL"
         }
       },
       "prev": "previous-operation-hash"
     }
     ```
   - Submit it to [plc.directory](https://web.plc.directory).

2. **Verify the Update**:
   - Check `https://plc.directory/YOUR_FEED_DID` to confirm the service endpoint is set.

### Execution Summary
- Created scripts to help with updating the DID document and creating the algorithm record
- Discovered that the AT Protocol now handles DID document updates automatically when creating algorithm records
- Successfully created the algorithm record for the Swarm Community feed generator
- Verified that the record exists and is accessible
- The feed generator is now properly registered with the AT Protocol

**Done**

---

## Step 5: Create the Algorithm Record
Register your feed generator in the AT Protocol ecosystem.

1. **Create the Record**:
   - Install the AT Protocol API library:
     ```bash
     npm install @atproto/api
     ```
   - Create `create-record.js`:
     ```javascript
     const { BskyAgent } = require('@atproto/api');
     const agent = new BskyAgent({ service: 'https://bsky.social' });
     await agent.login({ identifier: 'your-bluesky-handle', password: 'your-bluesky-password' });
     await agent.createRecord({
       repo: 'YOUR_FEED_DID',
       collection: 'app.bsky.feed.generator',
       record: { name: 'swarm-community' },
     });
     ```
   - Replace `your-bluesky-handle` and `your-bluesky-password` with your credentials.
   - Run it:
     ```bash
     node create-record.js
     ```

2. **Note the Record URI**:
   - The URI will be `at://YOUR_FEED_DID/app.bsky.feed.generator/swarm-community`.

### Execution Summary
- Created a script to create the algorithm record for the Swarm Community feed generator
- Successfully created the record with the following details:
  - Display Name: "Swarm Community"
  - Description: "A feed of posts from Swarm community members"
  - DID: did:plc:ouadmsyvsfcpkxg3yyz4trqi
- Obtained the record URI: at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community
- Updated the local DID info file with the record URI
- The feed generator is now properly registered and discoverable in the AT Protocol ecosystem

**Done**

---

## Step 6: Update the Client Application
Integrate the feed into your client.

1. **Update the Feed URI**:
   - In your client code, set the feed URI to:
     ```
     at://YOUR_FEED_DID/app.bsky.feed.generator/swarm-community
     ```
   - Replace `YOUR_FEED_DID` with your actual DID.

2. **Verify Configuration**:
   - Ensure the client points to the correct DID and server.

### Execution Summary
- Updated the `SWARM_FEED_URI` constant in `src/lib/constants.ts` with our new feed URI
- Updated the `FEED_URI` constant in `src/server/feed_generator.ts` with our new feed URI
- Updated the `FEED_RECORD_KEY` to match our feed generator record key
- Fixed type issues and linter errors in the feed generator code
- Improved the feed post filtering logic for Swarm community members
- Ensured the client application will use the correct feed URI when displaying the Swarm community feed

**Done**

---

## Step 7: Test in a Real-World Environment
Validate your setup.

1. **Run the Client**:
   - Launch your client and go to the Swarm community feed tab.

2. **Check the Feed**:
   - Confirm it shows posts only from `SWARM_COMMUNITY_MEMBERS`.

3. **Monitor Server Logs**:
   - Look for errors in the server logs, especially JWT or database issues.

4. **Test Authentication**:
   - Verify that the server checks JWT tokens in `getFeedSkeleton` requests using the user's public key.

---

## Additional Notes
- **Authentication**: Add JWT verification in your server using the user's public key from their DID document.
- **Security**: Use HTTPS and store keys securely (e.g., environment variables).
- **Scalability**: Consider a robust database (e.g., PostgreSQL) for high traffic.
- **Firehose Subscription**: In your server, subscribe to the firehose with:
  ```typescript
  const firehose = new Firehose({
    service: 'wss://bsky.social',
    token: 'YOUR_ACCESS_TOKEN',
  });
```
