import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

import FeedGenerator from './server'

const run = async () => {
  // Load environment variables
  dotenv.config()

  console.log('Starting Feed Generator...')
  console.log('Environment Variables:')
  console.log('- NODE_ENV:', process.env.NODE_ENV)
  console.log('- PORT:', process.env.PORT)
  console.log('- FEEDGEN_HOSTNAME:', process.env.FEEDGEN_HOSTNAME)
  console.log('- FEEDGEN_PUBLISHER_DID:', process.env.FEEDGEN_PUBLISHER_DID)
  console.log('- FEEDGEN_SERVICE_DID:', process.env.FEEDGEN_SERVICE_DID)

  // Ensure we have the correct hostname
  const hostname =
    maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'swarm-social.onrender.com'

  // Ensure we have the correct service DID
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`

  // Ensure we have the correct publisher DID
  const publisherDid =
    maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ??
    'did:plc:ouadmsyvsfcpkxg3yyz4trqi'

  // Check if the DID document exists
  const wellKnownDir = path.join(__dirname, '../public/.well-known')
  const didDocumentPath = path.join(wellKnownDir, 'did.json')

  if (!fs.existsSync(wellKnownDir)) {
    console.log(`Creating .well-known directory: ${wellKnownDir}`)
    fs.mkdirSync(wellKnownDir, { recursive: true })
  }

  if (!fs.existsSync(didDocumentPath)) {
    console.log(`DID document not found at ${didDocumentPath}, creating it...`)

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

    try {
      fs.writeFileSync(didDocumentPath, JSON.stringify(didDocument, null, 2))
      console.log(`Created DID document at ${didDocumentPath}`)
    } catch (error) {
      console.error(`Error creating DID document: ${error}`)
    }
  } else {
    console.log(`Found existing DID document at ${didDocumentPath}`)

    // Ensure the DID document has the correct values
    try {
      const didDocument = JSON.parse(fs.readFileSync(didDocumentPath, 'utf8'))

      // Update the DID document if needed
      let updated = false

      if (didDocument.id !== serviceDid) {
        console.log(
          `Updating DID document id from ${didDocument.id} to ${serviceDid}`,
        )
        didDocument.id = serviceDid
        updated = true
      }

      // Update service endpoints if needed
      if (didDocument.service) {
        didDocument.service = didDocument.service.map((service) => {
          if (
            service.type === 'AtprotoFeedGenerator' &&
            service.serviceEndpoint !== `https://${hostname}`
          ) {
            console.log(
              `Updating feed generator service endpoint to https://${hostname}`,
            )
            updated = true
            return {
              ...service,
              serviceEndpoint: `https://${hostname}`,
            }
          }
          return service
        })
      }

      if (updated) {
        fs.writeFileSync(didDocumentPath, JSON.stringify(didDocument, null, 2))
        console.log(`Updated DID document at ${didDocumentPath}`)
      }
    } catch (error) {
      console.error(`Error updating DID document: ${error}`)
    }
  }

  // Create the server
  const server = FeedGenerator.create({
    port: maybeInt(process.env.PORT) ?? 3000,
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? '0.0.0.0',
    sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:',
    subscriptionEndpoint:
      maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      'wss://bsky.network',
    publisherDid,
    subscriptionReconnectDelay:
      maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    hostname,
    serviceDid,
  })

  await server.start()
  console.log(
    `🤖 Feed generator running at http://${server.cfg.listenhost}:${server.cfg.port}`,
  )
}

const maybeStr = (val?: string) => {
  if (!val) return undefined
  return val
}

const maybeInt = (val?: string) => {
  if (!val) return undefined
  const int = parseInt(val, 10)
  if (isNaN(int)) return undefined
  return int
}

run().catch((err) => {
  console.error('Failed to start feed generator:', err)
  process.exit(1)
})
