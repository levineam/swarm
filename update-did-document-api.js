/**
 * Script to update the DID document with a service endpoint for the feed generator using the API
 */

const { BskyAgent } = require('@atproto/api');
const { DidPlc } = require('@did-plc/lib');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function updateDidDocument() {
  try {
    console.log('Updating DID document to add feed generator service endpoint...');

    // Create a new Bluesky agent
    const agent = new BskyAgent({
      service: 'https://bsky.social',
    });

    // Login with the provided credentials
    const handle = process.env.BLUESKY_USERNAME;
    const password = process.env.BLUESKY_PASSWORD;

    if (!handle || !password) {
      console.error('Error: BLUESKY_USERNAME and BLUESKY_PASSWORD must be set in .env file');
      process.exit(1);
    }

    console.log(`Logging in as ${handle}...`);

    try {
      await agent.login({
        identifier: handle,
        password: password,
      });

      console.log('Login successful!');
    } catch (loginError) {
      console.error('Login failed:', loginError.message);
      process.exit(1);
    }

    // Get the DID from the session
    const did = agent.session.did;
    console.log(`Using DID: ${did}`);

    // Get the current DID document
    const didPlc = new DidPlc('https://plc.directory');
    const didDoc = await didPlc.getDocumentByDid(did);
    console.log('Current DID document:', JSON.stringify(didDoc, null, 2));

    // Create the algorithm record
    console.log('Creating feed generator record...');
    try {
      const result = await agent.com.atproto.repo.createRecord({
        repo: did,
        collection: 'app.bsky.feed.generator',
        rkey: 'swarm-community',
        record: {
          did: did,
          displayName: 'Swarm Community',
          description: 'A feed of posts from Swarm community members',
          createdAt: new Date().toISOString()
        }
      });

      console.log('Feed generator record created successfully:', result);

      // Save the record URI
      const recordUri = `at://${did}/app.bsky.feed.generator/swarm-community`;
      console.log('Record URI:', recordUri);

      // Update the did-info.json file with the record URI
      const didInfoPath = path.join(__dirname, '..', 'did-info.json');
      if (fs.existsSync(didInfoPath)) {
        const didInfo = JSON.parse(fs.readFileSync(didInfoPath, 'utf8'));
        didInfo.algorithmUri = recordUri;
        didInfo.updatedAt = new Date().toISOString();
        fs.writeFileSync(didInfoPath, JSON.stringify(didInfo, null, 2));
        console.log('Updated did-info.json with algorithm URI');
      }

      return recordUri;
    } catch (error) {
      if (error.message.includes('duplicate record')) {
        console.log('Feed generator record already exists');
        const recordUri = `at://${did}/app.bsky.feed.generator/swarm-community`;
        console.log('Record URI:', recordUri);
        return recordUri;
      } else {
        console.error('Error creating feed generator record:', error.message);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Error in update process:', error);
    throw error;
  }
}

// Execute the function
updateDidDocument()
  .then(recordUri => {
    console.log('\nProcess completed successfully.');
    console.log(`Your feed generator record URI is: ${recordUri}`);
    console.log('\nNext steps:');
    console.log('1. Update the FEEDGEN_SERVICE_DID in your .env file to use your actual DID');
    console.log('2. Update the feed URI in your client application');
  })
  .catch(error => {
    console.error('Process failed:', error);
    process.exit(1);
  }); 