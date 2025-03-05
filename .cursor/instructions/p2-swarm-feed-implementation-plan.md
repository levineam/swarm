# Instructions File for Setting Up a Custom "Swarm" Community Feed Generator

## Overview
This guide provides instructions to create a custom feed generator for the "Swarm" community using the AT Protocol. The feed generator will filter posts from a predefined list of community members (`SWARM_COMMUNITY_MEMBERS`) and make them available via a custom feed URI. By the end of this process, your client application will display a tailored feed of Swarm community posts.

## Prerequisites
- **Node.js**: Installed on your system (version 16 or higher recommended).
- **npm**: Node package manager for installing dependencies.
- **Git**: For cloning repositories.
- **Text Editor**: Such as Cursor, VS Code, or similar for editing code.
- **Internet Access**: To interact with external services like `plc.directory` and the AT Protocol firehose.

---

## Step 1: Create a New DID for the Feed Generator Service
A Decentralized Identifier (DID) uniquely identifies your feed generator service. We'll use the `did:plc` method to create it.

1. **Generate an Ed25519 Key Pair**
   - Open a terminal and create a new Node.js project:
     ```bash
     mkdir swarm-feed-generator
     cd swarm-feed-generator
     npm init -y
     npm install @did-plc/lib
     ```
   - Create a file named `generate-keys.js` and add the following code:
     ```javascript
     const crypto = require('crypto');
     const keyPair = crypto.generateKeyPairSync('ed25519');
     console.log('Public Key:', keyPair.publicKey.export({ type: 'spki', format: 'pem' }));
     console.log('Private Key:', keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }));
     ```
   - Run the script:
     ```bash
     node generate-keys.js
     ```
   - Save the public and private keys securely; you'll need them later.

