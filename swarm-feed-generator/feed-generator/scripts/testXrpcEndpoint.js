const axios = require('axios');

async function testXrpcEndpoint() {
  try {
    console.log('Testing XRPC endpoint...');
    
    const response = await axios.get(
      'https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton',
      {
        params: {
          feed: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error testing XRPC endpoint:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testXrpcEndpoint(); 