require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { BskyAgent } = require('@atproto/api');

/**
 * Update DID Document with Feed Generator Service
 * 
 * This script updates the DID document in the PLC directory to include
 * a service entry for the feed generator.
 */
async function updateDidDocument() {
  try {
    // Get credentials from .env file
    const handle = process.env.BLUESKY_USERNAME;
    const password = process.env.BLUESKY_PASSWORD;
    
    if (!handle || !password) {
      console.error('Error: BLUESKY_USERNAME and BLUESKY_PASSWORD must be set in .env file');
      process.exit(1);
    }
    
    console.log(`Logging in as ${handle}...`);
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier: handle, password: password });
    
    const did = process.env.FEEDGEN_PUBLISHER_DID;
    if (!did) {
      console.error('Error: FEEDGEN_PUBLISHER_DID must be set in .env file');
      process.exit(1);
    }
    
    // Get the current DID document
    console.log(`Fetching current DID document for ${did}...`);
    const response = await fetch(`https://plc.directory/${did}`);
    if (!response.ok) {
      console.error(`Error fetching DID document: ${response.status} ${response.statusText}`);
      process.exit(1);
    }
    
    const didDocument = await response.json();
    console.log('Current DID document:');
    console.log(JSON.stringify(didDocument, null, 2));
    
    // Check if the feed generator service already exists
    const feedGenService = didDocument.service?.find(s => s.type === 'AtprotoFeedGenerator');
    if (feedGenService) {
      console.log('Feed generator service already exists in DID document:');
      console.log(JSON.stringify(feedGenService, null, 2));
      
      // Check if the service endpoint is correct
      const serviceEndpoint = process.env.FEEDGEN_SERVICE_ENDPOINT || 'https://swarm-social.onrender.com';
      if (feedGenService.serviceEndpoint === serviceEndpoint) {
        console.log('Service endpoint is already correct.');
        return;
      }
      
      console.log(`Updating service endpoint from ${feedGenService.serviceEndpoint} to ${serviceEndpoint}...`);
      feedGenService.serviceEndpoint = serviceEndpoint;
    } else {
      // Add the feed generator service
      const serviceEndpoint = process.env.FEEDGEN_SERVICE_ENDPOINT || 'https://swarm-social.onrender.com';
      console.log(`Adding feed generator service with endpoint ${serviceEndpoint}...`);
      
      if (!didDocument.service) {
        didDocument.service = [];
      }
      
      didDocument.service.push({
        id: '#atproto_feed_generator',
        type: 'AtprotoFeedGenerator',
        serviceEndpoint
      });
    }
    
    // Update the DID document using the com.atproto.identity.updateHandle method
    console.log('Updating DID document...');
    
    // Note: This is a placeholder. The actual method to update a DID document
    // requires access to the rotation key, which is not typically available.
    // In practice, you would need to use the PLC directory's web interface
    // or a specialized tool to update the DID document.
    console.log('\nIMPORTANT: This script cannot automatically update the DID document.');
    console.log('You need to manually update the DID document using the PLC directory web interface.');
    console.log('\nFollow these steps:');
    console.log('1. Go to https://web.plc.directory/');
    console.log(`2. Enter your DID: ${did}`);
    console.log('3. Authenticate with your Bluesky account');
    console.log('4. Add a new service with the following details:');
    console.log('   - Service ID: atproto_feed_generator');
    console.log('   - Type: AtprotoFeedGenerator');
    console.log(`   - Endpoint: ${process.env.FEEDGEN_SERVICE_ENDPOINT || 'https://swarm-social.onrender.com'}`);
    console.log('5. Save the changes');
    
    // Save the updated DID document to a file for reference
    const updatedDidPath = path.join(__dirname, 'updated-did-document.json');
    fs.writeFileSync(updatedDidPath, JSON.stringify(didDocument, null, 2));
    console.log(`\nSaved the updated DID document to ${updatedDidPath} for reference.`);
    
    return didDocument;
  } catch (error) {
    console.error('Error updating DID document:', error.message);
    throw error;
  }
}

// Execute the function
updateDidDocument()
  .then(() => {
    console.log('\nProcess completed successfully.');
  })
  .catch(error => {
    console.error('Process failed:', error);
    process.exit(1);
  }); 