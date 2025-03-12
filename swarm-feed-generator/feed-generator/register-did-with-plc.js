/**
 * Register DID with PLC Directory
 * 
 * This script registers a DID with the PLC directory by submitting
 * the signed operation to the PLC directory API.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function registerDidWithPlc() {
  try {
    console.log('Registering DID with PLC directory...');
    
    // Load the DID information
    const didInfoPath = path.join(__dirname, 'new-did-info.json');
    if (!fs.existsSync(didInfoPath)) {
      console.error(`Error: ${didInfoPath} not found`);
      console.error('Please run create-feed-generator-did.js first to create a new DID');
      process.exit(1);
    }
    
    const didInfo = JSON.parse(fs.readFileSync(didInfoPath, 'utf8'));
    const { did, operation } = didInfo;
    
    console.log(`Registering DID: ${did}`);
    
    // Submit the operation to the PLC directory
    console.log('Submitting operation to PLC directory...');
    const response = await axios.post(`https://plc.directory/${did}`, operation, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      console.log('DID successfully registered with PLC directory!');
      
      // Update the DID info file to mark it as registered
      didInfo.registeredAt = new Date().toISOString();
      fs.writeFileSync(didInfoPath, JSON.stringify(didInfo, null, 2));
      
      console.log('\nNext steps:');
      console.log('1. Update the following values in your .env file:');
      console.log(`   - FEEDGEN_PUBLISHER_DID=${did}`);
      console.log(`   - FEEDGEN_SERVICE_DID=${did}`);
      console.log('2. Run the publishSwarmFeedWithNewDid.ts script to publish the feed generator record under the new DID');
      
      return did;
    } else {
      console.error(`Error: Unexpected response status: ${response.status}`);
      console.error(response.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error registering DID with PLC directory:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

// Execute the function
registerDidWithPlc()
  .then(did => {
    console.log(`\nProcess completed successfully. Your DID ${did} is now registered.`);
  })
  .catch(error => {
    console.error('Process failed:', error);
    process.exit(1);
  }); 