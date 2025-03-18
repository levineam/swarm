import { DidResolver, MemoryCache } from '@atproto/identity'
import cors from 'cors'
import events from 'events'
import express from 'express'
import http from 'http'
import { Server } from '@atproto/xrpc-server'

import { AppContext, Config, getDatabaseLocation } from './config'
import { createDb, Database, migrateToLatest } from './db'
import { createServer as createXrpcServer } from './lexicon'
import describeGenerator from './methods/describe-generator'
import feedGeneration from './methods/feed-generation'
import { FirehoseSubscription } from './subscription'
import makeWellKnownRouter from './well-known'
import logger, { getMemoryLogs } from './util/logger'
import { fixFeedUris } from './middleware/fix-did'

// Store logs in memory for debugging
// This is now handled by the logger module
// const logs: string[] = []
function log(message: string) {
  // Use the Winston logger instead of console.log
  logger.info(message)
}

export class FeedGenerator {
  public app: express.Application
  public server?: http.Server
  public db: Database
  public firehose: FirehoseSubscription
  public cfg: Config

  constructor(
    app: express.Application,
    db: Database,
    firehose: FirehoseSubscription,
    cfg: Config,
  ) {
    this.app = app
    this.db = db
    this.firehose = firehose
    this.cfg = cfg
  }

  static create(cfg: Config) {
    log('=== CREATING SERVER ===')
    logger.info('Configuration', {
      port: cfg.port,
      hostname: cfg.hostname,
      serviceDid: cfg.serviceDid,
      publisherDid: cfg.publisherDid,
      databaseType: cfg.databaseUrl ? 'PostgreSQL' : 'SQLite',
    })

    const app = express()
    const dbLocation = getDatabaseLocation(cfg)
    const db = createDb(dbLocation)
    const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint)

