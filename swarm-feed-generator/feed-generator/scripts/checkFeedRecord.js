const { BskyAgent } = require('@atproto/api');
require('dotenv').config();

async function checkFeedRecord() {
  const agent = new BskyAgent({
    service: 'https://bsky.social'
  });

  try {
    // Login
    await agent.login({
      identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
      password: process.env.BLUESKY_PASSWORD
    });

    console.log('Logged in successfully');
    console.log('Checking feed generator record...');

    // Get the feed generator record
    const result = await agent.api.com.atproto.repo.getRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.generator',
      rkey: 'swarm-community'
    });

    console.log('Feed generator record found:');
    console.log(JSON.stringify(result.data.value, null, 2));

    // Check if the DID in the record matches the expected DID
    // Per AT Protocol specifications, the feed generator record should use the publisher DID
    const expectedDid = process.env.FEEDGEN_PUBLISHER_DID || 'did:plc:ouadmsyvsfcpkxg3yyz4trqi';
    const actualDid = result.data.value.did;

    if (actualDid === expectedDid) {
      console.log(`✅ DID is correct: ${actualDid}`);
    } else {
      console.log(`❌ DID is incorrect!`);
      console.log(`Expected: ${expectedDid}`);
      console.log(`Actual: ${actualDid}`);
      
      // Ask if the user wants to update the DID
      console.log('\nWould you like to update the DID? (Run updateFeedGenDid.js script)');
    }
  } catch (error) {
    console.error('Error checking feed generator record:', error);
    if (error.status === 404) {
      console.log('Feed generator record not found. You may need to create it first.');
    }
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkFeedRecord(); 