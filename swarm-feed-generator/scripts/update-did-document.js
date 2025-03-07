/**
 * Script to update the DID document with a service endpoint for the feed generator
 *
 * Usage:
 * node update-did-document.js <service-url>
 *
 * Example:
 * node update-did-document.js https://swarm-social.onrender.com
 */

const {BskyAgent} = require('@atproto/api')
const fs = require('fs')
const path = require('path')

async function updateDidDocument(serviceUrl) {
  try {
    if (!serviceUrl) {
      console.error('Error: Service URL is required')
      console.log('Usage: node update-did-document.js <service-url>')
      process.exit(1)
    }

    console.log(`Updating DID document to point to service URL: ${serviceUrl}`)

    // Read DID info from file
    const didInfoPath = path.join(__dirname, '..', 'did-info.json')
    if (!fs.existsSync(didInfoPath)) {
      console.error(`Error: DID info file not found at ${didInfoPath}`)
      process.exit(1)
    }

    const didInfo = JSON.parse(fs.readFileSync(didInfoPath, 'utf8'))
    console.log(`Using DID: ${didInfo.did}`)

    // Create a new Bluesky agent
    const agent = new BskyAgent({
      service: 'https://bsky.social',
    })

    // Login with the provided credentials
    const handle = process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social'
    const password = process.env.BLUESKY_PASSWORD || 'v2k2BY0nth$B9'

    console.log(`Logging in with handle: ${handle}...`)

    try {
      await agent.login({
        identifier: handle,
        password: password,
      })

      console.log('Login successful!')
    } catch (loginError) {
      console.error('Login failed:', loginError.message)
      process.exit(1)
    }

    // Update the DID document with the service endpoint
    console.log('Updating DID document with service endpoint...')

    try {
      // This is a simplified example - in a real implementation, you would use
      // the @did-plc/lib library to create and submit a proper operation
      console.log(`
IMPORTANT: To properly update your DID document, you need to:

1. Visit https://web.plc.directory/${didInfo.did}
2. Click "Add Service"
3. Enter the following information:
   - Service ID: atproto_feedgen
   - Type: AtprotoFeedGenerator
   - Endpoint: ${serviceUrl}

This will update your DID document to point to your feed generator service.
`)

      // For now, we'll update our local record
      didInfo.serviceEndpoint = serviceUrl
      didInfo.updatedAt = new Date().toISOString()

      fs.writeFileSync(didInfoPath, JSON.stringify(didInfo, null, 2))
      console.log(
        'Local DID info updated. Follow the instructions above to update the actual DID document.',
      )

      return serviceUrl
    } catch (error) {
      console.error('Error updating DID document:', error.message)
      process.exit(1)
    }
  } catch (error) {
    console.error('Error in update process:', error)
    throw error
  }
}

// Execute the function with the service URL from command line arguments
const serviceUrl = process.argv[2]
updateDidDocument(serviceUrl)
  .then(url => {
    console.log('\nProcess completed successfully.')
    console.log(`Your feed generator service URL is: ${url}`)
  })
  .catch(error => {
    console.error('Process failed:', error)
    process.exit(1)
  })
