const { BskyAgent } = require('@atproto/api');

async function publishFeed() {
  const agent = new BskyAgent({
    service: 'https://bsky.social'
  });

  try {
    // Login
    await agent.login({
      identifier: 'andrarchy.bsky.social',
      password: 'v2k2BY0nth$B9'
    });

    // Get the service DID from environment or use the default
    const serviceDid = process.env.FEEDGEN_SERVICE_DID || 'did:web:swarm-feed-generator.onrender.com';
    
    console.log(`Using service DID: ${serviceDid}`);
    
    // Create feed generator record with the service DID in both the DID field and the feed URI
    const record = {
      did: serviceDid,
      feed: `at://${serviceDid}/app.bsky.feed.generator/swarm-community`,
      displayName: 'Swarm 1',
      description: 'The first Swarm; building the Swarm app which is dedicated to helping people connect, communicate, and collaborate to create value.',
      avatar: undefined,
      createdAt: new Date().toISOString()
    };

    // Publish feed generator
    const result = await agent.api.com.atproto.repo.putRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.generator',
      rkey: 'swarm-community',
      record
    });

    console.log('Feed generator published successfully:', result);
    console.log(`Feed URI updated to: ${record.feed}`);
  } catch (error) {
    console.error('Error publishing feed generator:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

publishFeed(); 