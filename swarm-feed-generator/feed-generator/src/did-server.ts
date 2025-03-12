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
  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
      next()
    },
  )

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
          id: '#atproto_feed_generator',
          type: 'AtprotoFeedGenerator',
          serviceEndpoint: `https://${hostname}`,
        },
      ],
    }
  }

  // Serve the DID document at /.well-known/did.json
  app.get(
    '/.well-known/did.json',
    (req: express.Request, res: express.Response) => {
      console.log('Serving DID document from /.well-known/did.json')

      // Set Cache-Control header to prevent caching by CDN
      res.set('Cache-Control', 'no-store')

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
    },
  )

  // Also serve the DID document at /did.json for convenience
  app.get('/did.json', (req: express.Request, res: express.Response) => {
    console.log('Serving DID document from /did.json')

    // Set Cache-Control header to prevent caching by CDN
    res.set('Cache-Control', 'no-store')

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
  app.get('/debug', (req: express.Request, res: express.Response) => {
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
  app.get('/health', (req: express.Request, res: express.Response) => {
    console.log('Health check request received')
    return res.status(200).send('OK')
  })

  // Add a catch-all route for debugging
  app.use('*', (req: express.Request, res: express.Response) => {
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
