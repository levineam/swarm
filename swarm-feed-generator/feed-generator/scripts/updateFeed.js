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

    // Create feed generator record
    const record = {
      did: 'did:web:swarm-feed-generator.onrender.com',
      feed: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community',
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
  } catch (error) {
    console.error('Error publishing feed generator:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

publishFeed(); 