import { AtUri } from '@atproto/syntax'
import { InvalidRequestError } from '@atproto/xrpc-server'

import algos from '../algos'
import { AppContext } from '../config'
import { Server } from '../lexicon'

export default function feedGeneration(server: Server, ctx: AppContext) {
  // Add detailed logging to help debug the XRPC endpoint registration
  console.log('=== REGISTERING getFeedSkeleton ENDPOINT ===')
  console.log('Server object:', Object.keys(server))
  console.log('Server.app object:', Object.keys(server.app))
  console.log('Server.app.bsky object:', Object.keys(server.app.bsky))
  console.log('Server.app.bsky.feed object:', Object.keys(server.app.bsky.feed))

  try {
    server.app.bsky.feed.getFeedSkeleton(async (reqCtx) => {
      console.log('getFeedSkeleton endpoint called with params:', reqCtx.params)

      const { params } = reqCtx
      const feedUri = new AtUri(params.feed)
      const algo = algos[feedUri.rkey]
      if (
        feedUri.hostname !== ctx.cfg.publisherDid ||
        feedUri.collection !== 'app.bsky.feed.generator' ||
        !algo
      ) {
        throw new InvalidRequestError(
          'Unsupported algorithm',
          'UnsupportedAlgorithm',
        )
      }
      /**
       * Example of how to check auth if giving user-specific results:
       *
       * const requesterDid = await validateAuth(
       *   req,
       *   ctx.cfg.serviceDid,
       *   ctx.didResolver,
       * )
       */

      const body = await algo(ctx, params)
      return {
        encoding: 'application/json',
        body: body,
      }
    })
    console.log('Successfully registered getFeedSkeleton endpoint')
  } catch (error) {
    console.error('Error registering getFeedSkeleton endpoint:', error)
    throw error
  }
}
