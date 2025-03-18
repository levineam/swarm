import { AtUri } from '@atproto/syntax'

import algos from '../algos'
import { AppContext } from '../config'
import { Server } from '../lexicon'
import { logger } from '../util/logger'

// Helper function for logging
function log(message: string) {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp} - ${message}`)
}

export default function describeGenerator(server: Server, ctx: AppContext) {
  // Add detailed logging to help debug the XRPC endpoint registration
  logger.info('=== REGISTERING describeFeedGenerator ENDPOINT ===')

  // Log server object properties
  logger.info('Server object keys: ' + Object.keys(server).join(', '))
  if (server.app) {
    logger.info('Server.app object keys: ' + Object.keys(server.app).join(', '))
    if (server.app.bsky) {
      logger.info('Server.app.bsky object keys: ' + Object.keys(server.app.bsky).join(', '))
      if (server.app.bsky.feed) {
        logger.info('Server.app.bsky.feed object keys: ' + Object.keys(server.app.bsky.feed).join(', '))
        if (typeof server.app.bsky.feed.describeFeedGenerator === 'function') {
          logger.info('describeFeedGenerator endpoint exists on server.app.bsky.feed')
        } else {
          logger.error('ERROR: describeFeedGenerator endpoint does NOT exist on server.app.bsky.feed')
        }
      } else {
        logger.error('ERROR: server.app.bsky.feed is undefined')
      }
    } else {
      logger.error('ERROR: server.app.bsky is undefined')
    }
  } else {
    logger.error('ERROR: server.app is undefined')
  }

  try {
    if (!server.app?.bsky?.feed?.describeFeedGenerator) {
      logger.error('ERROR: Cannot register describeFeedGenerator endpoint because it does not exist on server.app.bsky.feed')
      return
    }

    server.app.bsky.feed.describeFeedGenerator(async () => {
      logger.info('describeFeedGenerator endpoint called')
      logger.info('Available algorithms', { algorithms: Object.keys(algos) })
      logger.info('Publisher DID', { publisherDid: ctx.cfg.publisherDid })
      logger.info('Service DID', { serviceDid: ctx.cfg.serviceDid })

      // IMPORTANT: Use the PUBLISHER DID for feed URIs as per AT Protocol specifications
      // This ensures that the DID used in the response matches the account DID that owns the feed
      const accountDid = ctx.cfg.publisherDid

      const feeds = Object.keys(algos).map((shortname) => ({
        uri: AtUri.make(
          accountDid,
          'app.bsky.feed.generator',
          shortname,
        ).toString(),
      }))

      logger.info('Returning feeds', { feeds })

      // Add cache-busting header to force revalidation
      // Note: Headers are set in the actual Express response handling,
      // but this is a reminder that we need to add them in the server.ts file

      return {
        encoding: 'application/json',
        body: {
          did: accountDid, // Use account DID as per AT Protocol specs
          feeds,
        },
      }
    })
    logger.info('Successfully registered describeFeedGenerator endpoint')
  } catch (error) {
    logger.error('Error registering describeFeedGenerator endpoint', { error })
    throw error
  }
}
