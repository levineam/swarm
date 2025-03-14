#!/usr/bin/env node

/**
 * This script ensures that the DID document is properly created and accessible.
 * It creates the necessary directories and files if they don't exist.
 */

const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Get the hostname and service DID from environment variables
const hostname =
  process.env.FEEDGEN_HOSTNAME || 'swarm-feed-generator.onrender.com'
const serviceDid = process.env.FEEDGEN_SERVICE_DID || `did:web:${hostname}`

console.log('Ensuring DID document is properly created and accessible...')
console.log('Hostname:', hostname)
console.log('Service DID:', serviceDid)

// Create the DID document content
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
      id: '#atproto_feed_generator',
      type: 'AtprotoFeedGenerator',
      serviceEndpoint: `https://${hostname}`,
    },
  ],
}

// Define the paths for the DID document
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const wellKnownDir = path.join(publicDir, '.well-known')
const didJsonPath = path.join(wellKnownDir, 'did.json')
const altDidJsonPath = path.join(publicDir, 'did.json')

// Create directories if they don't exist
console.log("Creating directories if they don't exist...")
if (!fs.existsSync(publicDir)) {
  console.log(`Creating directory: ${publicDir}`)
  fs.mkdirSync(publicDir, { recursive: true })
}

if (!fs.existsSync(wellKnownDir)) {
  console.log(`Creating directory: ${wellKnownDir}`)
  fs.mkdirSync(wellKnownDir, { recursive: true })
}

// Write the DID document to the .well-known directory
console.log(`Writing DID document to: ${didJsonPath}`)
fs.writeFileSync(didJsonPath, JSON.stringify(didDocument, null, 2))

// Write the DID document to the alternative location
console.log(`Writing DID document to: ${altDidJsonPath}`)
fs.writeFileSync(altDidJsonPath, JSON.stringify(didDocument, null, 2))

console.log('DID document has been created and is accessible at:')
console.log(`- ${didJsonPath}`)
console.log(`- ${altDidJsonPath}`)
console.log('')
console.log('After deployment, the DID document will be available at:')
console.log(`- https://${hostname}/.well-known/did.json`)
console.log(`- https://${hostname}/did.json`)
