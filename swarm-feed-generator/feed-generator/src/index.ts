import dotenv from 'dotenv'
import { FeedGenerator } from './server'

// load .env before doing anything else
dotenv.config()

const run = async () => {
  console.log('Starting Feed Generator...')
  console.log('Environment Variables:')
  console.log('- NODE_ENV:', process.env.NODE_ENV)
  console.log('- PORT:', process.env.PORT)
  console.log('- FEEDGEN_HOSTNAME:', process.env.FEEDGEN_HOSTNAME)
  console.log('- FEEDGEN_PUBLISHER_DID:', process.env.FEEDGEN_PUBLISHER_DID)
  console.log('- FEEDGEN_SERVICE_DID:', process.env.FEEDGEN_SERVICE_DID)

  // Create the feed generator
  const feedGenerator = FeedGenerator.create({
    port: Number(process.env.PORT || 3000),
    listenhost: process.env.FEEDGEN_LISTENHOST || '0.0.0.0',
    hostname: process.env.FEEDGEN_HOSTNAME || 'localhost',
    sqliteLocation: process.env.DATABASE_URL || 'sqlite:swarm-feed.db',
    publisherDid: process.env.FEEDGEN_PUBLISHER_DID || '',
    serviceDid:
      process.env.FEEDGEN_SERVICE_DID ||
      `did:web:${process.env.FEEDGEN_HOSTNAME || 'localhost'}`,
    subscriptionEndpoint:
      process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT || 'wss://bsky.network',
    subscriptionReconnectDelay: 3000,
  })

  await feedGenerator.start()
  console.log(
    `🚀 Feed generator running at http://${
      process.env.FEEDGEN_LISTENHOST || '0.0.0.0'
    }:${process.env.PORT || 3000}`,
  )
}

// Run the server
run().catch((err) => {
  console.error('Failed to start feed generator:', err)
})
