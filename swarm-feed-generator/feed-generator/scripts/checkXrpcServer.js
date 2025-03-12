const axios = require('axios');

async function checkXrpcServer() {
  const baseUrl = 'https://swarm-feed-generator.onrender.com';
  
  console.log('=== XRPC Server Configuration Check ===');
  console.log(`Testing service at: ${baseUrl}`);
  
  try {
    // Step 1: Check if the service is running
    console.log('\n1. Checking if the service is running...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log(`Health endpoint status: ${healthResponse.status}`);
    console.log(`Health endpoint response: ${healthResponse.data}`);
    
    // Step 2: Check the debug endpoint
    console.log('\n2. Checking the debug endpoint...');
    const debugResponse = await axios.get(`${baseUrl}/debug`);
    console.log(`Debug endpoint status: ${debugResponse.status}`);
    
    // Extract the environment variables
    const env = debugResponse.data.environment;
    console.log('\nEnvironment Variables:');
    console.log(`- NODE_ENV: ${env.NODE_ENV}`);
    console.log(`- PORT: ${env.PORT}`);
    console.log(`- FEEDGEN_HOSTNAME: ${env.FEEDGEN_HOSTNAME}`);
    console.log(`- FEEDGEN_PUBLISHER_DID: ${env.FEEDGEN_PUBLISHER_DID}`);
    console.log(`- FEEDGEN_SERVICE_DID: ${env.FEEDGEN_SERVICE_DID}`);
    
    // Extract the configuration
    const config = debugResponse.data.config;
    if (config) {
      console.log('\nConfiguration:');
      console.log(`- hostname: ${config.hostname}`);
      console.log(`- publisherDid: ${config.publisherDid}`);
      console.log(`- serviceDid: ${config.serviceDid}`);
      console.log(`- port: ${config.port}`);
      console.log(`- listenhost: ${config.listenhost}`);
    }
    
    // Extract the paths
    const paths = debugResponse.data.paths;
    console.log('\nPaths:');
    console.log(`- currentDir: ${paths.currentDir}`);
    console.log(`- publicDir: ${paths.publicDir}`);
    console.log(`- wellKnownDir: ${paths.wellKnownDir}`);
    console.log(`- cwd: ${paths.cwd}`);
    
    // Extract the files
    const files = debugResponse.data.files;
    console.log('\nFiles:');
    console.log(`- publicDirExists: ${files.publicDirExists}`);
    console.log(`- wellKnownDirExists: ${files.wellKnownDirExists}`);
    console.log(`- didJsonExists: ${files.didJsonExists}`);
    
    // Step 3: Test the XRPC endpoint with different paths
    console.log('\n3. Testing the XRPC endpoint with different paths...');
    
    // Test the root XRPC path
    try {
      const xrpcRootResponse = await axios.get(`${baseUrl}/xrpc`);
      console.log(`XRPC root path status: ${xrpcRootResponse.status}`);
      console.log(`XRPC root path response: ${JSON.stringify(xrpcRootResponse.data, null, 2)}`);
    } catch (error) {
      console.error('Error testing XRPC root path:');
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(error.message);
      }
    }
    
    // Test the app.bsky.feed path
    try {
      const xrpcFeedResponse = await axios.get(`${baseUrl}/xrpc/app.bsky.feed`);
      console.log(`XRPC app.bsky.feed path status: ${xrpcFeedResponse.status}`);
      console.log(`XRPC app.bsky.feed path response: ${JSON.stringify(xrpcFeedResponse.data, null, 2)}`);
    } catch (error) {
      console.error('Error testing XRPC app.bsky.feed path:');
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(error.message);
      }
    }
    
    // Test the describeFeedGenerator endpoint
    try {
      const describeFeedResponse = await axios.get(`${baseUrl}/xrpc/app.bsky.feed.describeFeedGenerator`);
      console.log(`XRPC describeFeedGenerator endpoint status: ${describeFeedResponse.status}`);
      console.log(`XRPC describeFeedGenerator response: ${JSON.stringify(describeFeedResponse.data, null, 2)}`);
    } catch (error) {
      console.error('Error testing XRPC describeFeedGenerator endpoint:');
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(error.message);
      }
    }
    
    console.log('\n=== Check Complete ===');
  } catch (error) {
    console.error('Error during check:');
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error.message);
    }
  }
}

checkXrpcServer(); 