    // Logging middleware
    app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        logger.info(`HTTP Request`, { 
          method: req.method, 
          url: req.url,
          ip: req.ip,
          userAgent: req.get('user-agent')
        })
        next()
      },
    )

    app.use(cors())
    app.use(express.json())

    // Add the fixFeedUris middleware early to ensure it catches all responses
    app.use(fixFeedUris(cfg.serviceDid, cfg.publisherDid))

    // Remove the admin router setup
    // Set up admin router
    // const adminRouter = createAdminRouter(db)
    // app.use('/admin', adminRouter)

    // Add a logs endpoint for debugging
    app.get('/logs', (req, res) => {
      const logs = getMemoryLogs()
      res.json({ logs })
    })

    // Health check endpoint
    app.get('/health', (req: express.Request, res: express.Response) => {
      logger.info('Health check called')
      res.status(200).send('OK')
    })

    // Firehose health check endpoint
    app.get('/health/firehose', (req: express.Request, res: express.Response) => {
      logger.info('Firehose health check called')
      const isConnected = firehose.isFirehoseConnected()
      const lastCursor = firehose.getLastCursor()
      
      if (isConnected) {
        logger.info('Firehose is connected', { lastCursor })
        res.status(200).json({
          status: 'connected',
          lastCursor: lastCursor,
          timestamp: new Date().toISOString()
        })
      } else {
        logger.warn('Firehose is disconnected', { lastCursor })
        res.status(503).json({
          status: 'disconnected',
          lastCursor: lastCursor,
          timestamp: new Date().toISOString()
        })
      }
    })

    // Debug endpoint
    app.get('/debug', (req: express.Request, res: express.Response) => {
      logger.info('Debug endpoint called')
      res.status(200).json({
        message: 'Debug information',
        environment: process.env.NODE_ENV,
        config: {
          port: cfg.port,
          hostname: cfg.hostname,
          serviceDid: cfg.serviceDid,
          publisherDid: cfg.publisherDid,
        },
      })
    })

    // XRPC test endpoint
    app.get('/xrpc-test', (req, res) => {
      logger.info('XRPC test endpoint called')
      res.status(200).json({
        message: 'XRPC test endpoint',
        xrpcAvailable: true,
      })
    })

    // Add a direct test endpoint for the XRPC endpoints
    app.get('/xrpc/app.bsky.feed.describeFeedGenerator', (req, res) => {
      logger.info('Direct test endpoint for describeFeedGenerator called')
      res.status(200).json({
        did: cfg.serviceDid,
        feeds: [
          {
            uri: `at://${cfg.serviceDid}/app.bsky.feed.generator/swarm-community`,
            cid: 'bafyreihbvkwdpxqvvkxqjgvjlvvlvqvkxqvjvlvvlvqvkxqvjvlvvlvqvkxq',
          },
          {
            uri: `at://${cfg.serviceDid}/app.bsky.feed.generator/swarm-trending`,
            cid: 'bafyreihbvkwdpxqvvkxqjgvjlvvlvqvkxqvjvlvvlvqvkxqvjvlvvlvqvkxq',
          },
        ],
        links: {
          privacyPolicy: 'https://swarm-feed-generator.onrender.com/privacy',
          termsOfService: 'https://swarm-feed-generator.onrender.com/terms',
        },
      })
    })

    // Add well-known routes
    const didCache = new MemoryCache()
    const didResolver = new DidResolver({
      plcUrl: 'https://plc.directory',
      didCache,
    })
    const wellKnownRouter = makeWellKnownRouter({ cfg, db, didResolver })
    app.use(wellKnownRouter)

    // Create XRPC server
    logger.info('Creating XRPC server...')
    try {
      const xrpcServer = createXrpcServer()
      logger.info('XRPC server created successfully')
      logger.debug('XRPC server object keys', { keys: Object.keys(xrpcServer).join(', ') })

      if (xrpcServer.app) {
        logger.debug('XRPC server.app object keys', { 
          keys: Object.keys(xrpcServer.app).join(', ') 
        })
        
        if (xrpcServer.app.bsky) {
          logger.debug('XRPC server.app.bsky object keys', { 
            keys: Object.keys(xrpcServer.app.bsky).join(', ') 
          })
          
          if (xrpcServer.app.bsky.feed) {
            logger.debug('XRPC server.app.bsky.feed object keys', { 
              keys: Object.keys(xrpcServer.app.bsky.feed).join(', ') 
            })
          } else {
            logger.error('XRPC server.app.bsky.feed is undefined')
          }
        } else {
          logger.error('XRPC server.app.bsky is undefined')
        }
      } else {
        logger.error('XRPC server.app is undefined')
      }

      // Create AppContext
      const ctx: AppContext = {
        db,
        didResolver,
        cfg,
      }

      // Register methods
      logger.info('Registering XRPC methods...')
      feedGeneration(xrpcServer, ctx)
      describeGenerator(xrpcServer, ctx)
      logger.info('XRPC methods registered successfully')

      // Mount XRPC routes
      logger.info('Mounting XRPC routes...')
      if (xrpcServer.xrpc && xrpcServer.xrpc.router) {
        app.use(xrpcServer.xrpc.router)
        logger.info('XRPC routes mounted successfully')
      } else {
        logger.error('xrpcServer.xrpc.router is undefined')
      }
    } catch (err) {
      logger.error('Failed to create XRPC server', { error: err })
      console.error('Failed to create XRPC server:', err)
    }

    return new FeedGenerator(app, db, firehose, cfg)
  }

  async start(): Promise<http.Server> {
    try {
      await migrateToLatest(this.db)
      logger.info('Database migrations completed successfully')
    } catch (err) {
      logger.error('Database migration failed', { error: err })
      throw err
    }
    
    this.firehose.run(this.cfg.subscriptionReconnectDelay)
    logger.info('Firehose subscription started')

    // Use the PORT environment variable provided by Render.com if available
    const port = process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : this.cfg.port

    logger.info(`Starting server on port ${port}`)

    this.server = this.app.listen(port, this.cfg.listenhost)
    
    // Set up error handling for the server
    this.server.on('error', (error) => {
      logger.error('Server error', { error })
    })
    
    await events.once(this.server, 'listening')
    logger.info(`Server is now listening on port ${port}`)

    // Add root path handler
    this.app.get('/', (req, res) => {
      logger.info('Root path called')
      
      // Use the service DID in the HTML content
      const serviceDid = this.cfg.serviceDid
      
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Swarm Feed Generator</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #1D9BF0;
            }
            .endpoint {
              background-color: #f5f5f5;
              padding: 10px;
              border-radius: 5px;
              margin-bottom: 10px;
              font-family: monospace;
            }
            a {
              color: #1D9BF0;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            .feeds {
              margin-top: 20px;
            }
            .feed-item {
              margin-bottom: 15px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .feed-title {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .feed-uri {
              font-family: monospace;
              font-size: 0.9em;
              background-color: #f5f5f5;
              padding: 5px;
              border-radius: 3px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <h1>Swarm Feed Generator</h1>
          <p>This is the feed generator service for the <a href="https://swarm-social.onrender.com" target="_blank">Swarm</a> community platform on Bluesky.</p>
          
          <h2>Available Feeds</h2>
          <div class="feeds">
            <div class="feed-item">
              <div class="feed-title">Swarm Community</div>
              <p>A feed of posts from Swarm community members</p>
              <div class="feed-uri">at://${serviceDid}/app.bsky.feed.generator/swarm-community</div>
            </div>
            <div class="feed-item">
              <div class="feed-title">Swarm Trending</div>
              <p>A feed of trending posts from the Swarm community</p>
              <div class="feed-uri">at://${serviceDid}/app.bsky.feed.generator/swarm-trending</div>
            </div>
          </div>
          
          <h2>API Endpoints</h2>
          <div class="endpoint">GET /health - Health check endpoint</div>
          <div class="endpoint">GET /health/firehose - Firehose health check</div>
          <div class="endpoint">GET /debug - Debug information</div>
          <div class="endpoint">GET /xrpc-test - Test XRPC functionality</div>
          <div class="endpoint">GET /xrpc/app.bsky.feed.describeFeedGenerator - Feed generator metadata</div>
          <div class="endpoint">GET /xrpc/app.bsky.feed.getFeedSkeleton?feed={feedUri} - Get feed content</div>
          
          <h2>How to Use</h2>
          <p>To use these feeds in your Bluesky client:</p>
          <ol>
            <li>Open the Bluesky app</li>
            <li>Go to the Discover tab</li>
            <li>Search for "Swarm"</li>
            <li>Add the Swarm Community or Swarm Trending feed</li>
          </ol>
          
          <h2>Integration</h2>
          <p>This feed generator is integrated with the <a href="https://swarm-social.onrender.com" target="_blank">Swarm Social</a> platform, which provides a customized Bluesky experience with community features.</p>
          
          <footer style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            <p>© ${new Date().getFullYear()} Swarm Social</p>
          </footer>
        </body>
        </html>
      `)
    })

    return this.server
  }
}

export default FeedGenerator