2. **Create a Genesis Operation**
   - Using the `@did-plc/lib` library, create a genesis operation. Refer to the [did-method-plc GitHub](https://github.com/did-method-plc/did-method-plc) for detailed documentation. This step typically involves crafting a JSON object with your public key and submitting it.

3. **Submit to the Directory Server**
   - Submit the genesis operation to [plc.directory](https://web.plc.directory) using the library's functions or a manual HTTP request (see the GitHub docs for examples).
   - Upon success, you'll receive a DID like `did:plc:unique-string`. Record this as `YOUR_FEED_DID`.

### Execution Summary
- Created a Node.js project for the Swarm feed generator
- Implemented a script (`generate-keys.js`) to generate Ed25519 key pairs
- Created a script (`create-did.js`) to guide users through the DID creation process using the AT Protocol
- Generated a placeholder DID information file with instructions for creating a real DID
- Installed necessary dependencies: `@did-plc/lib` and `@atproto/api`
- Note: Creating an actual DID requires account creation on Bluesky, which requires manual intervention
- The implementation provides guidance on how to create a DID manually using the Bluesky API

**Done**

---

## Step 2: Set Up the Feed Generator Server
The server will host your feed generation logic and respond to requests from clients.

1. **Clone the Starter Kit**
   - Clone the Bluesky feed generator repository:
     ```bash
     git clone https://github.com/bluesky-social/feed-generator.git
     cd feed-generator
     ```

2. **Install Dependencies**
   - Install the required packages:
     ```bash
     npm install
     ```
   - Follow the repository's README to configure environment variables (e.g., port, host).

3. **Implement the `getFeedSkeleton` Handler**
   - Open `src/subscription.ts` in Cursor.
   - Modify the code to filter posts from your `SWARM_COMMUNITY_MEMBERS` list. For example:
     ```typescript
     const SWARM_COMMUNITY_MEMBERS = ['did:plc:member1', 'did:plc:member2']; // Your list here
     if (SWARM_COMMUNITY_MEMBERS.includes(post.author)) {
       // Add post URI to database
     }
     ```
   - Ensure the `getFeedSkeleton` endpoint returns URIs of these posts.

### Execution Summary
- Cloned the Bluesky feed generator repository as a starting point
- Installed all required dependencies for the feed generator
- Created a `swarm-community-members.ts` file to store the list of community members
- Implemented a new algorithm file `swarm-community.ts` for the Swarm community feed
- Updated `algos/index.ts` to register our new Swarm community feed algorithm
- Modified `subscription.ts` to filter posts from Swarm community members
- Created a `.env` configuration file for the feed generator
- The implementation filters posts based on whether the author is in the `SWARM_COMMUNITY_MEMBERS` list
- The feed generator is configured to run on localhost:3000 with a placeholder DID

**Done**

---

## Step 3: Implement Feed Generation Logic
This step involves subscribing to real-time posts and caching relevant ones.

1. **Subscribe to the AT Protocol Firehose**
   - Install the firehose library:
     ```bash
     npm install @atproto/firehose
     ```
   - Add subscription logic in `src/subscription.ts` (refer to [Custom Feeds | Bluesky](https://docs.bsky.app/docs/starter-templates/custom-feeds) for examples).

2. **Filter Posts**
   - In the subscription handler, check if the post's author DID is in `SWARM_COMMUNITY_MEMBERS`:
     ```typescript
     if (SWARM_COMMUNITY_MEMBERS.includes(event.author)) {
       // Process post
     }
     ```

3. **Cache Posts in the Database**
   - Use SQLite (included in the starter kit) to store post URIs:
     ```typescript
     db.prepare('INSERT INTO posts (uri) VALUES (?)').run(post.uri);
     ```

### Execution Summary
- Implemented the feed generation logic in the `subscription.ts` file
- Added filtering logic to identify posts from Swarm community members using the `isSwarmCommunityMember` function
- Configured the subscription to process the AT Protocol firehose events
- Set up database operations to store post URIs from community members
- Implemented caching mechanism for posts in the SQLite database
- The feed generator now properly subscribes to the firehose, filters posts from community members, and stores them for retrieval
- The implementation follows the AT Protocol standards for feed generators

**Done**

---

## Step 4: Create the Algorithm Record
Declare your feed generator in the AT Protocol ecosystem.

1. **Create the Record**
   - Use an AT Protocol client library (e.g., `@atproto/api`) to create a record:
     ```bash
     npm install @atproto/api
     ```
   - Write a script (e.g., `create-record.js`):
     ```javascript
     const { BskyAgent } = require('@atproto/api');
     const agent = new BskyAgent({ service: 'https://bsky.social' });
     await agent.login({ identifier: 'your-handle', password: 'your-password' });
     await agent.createRecord({
       repo: 'YOUR_FEED_DID',
       collection: 'app.bsky.feed.generator',
       record: { name: 'swarm-community' },
     });
     ```
   - Run it:
     ```bash
     node create-record.js
     ```

2. **Verify the Record URI**
   - The URI should be `at://{YOUR_FEED_DID}/app.bsky.feed.generator/swarm-community`.

### Execution Summary
- Created a script `publishSwarmFeed.ts` to publish the Swarm community feed generator
- Implemented authentication with the Bluesky API using the AtpAgent
- Added configuration for the feed generator record with proper metadata:
  - Display name: "Swarm Community"
  - Description: "A feed of posts from the Swarm community members"
  - Record key: "swarm-community"
- Updated the `.env` file to include variables for Bluesky credentials
- The script verifies all required environment variables before attempting to publish
- The feed URI will be in the format: `at://{publisherDid}/app.bsky.feed.generator/swarm-community`
- The implementation follows the AT Protocol standards for feed generator records

**Done**

---

## Step 5: Configure the DID Document
Link your server to the DID.

1. **Update the DID Document**
   - Add a service endpoint (e.g., `https://feed.swarm.example.com`) to your DID document. Use `@did-plc/lib` to update it (see GitHub docs).
   - Ensure the endpoint uses HTTPS and port 443.

2. **Verify the DID Document**
   - Check it at `https://plc.directory/{YOUR_FEED_DID}` to confirm the endpoint is set.

---

## Step 6: Update the Client Application
Integrate the feed into your client.

1. **Set the Feed URI**
   - In your client code, update the feed URI to:
     ```
     at://{YOUR_FEED_DID}/app.bsky.feed.generator/swarm-community
     ```

2. **Test the Client**
   - Launch the client and verify that it displays posts from `SWARM_COMMUNITY_MEMBERS`.

---

## Additional Notes
- **Authentication**: The `getFeedSkeleton` request includes a JWT. Verify it on your server using the user's public key from their DID document.
- **Security**: Use HTTPS for your server and secure your keys.
- **Testing**: Test each step incrementally to catch errors early.

---