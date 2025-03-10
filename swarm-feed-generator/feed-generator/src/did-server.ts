import dotenv from 'dotenv'
import express from 'express'
import fs from 'fs'
import path from 'path'

// Load environment variables
dotenv.config()

/**
 * Creates and starts a standalone Express server for serving the DID document
 */
export function startDidServer() {
  const hostname = process.env.FEEDGEN_HOSTNAME || 'swarm-social.onrender.com'
  const port = Number(process.env.PORT || 3000)
  const listenhost = process.env.FEEDGEN_LISTENHOST || '0.0.0.0'
  const serviceDid = process.env.FEEDGEN_SERVICE_DID || `did:web:${hostname}`

  // Create a standalone Express app for serving the DID document
  const app = express()

  // Add request logging middleware
  app.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url)
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

  // Direct routes for serving the DID document
  app.get('/.well-known/did.json', (req, res) => {
    console.log('Serving DID document from /.well-known/did.json route')

    // Set Cache-Control header to prevent caching by CDN
    res.set('Cache-Control', 'no-store')
    res.set('Content-Type', 'application/json')

    // Try to read from various possible locations
    const possiblePaths = [
      path.join(__dirname, '../public/.well-known/did.json'),
      path.join(__dirname, '../.well-known/did.json'),
      path.join(__dirname, '../public/did.json'),
      path.join(__dirname, '../did.json'),
    ]

    // Log all paths we're checking
    console.log('Checking the following paths for DID document:')
    possiblePaths.forEach((p) => console.log(` - ${p}`))

    // Try each path
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`Found DID document at ${filePath}`)
        try {
          const didDocument = JSON.parse(fs.readFileSync(filePath, 'utf8'))
          return res.json(didDocument)
        } catch (error) {
          console.error(`Error reading DID document from ${filePath}:`, error)
          // Continue to next file if there's an error
        }
      }
    }

    // If no file found, generate a basic DID document
    console.log('No DID document found, generating one dynamically')
    return res.json(createDidDocument())
  })

  // Also serve the DID document at /did.json for redundancy
  app.get('/did.json', (req, res) => {
    console.log('Serving DID document from /did.json route')
    // Set Cache-Control header to prevent caching by CDN
    res.set('Cache-Control', 'no-store')
    res.set('Content-Type', 'application/json')

    // Return the DID document directly instead of redirecting
    return res.json(createDidDocument())
  })

  // Add a debug endpoint to help diagnose issues
  app.get('/debug', (req, res) => {
    console.log('Serving debug information')

    // Set Cache-Control header to prevent caching by CDN
    res.set('Cache-Control', 'no-store')

    const debug = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        FEEDGEN_HOSTNAME: process.env.FEEDGEN_HOSTNAME,
        FEEDGEN_LISTENHOST: process.env.FEEDGEN_LISTENHOST,
        FEEDGEN_PUBLISHER_DID: process.env.FEEDGEN_PUBLISHER_DID,
        FEEDGEN_SERVICE_DID: process.env.FEEDGEN_SERVICE_DID,
      },
      paths: {
        currentDir: __dirname,
        publicDir: path.join(__dirname, '../public'),
        wellKnownDir: path.join(__dirname, '../public/.well-known'),
      },
      files: {
        publicDirExists: fs.existsSync(path.join(__dirname, '../public')),
        wellKnownDirExists: fs.existsSync(
          path.join(__dirname, '../public/.well-known'),
        ),
        didJsonExists: fs.existsSync(
          path.join(__dirname, '../public/.well-known/did.json'),
        ),
        alternateDidJsonExists: fs.existsSync(
          path.join(__dirname, '../public/did.json'),
        ),
      },
      didDocument: createDidDocument(),
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
