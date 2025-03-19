#!/usr/bin/env node

/**
 * This script updates all DID documents in the project to ensure consistency.
 * It updates the service type to BskyFeedGenerator and ensures proper formatting.
 */

const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

console.log('=== UPDATING ALL DID DOCUMENTS ===')
console.log('Current working directory:', process.cwd())
console.log('Script execution timestamp:', new Date().toISOString())

// Get the hostname and service DID from environment variables
const hostname =
  process.env.FEEDGEN_HOSTNAME || 'swarm-feed-generator.onrender.com'
const serviceDid = process.env.FEEDGEN_SERVICE_DID || `did:web:${hostname}`

console.log('Hostname:', hostname)
console.log('Service DID:', serviceDid)

// Define paths for all possible DID document locations
const locations = [
  {
    path: path.join(process.cwd(), 'public/.well-known/did.json'),
    description: 'Main well-known DID document',
  },
  {
    path: path.join(process.cwd(), 'public/did.json'),
    description: 'Alternative DID document',
  },
  {
    path: path.join(process.cwd(), 'dist/public/.well-known/did.json'),
    description: 'Compiled well-known DID document',
  },
  {
    path: path.join(process.cwd(), 'dist/public/did.json'),
    description: 'Compiled alternative DID document',
  },
]

// Create the updated DID document
const didDocument = {
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/suites/secp256k1-2019/v1',
  ],
  id: serviceDid,
  verificationMethod: [
    {
      id: `${serviceDid}#atproto`,
      type: 'EcdsaSecp256k1VerificationKey2019',
      controller: serviceDid,
      publicKeyMultibase: 'zQ3shojKAGY2sK3ThMHW7soP4tYDWLCRjJt9w14XKxkKZnnnK',
    },
  ],
  service: [
    {
      id: '#atproto_pds',
      type: 'AtprotoPersonalDataServer',
      serviceEndpoint: 'https://bsky.social',
    },
    {
      id: '#bsky_fg',
      type: 'BskyFeedGenerator',
      serviceEndpoint: `https://${hostname}`,
    },
  ],
}

// Process each location
for (const location of locations) {
  // Make sure the directory exists
  const directory = path.dirname(location.path)
  
  try {
    if (!fs.existsSync(directory)) {
      console.log(`Creating directory: ${directory}`)
      fs.mkdirSync(directory, { recursive: true })
    }
    
    console.log(`Writing DID document to ${location.description}: ${location.path}`)
    fs.writeFileSync(location.path, JSON.stringify(didDocument, null, 2))
    console.log(`✅ Successfully updated ${location.description}`)
  } catch (error) {
    console.error(`❌ Error updating ${location.description}:`, error.message)
  }
}

// Also update the public HTML template that references the DID document
const didHtmlPath = path.join(process.cwd(), 'public/did-document.html')
try {
  const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
    <title>DID Document</title>
    <meta charset="utf-8">
    <script>
        // This script will redirect to the .well-known/did.json file
        window.location.href = '/.well-known/did.json';
    </script>
</head>
<body>
    <h1>DID Document</h1>
    <p>If you are not redirected automatically, please click <a href="/.well-known/did.json">here</a> to access the DID document.</p>
    <pre id="didDocument"></pre>
    <script>
        // As a fallback, we'll also embed the DID document directly in this page
        const didDocument = ${JSON.stringify(didDocument, null, 8)};
        
        document.getElementById('didDocument').textContent = JSON.stringify(didDocument, null, 2);
    </script>
</body>
</html>`

  console.log(`Writing DID HTML template to: ${didHtmlPath}`)
  fs.writeFileSync(didHtmlPath, htmlTemplate)
  console.log('✅ Successfully updated DID HTML template')
} catch (error) {
  console.error('❌ Error updating DID HTML template:', error.message)
}

console.log('=== DID DOCUMENT UPDATE COMPLETE ===')
console.log('Please deploy the changes for them to take effect') 