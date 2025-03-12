import { AtpAgent } from '@atproto/api'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config({ path: '.env' })

const run = async () => {
  // Ensure required environment variables are set
  const requiredEnvVars = [
    'FEEDGEN_PUBLISHER_DID',
    'FEEDGEN_SERVICE_DID',
  ]
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`)
      process.exit(1)
    }
  }

  // Get credentials from environment or prompt
  const publisherDid = process.env.FEEDGEN_PUBLISHER_DID!
  const serviceDid = process.env.FEEDGEN_SERVICE_DID!
  
  // Prompt for Bluesky credentials
  if (!process.env.BLUESKY_USERNAME || !process.env.BLUESKY_PASSWORD) {
    console.log('Please provide your Bluesky credentials:')
    console.log('Username: (set as BLUESKY_USERNAME in .env)')
    console.log('Password: (set as BLUESKY_PASSWORD in .env)')
    process.exit(1)
  }
  
  const username = process.env.BLUESKY_USERNAME
  const password = process.env.BLUESKY_PASSWORD

  // Create ATP agent and login
  console.log('Logging in to Bluesky...')
  const agent = new AtpAgent({ service: 'https://bsky.social' })
  await agent.login({ identifier: username, password: password })
  console.log('Logged in successfully')

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

    // Create the record
    const res = await agent.api.com.atproto.repo.putRecord({
      repo: publisherDid,
      collection: 'app.bsky.feed.generator',
      rkey: 'swarm-community',
      record,
    })

    console.log('Feed generator published successfully!')
    console.log(`Feed URI: at://${publisherDid}/app.bsky.feed.generator/swarm-community`)
    console.log(`Record CID: ${res.data.cid}`)
  } catch (error) {
    console.error('Error publishing feed generator:', error)
    process.exit(1)
  }
}

run() 