import { AtpAgent } from '@atproto/api'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env file
dotenv.config({ path: '.env' })

const run = async () => {
  // Try to load the did:web information
  let didWebInfo: any
  try {
    const didWebInfoPath = path.join(__dirname, '..', 'did-web-info.json')
    if (!fs.existsSync(didWebInfoPath)) {
      console.error('Error: did-web-info.json file not found')
      console.error('Please run create-did-web.js first to create a did:web')
      process.exit(1)
    }

    didWebInfo = JSON.parse(fs.readFileSync(didWebInfoPath, 'utf8'))
    console.log(`Loaded did:web information from ${didWebInfoPath}`)
  } catch (error) {
    console.error('Error loading did:web information:', error)
    process.exit(1)
  }

  // Get the did:web values
  const publisherDid = didWebInfo.did
  const serviceDid = didWebInfo.did

  console.log(`Using publisher DID: ${publisherDid}`)
  console.log(`Using service DID: ${serviceDid}`)

  // Check for Bluesky credentials
  if (!process.env.BLUESKY_USERNAME || !process.env.BLUESKY_PASSWORD) {
    console.error(
      'Error: BLUESKY_USERNAME and BLUESKY_PASSWORD must be set in .env file',
    )
    process.exit(1)
  }

  const username = process.env.BLUESKY_USERNAME
  const password = process.env.BLUESKY_PASSWORD

  // Create ATP agent and login
  console.log(`Logging in to Bluesky as ${username}...`)
  const agent = new AtpAgent({ service: 'https://bsky.social' })
  try {
    await agent.login({ identifier: username, password: password })
    console.log('Logged in successfully')
  } catch (error) {
    console.error('Login failed:', error)
    process.exit(1)
  }

  // Publish the Swarm community feed generator
  try {
    console.log('Publishing Swarm community feed generator...')

    // Define the record
    const record = {
      did: serviceDid,
      displayName: 'Swarm Community',
      description: 'A feed of posts from the Swarm community members',
      avatar: undefined, // Add avatar image URI if available
      createdAt: new Date().toISOString(),
    }

    // Check which DID to use for the repo
    console.log('Creating the feed generator record...')
    console.log(`Record will be created in repo: ${agent.session?.did}`)
    console.log(`Feed generator service DID: ${serviceDid}`)

    // Create the record
    const res = await agent.api.com.atproto.repo.putRecord({
      repo: agent.session?.did || '',
      collection: 'app.bsky.feed.generator',
      rkey: 'swarm-community',
      record,
    })

    console.log('\nFeed generator published successfully! 🎉')
    console.log(
      `Feed URI: at://${agent.session?.did}/app.bsky.feed.generator/swarm-community`,
    )
    console.log(`Record CID: ${res.data.cid}`)

    // Save the updated feed URI to the DID info file
    didWebInfo.algorithmUri = `at://${agent.session?.did}/app.bsky.feed.generator/swarm-community`
    fs.writeFileSync(
      path.join(__dirname, '..', 'did-web-info.json'),
      JSON.stringify(didWebInfo, null, 2),
    )

    console.log('\nNext steps:')
    console.log(
      '1. Make sure the .well-known/did.json file is accessible at your domain',
    )
    console.log('2. Test that the feed generator works with the did:web')
  } catch (error) {
    console.error('Error publishing feed generator:', error)
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
