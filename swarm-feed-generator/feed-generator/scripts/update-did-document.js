const fs = require('fs')
const path = require('path')

console.log('=== UPDATING DID DOCUMENT ===')
console.log('Current working directory:', process.cwd())
console.log('Script execution timestamp:', new Date().toISOString())

// Define paths
const publicDir = path.join(process.cwd(), 'public')
const wellKnownDir = path.join(publicDir, '.well-known')
const didJsonPath = path.join(wellKnownDir, 'did.json')
const altDidJsonPath = path.join(publicDir, 'did.json')

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
  console.log(`Creating public directory: ${publicDir}`)
  fs.mkdirSync(publicDir, { recursive: true })
}

if (!fs.existsSync(wellKnownDir)) {
  console.log(`Creating .well-known directory: ${wellKnownDir}`)
  fs.mkdirSync(wellKnownDir, { recursive: true })
}

// Create the updated DID document
const hostname =
  process.env.FEEDGEN_HOSTNAME || 'swarm-feed-generator.onrender.com'
const didDocument = {
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/suites/secp256k1-2019/v1',
  ],
  id: `did:web:${hostname}`,
  verificationMethod: [
    {
      id: `did:web:${hostname}#atproto`,
      type: 'EcdsaSecp256k1VerificationKey2019',
      controller: `did:web:${hostname}`,
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

// Write the DID document to both locations
try {
  fs.writeFileSync(didJsonPath, JSON.stringify(didDocument, null, 2))
  console.log(`Updated DID document written to: ${didJsonPath}`)
} catch (error) {
  console.error(`Error writing DID document to ${didJsonPath}:`, error.message)
}

try {
  fs.writeFileSync(altDidJsonPath, JSON.stringify(didDocument, null, 2))
  console.log(`Updated DID document written to: ${altDidJsonPath}`)
} catch (error) {
  console.error(
    `Error writing DID document to ${altDidJsonPath}:`,
    error.message,
  )
}

console.log('=== DID DOCUMENT UPDATE COMPLETE ===')
console.log('Please redeploy the service for the changes to take effect.')
