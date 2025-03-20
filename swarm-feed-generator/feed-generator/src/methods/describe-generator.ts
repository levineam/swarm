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

    server.app.bsky.feed.describeFeedGenerator(async (reqCtx) => {
      // Log the request details including headers for debugging CORS issues
      logger.info('describeFeedGenerator endpoint called', { 
        headers: reqCtx.req.headers, 
        origin: reqCtx.req.headers.origin,
        method: reqCtx.req.method
      })
      
      // Manually set CORS headers for this specific endpoint
      if (reqCtx.res) {
        const allowedOrigins = [
          'https://bsky.app', 
          'https://staging.bsky.app',
          'http://localhost:19006', 
          'http://localhost:19007', 
          'http://localhost:8080',
          'http://localhost:3000'
        ];
        
        const origin = reqCtx.req.headers.origin;
        
        // Set the appropriate Access-Control-Allow-Origin header
        if (origin && allowedOrigins.includes(origin)) {
          reqCtx.res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
          // Fallback to a wildcard or the main domain
          reqCtx.res.setHeader('Access-Control-Allow-Origin', 'https://bsky.app');
        }
        
        // Set other CORS headers
        reqCtx.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        reqCtx.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
        reqCtx.res.setHeader('Access-Control-Allow-Credentials', 'true');
        reqCtx.res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
        
        logger.info('CORS headers set for response', {
          origin: reqCtx.res.getHeader('Access-Control-Allow-Origin'),
          method: reqCtx.req.method
        });
      }

      logger.info('Available algorithms', { algorithms: Object.keys(algos) })
      logger.info('Publisher DID', { publisherDid: ctx.cfg.publisherDid })
      logger.info('Service DID', { serviceDid: ctx.cfg.serviceDid })

      // CRITICAL UPDATE: Use the SERVICE DID for feed URIs to maintain consistency
      // This ensures that the DID used in feed URIs matches the DID document being served
      const didToUse = ctx.cfg.serviceDid

      const feeds = Object.keys(algos).map((shortname) => ({
        uri: AtUri.make(
          didToUse,
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
          did: didToUse, // Use service DID consistently for both did field and feed URIs
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
