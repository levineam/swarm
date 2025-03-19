const fs = require('fs');
const path = require('path');
const axios = require('axios');

console.log('=== DIAGNOSING ROOT PATH HANDLER ISSUE ===');
console.log('Current working directory:', process.cwd());

// Check if the dist directory exists
const distDir = path.join(process.cwd(), 'dist');
console.log(`Checking if dist directory exists: ${fs.existsSync(distDir)}`);

// Check if the server.js file exists in the dist directory
const serverJsPath = path.join(distDir, 'server.js');
console.log(`Checking if server.js exists: ${fs.existsSync(serverJsPath)}`);

if (!fs.existsSync(serverJsPath)) {
  console.error('server.js not found in dist directory');
  process.exit(1);
}

// Read the server.js file
let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
console.log(`Read ${serverJsContent.length} bytes from server.js`);

// Check if the root path handler is included
const hasRootPath = serverJsContent.includes("app.get('/', (req, res)");
console.log(`Root path handler included in server.js: ${hasRootPath}`);

// Check if the modify-server-on-startup.js script is being executed
console.log('\nChecking if modify-server-on-startup.js is being executed...');
console.log('Looking for startup logs in the server logs...');

// Check the package.json file
const packageJsonPath = path.join(process.cwd(), 'package.json');
console.log(`Checking if package.json exists: ${fs.existsSync(packageJsonPath)}`);

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('Start script in package.json:', packageJson.scripts.start);
  
  // Check if modify-server-on-startup.js is included in the start script
  const isModifyServerIncluded = packageJson.scripts.start.includes('modify-server-on-startup.js');
  console.log(`modify-server-on-startup.js included in start script: ${isModifyServerIncluded}`);
}

// Check the deployed service
console.log('\nChecking the deployed service...');

async function checkDeployedService() {
  try {
    // Check the health endpoint
    console.log('Checking health endpoint...');
    const healthResponse = await axios.get('https://swarm-feed-generator.onrender.com/health', { timeout: 5000 });
    console.log(`Health endpoint status: ${healthResponse.status}`);
    console.log(`Health endpoint response: ${healthResponse.data}`);
    
    // Check the root path
    console.log('\nChecking root path...');
    try {
      const rootResponse = await axios.get('https://swarm-feed-generator.onrender.com/', { timeout: 5000 });
      console.log(`Root path status: ${rootResponse.status}`);
      console.log(`Root path response length: ${rootResponse.data.length} characters`);
    } catch (error) {
      console.error(`Error accessing root path: ${error.message}`);
      if (error.response) {
        console.log(`Root path status: ${error.response.status}`);
      }
    }
    
    // Check the XRPC endpoints
    console.log('\nChecking XRPC endpoints...');
    const describeFeedResponse = await axios.get('https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator', { timeout: 5000 });
    console.log(`describeFeedGenerator endpoint status: ${describeFeedResponse.status}`);
    
    const getFeedSkeletonResponse = await axios.get('https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton', { timeout: 5000 });
    console.log(`getFeedSkeleton endpoint status: ${getFeedSkeletonResponse.status}`);
    
  } catch (error) {
    console.error(`Error checking deployed service: ${error.message}`);
  }
}

// Run the check
checkDeployedService().then(() => {
  console.log('\n=== DIAGNOSIS COMPLETE ===');
  
  console.log('\nRecommendations:');
  if (!hasRootPath) {
    console.log('1. The root path handler is not included in server.js. Try manually adding it to the server.js file.');
  }
  
  console.log('2. Check the Render logs to see if the modify-server-on-startup.js script is being executed.');
  console.log('3. Make sure the start script in package.json includes the modify-server-on-startup.js script.');
  console.log('4. Try redeploying the service on Render.');
}); 