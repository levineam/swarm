const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

console.log('=== POST-BUILD SCRIPT: COPYING DID DOCUMENT ===')
console.log('Current working directory:', process.cwd())
console.log('Environment variables:')
console.log('- FEEDGEN_HOSTNAME:', process.env.FEEDGEN_HOSTNAME)
console.log('- FEEDGEN_SERVICE_DID:', process.env.FEEDGEN_SERVICE_DID)
console.log('- FEEDGEN_PUBLISHER_DID:', process.env.FEEDGEN_PUBLISHER_DID)

// Define paths
const sourceDidPath = path.join(__dirname, '../.well-known/did.json')
const distDir = path.join(__dirname, '../dist')
const publicDir = path.join(distDir, 'public')
const publicWellKnownDir = path.join(publicDir, '.well-known')
const targetDidPath = path.join(publicWellKnownDir, 'did.json')

// Also try alternative paths in case the build output is different
const altDistDir = path.join(process.cwd(), 'dist')
const altPublicDir = path.join(altDistDir, 'public')
const altPublicWellKnownDir = path.join(altPublicDir, '.well-known')
const altTargetDidPath = path.join(altPublicWellKnownDir, 'did.json')

// Check if dist directory exists
console.log('Checking if dist directory exists...')
if (!fs.existsSync(distDir)) {
  console.log(`Dist directory not found at: ${distDir}`)
  console.log(`Checking alternative path: ${altDistDir}`)
  if (!fs.existsSync(altDistDir)) {
    console.log(`Alternative dist directory not found at: ${altDistDir}`)
    console.log('Creating dist directory...')
    fs.mkdirSync(distDir, { recursive: true })
  } else {
    console.log(`Found alternative dist directory at: ${altDistDir}`)
  }
}

// Create directories if they don't exist
console.log('Creating necessary directories...')
const dirsToCreate = []

if (fs.existsSync(distDir)) {
  dirsToCreate.push(publicDir, publicWellKnownDir)
}

if (fs.existsSync(altDistDir)) {
  dirsToCreate.push(altPublicDir, altPublicWellKnownDir)
}

dirsToCreate.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`)
    fs.mkdirSync(dir, { recursive: true })
  } else {
    console.log(`Directory already exists: ${dir}`)
  }
})

// Check if source DID document exists
console.log('Checking for source DID document...')
let didDocument
if (fs.existsSync(sourceDidPath)) {
  console.log(`Found DID document at: ${sourceDidPath}`)
  try {
    didDocument = JSON.parse(fs.readFileSync(sourceDidPath, 'utf8'))
    console.log('Successfully parsed DID document')
  } catch (error) {
    console.error(`Error parsing DID document: ${error.message}`)
    didDocument = null
  }
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
    try {
      didDocument = JSON.parse(fs.readFileSync(publicSourceDidPath, 'utf8'))
      console.log('Successfully parsed DID document from public directory')
    } catch (error) {
      console.error(
        `Error parsing DID document from public directory: ${error.message}`,
      )
      didDocument = null
    }
  } else {
    console.log('No existing DID document found')
    didDocument = null
  }
}

// If we couldn't find a DID document, create one from environment variables
if (!didDocument) {
  console.log('Creating a new DID document from environment variables...')

  const hostname = process.env.FEEDGEN_HOSTNAME || 'swarm-social.onrender.com'
  const serviceDid = process.env.FEEDGEN_SERVICE_DID || `did:web:${hostname}`

  console.log(`Using hostname: ${hostname}`)
  console.log(`Using service DID: ${serviceDid}`)

  didDocument = {
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

  // If we have verification methods from an existing DID document, include them
  if (fs.existsSync(sourceDidPath)) {
    try {
      const existingDidDocument = JSON.parse(
        fs.readFileSync(sourceDidPath, 'utf8'),
      )
      if (existingDidDocument.verificationMethod) {
        didDocument.verificationMethod =
          existingDidDocument.verificationMethod.map((vm) => {
            // Update the controller and id to match the new service DID
            return {
              ...vm,
              id: vm.id.replace(/^did:web:[^#]+/, serviceDid),
              controller: serviceDid,
            }
          })
        console.log('Included verification methods from existing DID document')
      }
    } catch (error) {
      console.error(`Error including verification methods: ${error.message}`)
    }
  }
}

// Ensure the DID document has the correct hostname and service DID
const hostname = process.env.FEEDGEN_HOSTNAME || 'swarm-social.onrender.com'
const serviceDid = process.env.FEEDGEN_SERVICE_DID || `did:web:${hostname}`

console.log('Updating DID document with current environment values...')
didDocument.id = serviceDid

// Update service endpoints
if (didDocument.service) {
  didDocument.service = didDocument.service.map((service) => {
    if (service.type === 'AtprotoFeedGenerator') {
      return {
        ...service,
        serviceEndpoint: `https://${hostname}`,
      }
    }
    return service
  })
}

// Update verification methods if they exist
if (didDocument.verificationMethod) {
  didDocument.verificationMethod = didDocument.verificationMethod.map((vm) => {
    return {
      ...vm,
      id: vm.id.replace(/^did:web:[^#]+/, serviceDid),
      controller: serviceDid,
    }
  })
}

// Write the DID document to both target paths
console.log('Writing DID document to target paths...')
// Create .well-known directory in the source path if it doesn't exist
const sourceWellKnownDir = path.join(__dirname, '../.well-known')
if (!fs.existsSync(sourceWellKnownDir)) {
  fs.mkdirSync(sourceWellKnownDir, { recursive: true })
}

// Write to the source path for consistency
try {
  fs.writeFileSync(sourceDidPath, JSON.stringify(didDocument, null, 2))
  console.log(
    `Successfully wrote DID document to source path: ${sourceDidPath}`,
  )
} catch (error) {
  console.error(`Error writing DID document to source path: ${error.message}`)
}

// Write to target paths if they exist
if (fs.existsSync(publicWellKnownDir)) {
  try {
    fs.writeFileSync(targetDidPath, JSON.stringify(didDocument, null, 2))
    console.log(`Successfully wrote DID document to: ${targetDidPath}`)
  } catch (error) {
    console.error(
      `Error writing DID document to ${targetDidPath}: ${error.message}`,
    )
  }
}

if (fs.existsSync(altPublicWellKnownDir)) {
  try {
    fs.writeFileSync(altTargetDidPath, JSON.stringify(didDocument, null, 2))
    console.log(`Successfully wrote DID document to: ${altTargetDidPath}`)
  } catch (error) {
    console.error(
      `Error writing DID document to ${altTargetDidPath}: ${error.message}`,
    )
  }
}

// Also write directly to the public directory
const publicDidDir = path.join(__dirname, '../public/.well-known')
const publicDidPath = path.join(publicDidDir, 'did.json')
try {
  // Ensure the directory exists
  if (!fs.existsSync(publicDidDir)) {
    fs.mkdirSync(publicDidDir, { recursive: true })
  }

  fs.writeFileSync(publicDidPath, JSON.stringify(didDocument, null, 2))
  console.log(
    `Successfully wrote DID document to public path: ${publicDidPath}`,
  )
} catch (error) {
  console.error(`Error writing DID document to public path: ${error.message}`)
}

console.log('\nDID document deployment completed.')
console.log('Final DID document:')
console.log(JSON.stringify(didDocument, null, 2))
console.log('\nNext steps:')
console.log('1. Restart your feed generator service')
console.log(
  `2. Verify that the DID document is accessible at https://${hostname}/.well-known/did.json`,
)
