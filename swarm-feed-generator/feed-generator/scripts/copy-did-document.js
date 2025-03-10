const fs = require('fs')
const path = require('path')

console.log('Running post-build script to copy DID document...')

// Define paths
const sourceDidPath = path.join(__dirname, '../.well-known/did.json')
const publicDir = path.join(__dirname, '../dist/public')
const publicWellKnownDir = path.join(publicDir, '.well-known')
const targetDidPath = path.join(publicWellKnownDir, 'did.json')

// Create directories if they don't exist
if (!fs.existsSync(publicDir)) {
  console.log(`Creating directory: ${publicDir}`)
  fs.mkdirSync(publicDir, { recursive: true })
}

if (!fs.existsSync(publicWellKnownDir)) {
  console.log(`Creating directory: ${publicWellKnownDir}`)
  fs.mkdirSync(publicWellKnownDir, { recursive: true })
}

// Check if source DID document exists
if (fs.existsSync(sourceDidPath)) {
  console.log(`Found DID document at: ${sourceDidPath}`)

  // Copy the DID document
  fs.copyFileSync(sourceDidPath, targetDidPath)
  console.log(`Copied DID document to: ${targetDidPath}`)
} else {
  console.log(`Warning: DID document not found at: ${sourceDidPath}`)

  // Check if we have a DID document in the public directory already
  const publicSourceDidPath = path.join(
    __dirname,
    '../public/.well-known/did.json',
  )
  if (fs.existsSync(publicSourceDidPath)) {
    console.log(
      `Found DID document in public directory at: ${publicSourceDidPath}`,
    )
    fs.copyFileSync(publicSourceDidPath, targetDidPath)
    console.log(`Copied DID document to: ${targetDidPath}`)
  } else {
    console.log('No DID document found. Creating a placeholder...')

    // Create a placeholder DID document
    // Read environment variables
    require('dotenv').config()

    const hostname = process.env.FEEDGEN_HOSTNAME || 'swarm-social.onrender.com'
    const serviceDid = process.env.FEEDGEN_SERVICE_DID || `did:web:${hostname}`

    const didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/secp256k1-2019/v1',
      ],
      id: serviceDid,
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

    fs.writeFileSync(targetDidPath, JSON.stringify(didDocument, null, 2))
    console.log(`Created placeholder DID document at: ${targetDidPath}`)
  }
}

console.log('Post-build script completed successfully.')
