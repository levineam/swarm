import { AtUri } from '@atproto/syntax'

import algos from '../algos'
import { AppContext } from '../config'
import { Server } from '../lexicon'

// Helper function for logging
function log(message: string) {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp} - ${message}`)
}

export default function describeGenerator(server: Server, ctx: AppContext) {
  // Add detailed logging to help debug the XRPC endpoint registration
  log('=== REGISTERING describeFeedGenerator ENDPOINT ===')

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
        if (server.app.bsky.feed.describeFeedGenerator) {
          log('describeFeedGenerator endpoint exists on server.app.bsky.feed')
        } else {
          log(
            'ERROR: describeFeedGenerator endpoint does NOT exist on server.app.bsky.feed',
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
    if (!server.app?.bsky?.feed?.describeFeedGenerator) {
      log(
        'ERROR: Cannot register describeFeedGenerator endpoint because it does not exist on server.app.bsky.feed',
      )
      return
    }

    server.app.bsky.feed.describeFeedGenerator(async () => {
      log('describeFeedGenerator endpoint called')
      log('Available algorithms: ' + Object.keys(algos).join(', '))
      log('Publisher DID: ' + ctx.cfg.publisherDid)
      log('Service DID: ' + ctx.cfg.serviceDid)

      const feeds = Object.keys(algos).map((shortname) => ({
        uri: AtUri.make(
          ctx.cfg.publisherDid,
          'app.bsky.feed.generator',
          shortname,
        ).toString(),
      }))

      log('Returning feeds: ' + JSON.stringify(feeds))

      return {
        encoding: 'application/json',
        body: {
          did: ctx.cfg.serviceDid,
          feeds,
        },
      }
    })
    log('Successfully registered describeFeedGenerator endpoint')
  } catch (error) {
    log('Error registering describeFeedGenerator endpoint: ' + error)
    throw error
  }
}
