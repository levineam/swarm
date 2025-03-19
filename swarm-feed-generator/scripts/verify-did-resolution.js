const { BskyAgent } = require('@atproto/api');

async function verifyDidResolution() {
  const agent = new BskyAgent({ service: 'https://bsky.social' });
  
  try {
    // Test service DID resolution
    console.log('Testing service DID resolution...');
    const serviceDid = 'did:web:swarm-feed-generator.onrender.com';
    const serviceDidDoc = await agent.resolveHandle({ handle: serviceDid });
    console.log('Service DID resolved successfully:', serviceDidDoc);
    
    // Test feed URI resolution with service DID
    console.log('\nTesting feed URI resolution with service DID...');
    const feedUriService = 'at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community';
    try {
      const feedService = await agent.app.bsky.feed.getFeedSkeleton({ feed: feedUriService });
      console.log('Feed URI with service DID resolved successfully!');
    } catch (e) {
      console.error('Feed URI with service DID resolution failed:', e.message);
    }
    
    // Test feed URI resolution with publisher DID
    console.log('\nTesting feed URI resolution with publisher DID...');
    const feedUriPublisher = 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community';
    try {
      const feedPublisher = await agent.app.bsky.feed.getFeedSkeleton({ feed: feedUriPublisher });
      console.log('Feed URI with publisher DID resolved successfully!');
    } catch (e) {
      console.error('Feed URI with publisher DID resolution failed:', e.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyDidResolution(); 