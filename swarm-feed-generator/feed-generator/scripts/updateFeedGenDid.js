const { BskyAgent } = require('@atproto/api');

async function updateFeedGenDid() {
  try {
    console.log('Updating feed generator DID...');
    
    // Get credentials from environment variables
    const handle = process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social';
    const password = process.env.BLUESKY_PASSWORD || 'v2k2BY0nth$B9';
    const feedName = 'swarm-community';
    const newDid = 'did:web:swarm-feed-generator.onrender.com';
    
    console.log(`Using handle: ${handle}`);
    console.log(`Feed name: ${feedName}`);
    console.log(`New DID: ${newDid}`);
    
    // Create a Bluesky agent
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    
    // Log in to Bluesky
    console.log('Logging in to Bluesky...');
    await agent.login({ identifier: handle, password });
    console.log('Logged in successfully!');
    
    // Get the current feed generator record
    console.log('Fetching current feed generator record...');
    const currentRecord = await agent.com.atproto.repo.getRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.generator',
      rkey: feedName
    });
    
    const record = currentRecord.data.value;
    console.log('Current record:', JSON.stringify(record, null, 2));
    
    // Update the DID
    const oldDid = record.did;
    record.did = newDid;
    
    // Put the updated record
    console.log(`Updating DID from ${oldDid} to ${newDid}...`);
    await agent.com.atproto.repo.putRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.generator',
      rkey: feedName,
      record
    });
    
    console.log('Feed generator DID updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating feed generator DID:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Error message:', error.message);
    }
    return false;
  }
}

// Execute the update
updateFeedGenDid(); 