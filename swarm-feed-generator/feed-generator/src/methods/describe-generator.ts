import { AtUri } from '@atproto/syntax'

import algos from '../algos'
import { AppContext } from '../config'
import { Server } from '../lexicon'

export default function describeGenerator(server: Server, ctx: AppContext) {
  // Add detailed logging to help debug the XRPC endpoint registration
  console.log('=== REGISTERING describeFeedGenerator ENDPOINT ===')
  console.log('Server object:', Object.keys(server))
  console.log('Server.app object:', Object.keys(server.app))
  console.log('Server.app.bsky object:', Object.keys(server.app.bsky))
  console.log('Server.app.bsky.feed object:', Object.keys(server.app.bsky.feed))

  try {
    server.app.bsky.feed.describeFeedGenerator(async () => {
      console.log('describeFeedGenerator endpoint called')
      console.log('Available algorithms:', Object.keys(algos))
      console.log('Publisher DID:', ctx.cfg.publisherDid)
      console.log('Service DID:', ctx.cfg.serviceDid)

      const feeds = Object.keys(algos).map((shortname) => ({
        uri: AtUri.make(
          ctx.cfg.publisherDid,
          'app.bsky.feed.generator',
          shortname,
        ).toString(),
      }))

      console.log('Returning feeds:', feeds)

      return {
        encoding: 'application/json',
        body: {
          did: ctx.cfg.serviceDid,
          feeds,
        },
      }
    })
    console.log('Successfully registered describeFeedGenerator endpoint')
  } catch (error) {
    console.error('Error registering describeFeedGenerator endpoint:', error)
    throw error
  }
}
