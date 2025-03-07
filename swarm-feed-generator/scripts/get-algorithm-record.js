/**
 * Script to get the existing algorithm record for the Swarm Community feed generator
 *
 * Usage:
 * node get-algorithm-record.js
 */

const {BskyAgent} = require('@atproto/api')
const fs = require('fs')
const path = require('path')

async function getAlgorithmRecord() {
  try {
    console.log(
      'Getting algorithm record for the Swarm Community feed generator...',
    )

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

    // Construct the record URI
    const recordUri = `at://${agent.session.did}/app.bsky.feed.generator/swarm-community`
    console.log(`Looking for record: ${recordUri}`)

    try {
      // Get the record
      const response = await agent.api.com.atproto.repo.getRecord({
        repo: agent.session.did,
        collection: 'app.bsky.feed.generator',
        rkey: 'swarm-community',
      })

      console.log('Algorithm record found:')
      console.log(JSON.stringify(response.data, null, 2))

      // Update the local DID info with the record URI
      didInfo.algorithmUri = recordUri
      didInfo.updatedAt = new Date().toISOString()

      fs.writeFileSync(didInfoPath, JSON.stringify(didInfo, null, 2))
      console.log('Local DID info updated with algorithm record URI.')

      return recordUri
    } catch (error) {
      console.error('Error getting algorithm record:', error.message)

      if (error.status === 404) {
        console.log(
          '\nThe algorithm record does not exist yet. You need to create it first.',
        )
        console.log('Run the create-algorithm-record.js script to create it.')
      }

      process.exit(1)
    }
  } catch (error) {
    console.error('Error in get algorithm record process:', error)
    throw error
  }
}

// Execute the function
getAlgorithmRecord()
  .then(uri => {
    console.log('\nProcess completed successfully.')
    console.log(`Your feed generator algorithm URI is: ${uri}`)
    console.log('\nNext steps:')
    console.log(
      '1. Update your client application to use this URI for the Swarm Community feed',
    )
    console.log('2. Test the feed in your client application')
  })
  .catch(error => {
    console.error('Process failed:', error)
    process.exit(1)
  })
