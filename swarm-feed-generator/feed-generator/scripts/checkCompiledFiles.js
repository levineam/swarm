const fs = require('fs');
const path = require('path');

function checkCompiledFiles() {
  console.log('=== Checking Compiled JavaScript Files ===');
  
  // Define the paths to check
  const distDir = path.join(__dirname, '../dist');
  const methodsDir = path.join(distDir, 'methods');
  const feedGenerationFile = path.join(methodsDir, 'feed-generation.js');
  
  console.log(`Checking if dist directory exists: ${distDir}`);
  if (!fs.existsSync(distDir)) {
    console.log('❌ dist directory does not exist. Build may have failed.');
    return;
  }
  console.log('✅ dist directory exists.');
  
  console.log(`Checking if methods directory exists: ${methodsDir}`);
  if (!fs.existsSync(methodsDir)) {
    console.log('❌ methods directory does not exist. Build may have failed.');
    return;
  }
  console.log('✅ methods directory exists.');
  
  console.log(`Checking if feed-generation.js exists: ${feedGenerationFile}`);
  if (!fs.existsSync(feedGenerationFile)) {
    console.log('❌ feed-generation.js does not exist. Build may have failed.');
    return;
  }
  console.log('✅ feed-generation.js exists.');
  
  // Read the feed-generation.js file
  console.log('\nReading feed-generation.js...');
  const feedGenerationContent = fs.readFileSync(feedGenerationFile, 'utf8');
  console.log('Content of feed-generation.js:');
  console.log(feedGenerationContent);
  
  // Check if the file contains the XRPC endpoint registration
  if (feedGenerationContent.includes('getFeedSkeleton')) {
    console.log('\n✅ feed-generation.js contains getFeedSkeleton endpoint registration.');
  } else {
    console.log('\n❌ feed-generation.js does NOT contain getFeedSkeleton endpoint registration.');
  }
  
  // Check the server.js file
  const serverFile = path.join(distDir, 'server.js');
  console.log(`\nChecking if server.js exists: ${serverFile}`);
  if (!fs.existsSync(serverFile)) {
    console.log('❌ server.js does not exist. Build may have failed.');
    return;
  }
  console.log('✅ server.js exists.');
  
  // Read the server.js file
  console.log('\nReading server.js...');
  const serverContent = fs.readFileSync(serverFile, 'utf8');
  
  // Check if the file contains the feedGeneration function call
  if (serverContent.includes('feedGeneration(server, ctx)')) {
    console.log('\n✅ server.js contains feedGeneration function call.');
  } else {
    console.log('\n❌ server.js does NOT contain feedGeneration function call.');
  }
  
  // Check the index.js file
  const indexFile = path.join(distDir, 'index.js');
  console.log(`\nChecking if index.js exists: ${indexFile}`);
  if (!fs.existsSync(indexFile)) {
    console.log('❌ index.js does not exist. Build may have failed.');
    return;
  }
  console.log('✅ index.js exists.');
  
  // Read the index.js file
  console.log('\nReading index.js...');
  const indexContent = fs.readFileSync(indexFile, 'utf8');
  
  // Check if the file contains the feedGenerator.start() call
  if (indexContent.includes('feedGenerator.start()')) {
    console.log('\n✅ index.js contains feedGenerator.start() call.');
  } else {
    console.log('\n❌ index.js does NOT contain feedGenerator.start() call.');
  }
  
  console.log('\n=== Check Complete ===');
}

checkCompiledFiles(); 