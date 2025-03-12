const axios = require('axios');

async function diagnoseXrpcIssue() {
  const baseUrl = 'https://swarm-feed-generator.onrender.com';
  
  console.log('=== XRPC Endpoint Diagnosis ===');
  console.log(`Testing service at: ${baseUrl}`);
  
  try {
    // Step 1: Check if the service is running
    console.log('\n1. Checking if the service is running...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log(`Health endpoint status: ${healthResponse.status}`);
    console.log(`Health endpoint response: ${healthResponse.data}`);
    
    // Step 2: Check if the DID document is being served
    console.log('\n2. Checking if the DID document is being served...');
    const didResponse = await axios.get(`${baseUrl}/.well-known/did.json`);
    console.log(`DID document status: ${didResponse.status}`);
    console.log(`DID document: ${JSON.stringify(didResponse.data, null, 2)}`);
    
    // Step 3: Check the debug endpoint
    console.log('\n3. Checking the debug endpoint...');
    const debugResponse = await axios.get(`${baseUrl}/debug`);
    console.log(`Debug endpoint status: ${debugResponse.status}`);
    console.log(`Debug info: ${JSON.stringify(debugResponse.data, null, 2)}`);
    
    // Step 4: Check available routes
    console.log('\n4. Checking available routes...');
    try {
      const invalidResponse = await axios.get(`${baseUrl}/invalid-route`);
      console.log(`Invalid route status: ${invalidResponse.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`Invalid route status: ${error.response.status}`);
        if (error.response.data && error.response.data.availableRoutes) {
          console.log(`Available routes: ${JSON.stringify(error.response.data.availableRoutes, null, 2)}`);
        }
      }
    }
    
    // Step 5: Test the XRPC endpoint
    console.log('\n5. Testing the XRPC endpoint...');
    try {
      const xrpcResponse = await axios.get(
        `${baseUrl}/xrpc/app.bsky.feed.getFeedSkeleton`,
        {
          params: {
            feed: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'
          }
        }
      );
      console.log(`XRPC endpoint status: ${xrpcResponse.status}`);
      console.log(`XRPC response: ${JSON.stringify(xrpcResponse.data, null, 2)}`);
    } catch (error) {
      console.error('Error testing XRPC endpoint:');
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(error.message);
      }
    }
    
    // Step 6: Test the XRPC endpoint with a different HTTP method
    console.log('\n6. Testing the XRPC endpoint with POST method...');
    try {
      const xrpcPostResponse = await axios.post(
        `${baseUrl}/xrpc/app.bsky.feed.getFeedSkeleton`,
        {
          feed: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'
        }
      );
      console.log(`XRPC POST endpoint status: ${xrpcPostResponse.status}`);
      console.log(`XRPC POST response: ${JSON.stringify(xrpcPostResponse.data, null, 2)}`);
    } catch (error) {
      console.error('Error testing XRPC endpoint with POST:');
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(error.message);
      }
    }
    
    console.log('\n=== Diagnosis Complete ===');
  } catch (error) {
    console.error('Error during diagnosis:');
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error.message);
    }
  }
}

diagnoseXrpcIssue(); 