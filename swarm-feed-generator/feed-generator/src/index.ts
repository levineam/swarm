import dotenv from 'dotenv'

import { FeedGenerator } from './server'
import { logger } from './util/logger'

// load .env before doing anything else
dotenv.config()

const run = async () => {
  logger.info('Starting Feed Generator...')

  // Log environment variables
  logger.info('Environment Variables', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FEEDGEN_HOSTNAME: process.env.FEEDGEN_HOSTNAME,
    FEEDGEN_PUBLISHER_DID: process.env.FEEDGEN_PUBLISHER_DID,
    FEEDGEN_SERVICE_DID: process.env.FEEDGEN_SERVICE_DID,
    DATABASE_URL: process.env.DATABASE_URL
      ? 'Set (PostgreSQL or SQLite)'
      : 'Not set (using default SQLite)',
  })

  // Create the feed generator
  const feedGenerator = FeedGenerator.create({
    port: Number(process.env.PORT || 3000),
    listenhost: process.env.FEEDGEN_LISTENHOST || '0.0.0.0',
    hostname: process.env.FEEDGEN_HOSTNAME || 'localhost',
    sqliteLocation: 'sqlite:swarm-feed.db', // Default SQLite location
    databaseUrl: process.env.DATABASE_URL, // PostgreSQL connection string (if provided)
    publisherDid: process.env.FEEDGEN_PUBLISHER_DID || '',
    serviceDid:
      process.env.FEEDGEN_SERVICE_DID ||
      `did:web:${process.env.FEEDGEN_HOSTNAME || 'localhost'}`,
    subscriptionEndpoint:
      process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT || 'wss://bsky.network',
    subscriptionReconnectDelay: 3000,
  })

  try {
    await feedGenerator.start()
    logger.info('Feed generator started successfully', {
      url: `http://${process.env.FEEDGEN_LISTENHOST || '0.0.0.0'}:${
        process.env.PORT || 3000
      }`,
    })
  } catch (err) {
    logger.error('Failed to start feed generator', { error: err instanceof Error ? err.message : String(err) })
    process.exit(1)
  }
}

// Run the server
run().catch((err) => {
  logger.error('Unexpected error during startup', { error: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})
