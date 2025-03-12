/**
 * Create Feed Generator DID with Service Entry
 * 
 * This script creates a new DID using the @did-plc/lib library
 * and includes the feed generator service entry from the start.
 * It will store the rotation keys for future use.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { 
  createOp, 
  signOperation, 
  didForCreateOp,
  formatDidDoc
} = require('@did-plc/lib');
const { 
  Secp256k1Keypair, 
  P256Keypair 
} = require('@atproto/crypto');

async function createFeedGeneratorDid() {
  try {
    console.log('Creating a new DID for the feed generator...');

    // Generate a new key pair for the DID
    console.log('Generating key pairs...');
    const rotationKey = await Secp256k1Keypair.create();
    const signingKey = await Secp256k1Keypair.create();
    
    // Store the keys securely
    const keysDir = path.join(__dirname, 'keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir);
    }
    
    const rotationKeyPath = path.join(keysDir, 'rotation-key.json');
    const signingKeyPath = path.join(keysDir, 'signing-key.json');
    
    fs.writeFileSync(rotationKeyPath, JSON.stringify({
      privateKey: rotationKey.privateKeyStr,
      publicKey: rotationKey.publicKeyStr,
      did: rotationKey.did()
    }, null, 2));
    
    fs.writeFileSync(signingKeyPath, JSON.stringify({
      privateKey: signingKey.privateKeyStr,
      publicKey: signingKey.publicKeyStr,
      did: signingKey.did()
    }, null, 2));
    
    console.log(`Keys saved to ${keysDir}`);
    console.log('IMPORTANT: Keep these keys secure and back them up safely.');

    // Service endpoint from the .env file or default
    const serviceEndpoint = process.env.FEEDGEN_SERVICE_ENDPOINT || 'https://swarm-social.onrender.com';
    
    // Create a DID with our desired configuration
    const handle = process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social';
    
    // Define the services including the feed generator service
    const services = {
      atproto_pds: {
        type: "AtprotoPersonalDataServer",
        endpoint: "https://bsky.social"
      },
      atproto_feed_generator: {
        type: "AtprotoFeedGenerator",
        endpoint: serviceEndpoint
      }
    };
    
    // Create the operation
    console.log('Creating DID operation...');
    const operation = createOp({
      rotationKeys: [rotationKey.did()],
      verificationMethods: {
        atproto: signingKey.did()
      },
      services,
      alsoKnownAs: [`at://${handle}`],
      prev: null
    });
    
    // Sign the operation with the rotation key
    console.log('Signing DID operation...');
    
    // We need to manually sign the operation since the library's signOperation function
    // is having issues with the Secp256k1Keypair object
    const unsignedBytes = Buffer.from(JSON.stringify(operation));
    const signature = await rotationKey.sign(unsignedBytes);
    const signedOp = {
      ...operation,
      sig: Buffer.from(signature).toString('base64url')
    };
    
    // Calculate the DID from the operation
    const did = didForCreateOp(signedOp);
    console.log(`DID created: ${did}`);
    
    // Format the DID document for reference
    const didDoc = formatDidDoc(did, signedOp);
    
    // Save the DID information to a file
    const newDidInfo = {
      did,
      handle,
      rotationKeyPath,
      signingKeyPath,
      createdAt: new Date().toISOString(),
      services,
      operation: signedOp,
      didDoc,
      note: 'This is the DID for your Swarm feed generator with built-in service entry.',
      instructions: [
        'Use this DID in your feed generator configuration',
        'Update the FEEDGEN_PUBLISHER_DID and FEEDGEN_SERVICE_DID in your .env file',
        'Use this DID when creating the algorithm record'
      ]
    };
    
    const newDidInfoPath = path.join(__dirname, 'new-did-info.json');
    fs.writeFileSync(newDidInfoPath, JSON.stringify(newDidInfo, null, 2));
    
    console.log(`\nNew DID created: ${did}`);
    console.log(`DID information saved to ${newDidInfoPath}`);
    
    // Now we need to register the DID with the PLC directory
    console.log('\nTo register this DID with the PLC directory, you need to:');
    console.log('1. Run register-did-with-plc.js to submit the signed operation to the PLC directory');
    console.log('2. Update the following values in your .env file:');
    console.log(`   - FEEDGEN_PUBLISHER_DID=${did}`);
    console.log(`   - FEEDGEN_SERVICE_DID=${did}`);
    console.log('3. Run the publishSwarmFeedWithNewDid.ts script to publish the feed generator record under the new DID');
    
    return did;
  } catch (error) {
    console.error('Error creating feed generator DID:', error);
    throw error;
  }
}

// Execute the function
createFeedGeneratorDid()
  .then(did => {
    console.log(`\nProcess completed successfully. Your new DID is: ${did}`);
  })
  .catch(error => {
    console.error('Process failed:', error);
    process.exit(1);
  }); 