/**
 * Deploy DID Document
 *
 * This script copies the .well-known/did.json file to the public directory
 * so it can be served by the feed generator service.
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')

// Path to the DID document
const didDocumentPath = path.join(__dirname, '.well-known', 'did.json')

// Check if the DID document exists
if (!fs.existsSync(didDocumentPath)) {
  console.error(`DID document not found at ${didDocumentPath}`)
  process.exit(1)
}

console.log(`Found DID document at ${didDocumentPath}`)

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public')
if (!fs.existsSync(publicDir)) {
  console.log(`Creating public directory at ${publicDir}`)
  fs.mkdirSync(publicDir)
}

// Create .well-known directory in public if it doesn't exist
const publicWellKnownDir = path.join(publicDir, '.well-known')
if (!fs.existsSync(publicWellKnownDir)) {
  console.log(`Creating .well-known directory at ${publicWellKnownDir}`)
  fs.mkdirSync(publicWellKnownDir)
}

// Copy the DID document to the public directory
const publicDidDocumentPath = path.join(publicWellKnownDir, 'did.json')
fs.copyFileSync(didDocumentPath, publicDidDocumentPath)
console.log(`Copied DID document to ${publicDidDocumentPath}`)

console.log('\nDID document deployed successfully!')
console.log('\nNext steps:')
console.log('1. Restart your feed generator service')
console.log(
  `2. Verify that the DID document is accessible at https://${
    process.env.FEEDGEN_HOSTNAME || 'your-domain'
  }/.well-known/did.json`,
)
