import { AtUri } from '@atproto/syntax'
import { InvalidRequestError } from '@atproto/xrpc-server'

import algos from '../algos'
import { AppContext } from '../config'
import { Server } from '../lexicon'

// Helper function for logging
function log(message: string) {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp} - ${message}`)
}

export default function feedGeneration(server: Server, ctx: AppContext) {
  // Add detailed logging to help debug the XRPC endpoint registration
  log('=== REGISTERING getFeedSkeleton ENDPOINT ===')

  // Log server object properties
  log('Server object keys: ' + Object.keys(server).join(', '))
  if (server.app) {
    log('Server.app object keys: ' + Object.keys(server.app).join(', '))
    if (server.app.bsky) {
      log(
        'Server.app.bsky object keys: ' +
          Object.keys(server.app.bsky).join(', '),
      )
      if (server.app.bsky.feed) {
        log(
          'Server.app.bsky.feed object keys: ' +
            Object.keys(server.app.bsky.feed).join(', '),
        )
        if (server.app.bsky.feed.getFeedSkeleton) {
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
      log(
        'ERROR: Cannot register getFeedSkeleton endpoint because it does not exist on server.app.bsky.feed',
      )
      return
    }

    server.app.bsky.feed.getFeedSkeleton(async (reqCtx) => {
      log(
        'getFeedSkeleton endpoint called with params: ' +
          JSON.stringify(reqCtx.params),
      )

      const { params } = reqCtx
      const feedUri = new AtUri(params.feed)
      log(
        'Feed URI parsed: ' +
          JSON.stringify({
            hostname: feedUri.hostname,
            collection: feedUri.collection,
            rkey: feedUri.rkey,
          }),
      )

      const algo = algos[feedUri.rkey]
      if (!algo) {
        log('ERROR: Algorithm not found for rkey: ' + feedUri.rkey)
        log('Available algorithms: ' + Object.keys(algos).join(', '))
      }

      if (
        feedUri.hostname !== ctx.cfg.publisherDid ||
        feedUri.collection !== 'app.bsky.feed.generator' ||
        !algo
      ) {
        log(
          'ERROR: Unsupported algorithm - hostname: ' +
            feedUri.hostname +
            ', collection: ' +
            feedUri.collection +
            ', rkey: ' +
            feedUri.rkey,
        )
        throw new InvalidRequestError(
          'Unsupported algorithm',
          'UnsupportedAlgorithm',
        )
      }

      log('Executing algorithm for feed: ' + feedUri.rkey)
      const body = await algo(ctx, params)
      log('Algorithm execution completed successfully')

      return {
        encoding: 'application/json',
        body: body,
      }
    })
    log('Successfully registered getFeedSkeleton endpoint')
  } catch (error) {
    log('Error registering getFeedSkeleton endpoint: ' + error)
    throw error
  }
}
