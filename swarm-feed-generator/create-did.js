const {BskyAgent} = require('@atproto/api')
const fs = require('fs')
const path = require('path')

async function createDidPlc() {
  try {
    console.log('Creating a new DID using the AT Protocol...')

    // Create a new Bluesky agent
    const agent = new BskyAgent({
      service: 'https://bsky.social',
    })

    // Login with the provided credentials
    const handle = process.argv[2] || 'andrarchy.bsky.social'
    const password = process.argv[3] || 'v2k2BY0nth$B9'

    if (!handle || !password) {
      console.error('Error: Handle and password are required.')
      console.log('Usage: node create-did.js <handle> <password>')
      process.exit(1)
    }

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

    // Get the DID from the session
    const did = agent.session.did
    console.log(`\nYour DID is: ${did}`)

    // Save the DID information to a file
    const didInfo = {
      did: did,
      handle: handle,
      createdAt: new Date().toISOString(),
      note: 'This is the DID for your Swarm feed generator.',
      instructions: [
        'Use this DID in your feed generator configuration',
        'Update the FEEDGEN_PUBLISHER_DID in your .env file',
        'Use this DID when creating the algorithm record',
      ],
    }

    fs.writeFileSync(
      path.join(__dirname, 'did-info.json'),
      JSON.stringify(didInfo, null, 2),
    )

    console.log('\nDID information saved to did-info.json')
    console.log('\nNext steps:')
    console.log(
      '1. Update the FEEDGEN_PUBLISHER_DID in your .env file with this DID',
    )
    console.log('2. Use this DID when creating the algorithm record')

    return did
  } catch (error) {
    console.error('Error in DID creation process:', error)
    throw error
  }
}

// Execute the function
createDidPlc()
  .then(did => {
    console.log('\nProcess completed successfully.')
    console.log(`Your feed generator DID is: ${did}`)
  })
  .catch(error => {
    console.error('Process failed:', error)
    process.exit(1)
  })
