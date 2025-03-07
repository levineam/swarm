/**
 * Script to create an algorithm record for the Swarm Community feed generator
 *
 * Usage:
 * node create-algorithm-record.js
 */

const {BskyAgent} = require('@atproto/api')
const fs = require('fs')
const path = require('path')

async function createAlgorithmRecord() {
  try {
    console.log(
      'Creating algorithm record for the Swarm Community feed generator...',
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

    // Define the algorithm record
    const record = {
      did: didInfo.did,
      displayName: 'Swarm Community',
      description: 'A feed of posts from Swarm community members',
      createdAt: new Date().toISOString(),
    }

    console.log('Creating algorithm record with the following details:')
    console.log(JSON.stringify(record, null, 2))

    // Create the algorithm record
    try {
      // The correct way to create a record using the Bluesky API
      const response = await agent.api.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: 'app.bsky.feed.generator',
        rkey: 'swarm-community',
        record: record,
      })

      console.log('Algorithm record created successfully!')
      console.log('Response:', response)

      // Get the URI of the created record
      const recordUri = response.data.uri
      console.log(`Record URI: ${recordUri}`)

      // Update the local DID info with the record URI
      didInfo.algorithmUri = recordUri
      didInfo.updatedAt = new Date().toISOString()

      fs.writeFileSync(didInfoPath, JSON.stringify(didInfo, null, 2))
      console.log('Local DID info updated with algorithm record URI.')

      return recordUri
    } catch (error) {
      console.error('Error creating algorithm record:', error.message)

      if (error.message.includes('already exists')) {
        console.log(
          '\nIt appears the algorithm record already exists. This is not an error.',
        )
        const recordUri = `at://${agent.session.did}/app.bsky.feed.generator/swarm-community`
        console.log(`You can use the existing record URI: ${recordUri}`)

        // Update the local DID info with the record URI
        didInfo.algorithmUri = recordUri
        didInfo.updatedAt = new Date().toISOString()

        fs.writeFileSync(didInfoPath, JSON.stringify(didInfo, null, 2))
        console.log('Local DID info updated with algorithm record URI.')

        return recordUri
      }

      process.exit(1)
    }
  } catch (error) {
    console.error('Error in create algorithm record process:', error)
    throw error
  }
}

// Execute the function
createAlgorithmRecord()
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
