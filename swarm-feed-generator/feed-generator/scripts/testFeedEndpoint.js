const axios = require('axios');

async function testFeedEndpoint() {
  try {
    console.log('Testing feed generator endpoint...');
    
    // Test the health endpoint
    console.log('\nTesting health endpoint:');
    const healthResponse = await axios.get('https://swarm-feed-generator.onrender.com/health');
    console.log('Health endpoint response:', healthResponse.status, healthResponse.data);
    
    // Test the DID document
    console.log('\nTesting DID document:');
    const didResponse = await axios.get('https://swarm-feed-generator.onrender.com/.well-known/did.json');
    console.log('DID document response status:', didResponse.status);
    console.log('DID document:', JSON.stringify(didResponse.data, null, 2));
    
    // Test the debug endpoint
    console.log('\nTesting debug endpoint:');
    const debugResponse = await axios.get('https://swarm-feed-generator.onrender.com/debug');
    console.log('Debug endpoint response status:', debugResponse.status);
    console.log('Debug info:', JSON.stringify(debugResponse.data, null, 2));
    
    // Test the XRPC endpoint
    console.log('\nTesting XRPC endpoint:');
    const xrpcResponse = await axios.get(
      'https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton',
      {
        params: {
          feed: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community',
          limit: 10
        }
      }
    );
    console.log('XRPC endpoint response status:', xrpcResponse.status);
    console.log('XRPC response:', JSON.stringify(xrpcResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing feed generator endpoint:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
  }
}

testFeedEndpoint(); 