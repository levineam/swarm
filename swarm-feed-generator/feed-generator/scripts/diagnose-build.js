const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if the dist directory exists
const distDir = path.join(__dirname, '../dist');
console.log(`Checking if dist directory exists: ${fs.existsSync(distDir)}`);

// Check if the server.js file exists in the dist directory
const serverJsPath = path.join(distDir, 'server.js');
console.log(`Checking if server.js exists: ${fs.existsSync(serverJsPath)}`);

// Check the content of the server.js file
if (fs.existsSync(serverJsPath)) {
  const serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
  
  // Check if the direct XRPC endpoints are included
  const hasDescribeFeedGenerator = serverJsContent.includes('/xrpc/app.bsky.feed.describeFeedGenerator');
  const hasGetFeedSkeleton = serverJsContent.includes('/xrpc/app.bsky.feed.getFeedSkeleton');
  const hasXrpcTest = serverJsContent.includes('/xrpc-test');
  
  console.log(`Direct XRPC endpoints included in server.js:`);
  console.log(`- describeFeedGenerator: ${hasDescribeFeedGenerator}`);
  console.log(`- getFeedSkeleton: ${hasGetFeedSkeleton}`);
  console.log(`- xrpc-test: ${hasXrpcTest}`);
  
  // Check if there are any errors in the file
  const errorLines = serverJsContent.split('\n').filter(line => line.includes('ERROR:'));
  if (errorLines.length > 0) {
    console.log('Errors found in server.js:');
    errorLines.forEach(line => console.log(`- ${line.trim()}`));
  }
}

// Check the git status
try {
  console.log('\nGit status:');
  console.log(execSync('git status').toString());
  
  console.log('\nLatest commits:');
  console.log(execSync('git log -n 3 --oneline').toString());
} catch (error) {
  console.error('Error executing git commands:', error.message);
}

// Check the package.json scripts
const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = require(packageJsonPath);
  console.log('\nPackage.json scripts:');
  console.log(packageJson.scripts);
}

// Check the build output
try {
  console.log('\nRunning a test build:');
  console.log(execSync('npm run build').toString());
  
  // Check if the direct XRPC endpoints are included in the built server.js
  if (fs.existsSync(serverJsPath)) {
    const serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Check if the direct XRPC endpoints are included
    const hasDescribeFeedGenerator = serverJsContent.includes('/xrpc/app.bsky.feed.describeFeedGenerator');
    const hasGetFeedSkeleton = serverJsContent.includes('/xrpc/app.bsky.feed.getFeedSkeleton');
    const hasXrpcTest = serverJsContent.includes('/xrpc-test');
    
    console.log(`\nAfter build, direct XRPC endpoints included in server.js:`);
    console.log(`- describeFeedGenerator: ${hasDescribeFeedGenerator}`);
    console.log(`- getFeedSkeleton: ${hasGetFeedSkeleton}`);
    console.log(`- xrpc-test: ${hasXrpcTest}`);
  }
} catch (error) {
  console.error('Error running build:', error.message);
} 