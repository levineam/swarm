/**
 * Create Feed Generator DID:WEB
 *
 * This script creates a did:web identifier for the feed generator
 * and generates the necessary files to serve the DID document.
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Secp256k1Keypair } = require('@atproto/crypto')

async function createDidWeb() {
  try {
    console.log('Creating a new did:web for the feed generator...')

    // Generate a new key pair for the DID
    console.log('Generating key pairs...')
    const signingKey = await Secp256k1Keypair.create()

    // Store the keys securely
    const keysDir = path.join(__dirname, 'keys')
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir)
    }

    const signingKeyPath = path.join(keysDir, 'signing-key.json')

    fs.writeFileSync(
      signingKeyPath,
      JSON.stringify(
        {
          privateKey: signingKey.privateKeyStr,
          publicKey: signingKey.publicKeyStr,
          did: signingKey.did(),
        },
        null,
        2,
      ),
    )

    console.log(`Keys saved to ${keysDir}`)
    console.log('IMPORTANT: Keep these keys secure and back them up safely.')

    // Get the domain from the environment or use the default
    const domain = process.env.FEEDGEN_HOSTNAME || 'swarm-social.onrender.com'

    // Create the did:web identifier
    const did = `did:web:${domain}`
    console.log(`DID created: ${did}`)

    // Service endpoint from the .env file or default
    const serviceEndpoint = `https://${domain}`

    // Create the DID document
    const didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/secp256k1-2019/v1',
      ],
      id: did,
      verificationMethod: [
        {
          id: `${did}#atproto`,
          type: 'EcdsaSecp256k1VerificationKey2019',
          controller: did,
          publicKeyMultibase: signingKey.did().split(':')[2],
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
          serviceEndpoint: serviceEndpoint,
        },
      ],
    }

    // Create the .well-known directory if it doesn't exist
    const wellKnownDir = path.join(__dirname, '.well-known')
    if (!fs.existsSync(wellKnownDir)) {
      fs.mkdirSync(wellKnownDir)
    }

    // Write the DID document to the .well-known directory
    const didDocumentPath = path.join(wellKnownDir, 'did.json')
    fs.writeFileSync(didDocumentPath, JSON.stringify(didDocument, null, 2))

    // Save the DID information to a file
    const didInfo = {
      did,
      domain,
      signingKeyPath,
      createdAt: new Date().toISOString(),
      serviceEndpoint,
      didDocument,
      note: 'This is the did:web for your Swarm feed generator.',
      instructions: [
        'Ensure the .well-known/did.json file is accessible at https://' +
          domain +
          '/.well-known/did.json',
        'Update the FEEDGEN_PUBLISHER_DID and FEEDGEN_SERVICE_DID in your .env file',
        'Run the publishSwarmFeedWithDidWeb.ts script to publish the feed generator record',
      ],
    }

    const didInfoPath = path.join(__dirname, 'did-web-info.json')
    fs.writeFileSync(didInfoPath, JSON.stringify(didInfo, null, 2))

    console.log(`\nNew did:web created: ${did}`)
    console.log(`DID document saved to ${didDocumentPath}`)
    console.log(`DID information saved to ${didInfoPath}`)

    console.log('\nNext steps:')
    console.log(
      `1. Ensure the .well-known/did.json file is accessible at https://${domain}/.well-known/did.json`,
    )
    console.log('2. Update the following values in your .env file:')
    console.log(`   - FEEDGEN_PUBLISHER_DID=${did}`)
    console.log(`   - FEEDGEN_SERVICE_DID=${did}`)
    console.log(
      '3. Run the publishSwarmFeedWithDidWeb.ts script to publish the feed generator record',
    )

    return did
  } catch (error) {
    console.error('Error creating did:web:', error)
    throw error
  }
}

// Execute the function
createDidWeb()
  .then((did) => {
    console.log(`\nProcess completed successfully. Your new did:web is: ${did}`)
  })
  .catch((error) => {
    console.error('Process failed:', error)
    process.exit(1)
  })
