const axios = require('axios');

const BASE_URL = 'https://swarm-feed-generator.onrender.com';

async function checkEndpoint(url) {
  try {
    console.log(`Checking ${url}...`);
    const response = await axios.get(url);
    console.log(`Status: ${response.status}`);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error checking ${url}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function main() {
  console.log('Checking feed generator endpoints...');
  
  // Check health endpoint
  await checkEndpoint(`${BASE_URL}/health`);
  
  // Check debug endpoint
  await checkEndpoint(`${BASE_URL}/debug`);
  
  // Check DID document
  await checkEndpoint(`${BASE_URL}/.well-known/did.json`);
  
  // Check describeFeedGenerator endpoint
  await checkEndpoint(`${BASE_URL}/xrpc/app.bsky.feed.describeFeedGenerator`);
  
  // Check getFeedSkeleton endpoint
  await checkEndpoint(`${BASE_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`);
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 