import { AtUri } from '@atproto/syntax'
import { InvalidRequestError } from '@atproto/xrpc-server'

import algos from '../algos'
import { AppContext } from '../config'
import { Server } from '../lexicon'
import logger from '../util/logger'

// Helper function for logging
function log(message: string) {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp} - ${message}`)
}

export default function feedGeneration(server: Server, ctx: AppContext) {
  // Add detailed logging to help debug the XRPC endpoint registration
  logger.info('=== REGISTERING getFeedSkeleton ENDPOINT ===')

  // Log server object properties
  log('Server object keys: ' + Object.keys(server).join(', '))
  if (server.app) {
    log('Server.app object keys: ' + Object.keys(server.app).join(', '))
    if (server.app.bsky) {
      log('Server.app.bsky object keys: ' + Object.keys(server.app.bsky).join(', '))
      if (server.app.bsky.feed) {
        log(
          'Server.app.bsky.feed object keys: ' +
            Object.keys(server.app.bsky.feed).join(', '),
        )
        if (typeof server.app.bsky.feed.getFeedSkeleton === 'function') {
          log('getFeedSkeleton endpoint exists on server.app.bsky.feed')
        } else {
          log(
            'ERROR: getFeedSkeleton endpoint does NOT exist on server.app.bsky.feed',
          )
        }
      } else {
        log('ERROR: server.app.bsky.feed is undefined')
      }
    } else {
      log('ERROR: server.app.bsky is undefined')
    }
  } else {
    log('ERROR: server.app is undefined')
  }

  try {
    if (!server.app?.bsky?.feed?.getFeedSkeleton) {
      logger.error('Cannot register getFeedSkeleton endpoint because it does not exist on server.app.bsky.feed')
      return
    }

    server.app.bsky.feed.getFeedSkeleton(async (reqCtx) => {
      logger.info('getFeedSkeleton endpoint called', { params: reqCtx.params })

      const { params } = reqCtx
      const feedUri = new AtUri(params.feed)
      logger.info('Feed URI parsed', {
        hostname: feedUri.hostname,
        collection: feedUri.collection,
        rkey: feedUri.rkey,
      })

      const algo = algos[feedUri.rkey]
      if (!algo) {
        logger.error('Algorithm not found', { 
          rkey: feedUri.rkey,
          availableAlgorithms: Object.keys(algos)
        })
      }

      // Check if the feed URI is using the service DID
      // This is important for consistency with the describeFeedGenerator endpoint
      if (
        (feedUri.hostname !== ctx.cfg.serviceDid && feedUri.hostname !== ctx.cfg.publisherDid) ||
        feedUri.collection !== 'app.bsky.feed.generator' ||
        !algo
      ) {
        logger.error('Unsupported algorithm', {
          hostname: feedUri.hostname,
          collection: feedUri.collection,
          rkey: feedUri.rkey,
          serviceDid: ctx.cfg.serviceDid,
          publisherDid: ctx.cfg.publisherDid
        })
        throw new InvalidRequestError(
          'Unsupported algorithm',
          'UnsupportedAlgorithm',
        )
      }

      logger.info('Executing algorithm for feed', { feed: feedUri.rkey })
      const body = await algo(ctx, params)
      logger.info('Algorithm execution completed successfully')

      return {
        encoding: 'application/json',
        body: body,
      }
    })
    logger.info('Successfully registered getFeedSkeleton endpoint')
  } catch (error) {
    logger.error('Error registering getFeedSkeleton endpoint', { error })
    throw error
  }
}
