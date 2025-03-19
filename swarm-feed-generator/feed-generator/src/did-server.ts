// @ts-nocheck
import express from 'express'
import fs from 'fs'
import path from 'path'

// Load environment variables
const dotenv = require('dotenv')
dotenv.config()

/**
 * Creates and starts a standalone Express server for serving the DID document
 */
export function startDidServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
  const listenhost = process.env.FEEDGEN_LISTENHOST || '0.0.0.0'
  const hostname =
    process.env.FEEDGEN_HOSTNAME || 'swarm-feed-generator.onrender.com'
  const serviceDid = process.env.FEEDGEN_SERVICE_DID || `did:web:${hostname}`

  // Create a standalone Express app for serving the DID document
  const app = express()

  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
    next()
  })

  // Add Cache-Control headers to all responses
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    next()
  })

  // Serve static files from the public directory with dotfiles allowed
  app.use(
    express.static(path.join(__dirname, '../public'), { dotfiles: 'allow' }),
  )

  // Create the DID document content
  const createDidDocument = () => {
    return {
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
          publicKeyMultibase:
            'zQ3shojKAGY2sK3ThMHW7soP4tYDWLCRjJt9w14XKxkKZnnnK',
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
  }

  // Serve the DID document at /.well-known/did.json
  app.get('/.well-known/did.json', (req, res) => {
    console.log('Serving DID document from /.well-known/did.json')

    // Check if the DID document exists in the well-known directory
    const didJsonPath = path.join(
      path.join(__dirname, '../public/.well-known'),
      'did.json',
    )
    if (fs.existsSync(didJsonPath)) {
      console.log(`Serving DID document from ${didJsonPath}`)
      return res.sendFile(didJsonPath)
    }

    // If not found, generate a basic DID document
    console.log(
      'DID document not found in well-known directory, generating a basic one',
    )
    const didDocument = createDidDocument()
    return res.json(didDocument)
  })

  // Also serve the DID document at /did.json for convenience
  app.get('/did.json', (req, res) => {
    console.log('Serving DID document from /did.json')

    // Check if the DID document exists in the public directory
    const didJsonPath = path.join(path.join(__dirname, '../public'), 'did.json')
    if (fs.existsSync(didJsonPath)) {
      console.log(`Serving DID document from ${didJsonPath}`)
      return res.sendFile(didJsonPath)
    }

    // If not found, generate a basic DID document
    console.log(
      'DID document not found in public directory, generating a basic one',
    )
    const didDocument = createDidDocument()
    return res.json(didDocument)
  })

  // Add a debug endpoint
  app.get('/debug', (req, res) => {
    console.log('Debug request received')
    const debug = {
      serviceDid: process.env.FEEDGEN_SERVICE_DID || 'not set',
      hostname: process.env.FEEDGEN_HOSTNAME || 'not set',
      publicDir: path.join(__dirname, '../public'),
      wellKnownDir: path.join(__dirname, '../public/.well-known'),
      didJsonExists: fs.existsSync(
        path.join(path.join(__dirname, '../public/.well-known'), 'did.json'),
      ),
      publicDirExists: fs.existsSync(path.join(__dirname, '../public')),
      wellKnownDirExists: fs.existsSync(
        path.join(__dirname, '../public/.well-known'),
      ),
      env: process.env,
    }
    return res.json(debug)
  })

  // Add a health check endpoint
  app.get('/health', (req, res) => {
    console.log('Health check request received')
    return res.status(200).send('OK')
  })

  // Add a catch-all route for debugging
  app.use('*', (req, res) => {
    console.log(`Received request for unknown route: ${req.originalUrl}`)
    res.status(404).send({
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`,
      availableRoutes: [
        '/.well-known/did.json',
        '/did.json',
        '/debug',
        '/health',
      ],
    })
  })

  // Start the Express server
  const server = app.listen(port, listenhost, () => {
    console.log(`DID document server listening on ${listenhost}:${port}`)
    console.log(`DID document available at:`)
    console.log(`- https://${hostname}/.well-known/did.json`)
    console.log(`- https://${hostname}/did.json`)
    console.log(`- Debug info available at: https://${hostname}/debug`)
    console.log(`- Health check available at: https://${hostname}/health`)
  })

  return server
}
