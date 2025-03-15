import { DidResolver, MemoryCache } from '@atproto/identity'
import cors from 'cors'
import events from 'events'
import express from 'express'
import http from 'http'

import { createAdminRouter } from './admin'
import { AppContext, Config, getDatabaseLocation } from './config'
import { createDb, Database, migrateToLatest } from './db'
import { createServer as createXrpcServer } from './lexicon'
import describeGenerator from './methods/describe-generator'
import feedGeneration from './methods/feed-generation'
import { FirehoseSubscription } from './subscription'
import makeWellKnownRouter from './well-known'

// Store logs in memory for debugging
const logs: string[] = []
function log(message: string) {
  const timestamp = new Date().toISOString()
  const logMessage = `${timestamp} - ${message}`
  console.log(logMessage)
  logs.push(logMessage)
  // Keep only the last 1000 log messages
  if (logs.length > 1000) {
    logs.shift()
  }
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
    log(
      'Configuration: ' +
        JSON.stringify({
          port: cfg.port,
          hostname: cfg.hostname,
          serviceDid: cfg.serviceDid,
          publisherDid: cfg.publisherDid,
          databaseType: cfg.databaseUrl ? 'PostgreSQL' : 'SQLite',
        }),
    )

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
        log(`${req.method} ${req.url}`)
        next()
      },
    )

    app.use(cors())
    app.use(express.json())

    // Set up admin router
    const adminRouter = createAdminRouter(db)
    app.use('/admin', adminRouter)

    // Add a logs endpoint for debugging
    app.get('/logs', (req, res) => {
      // This is a simple implementation that returns recent logs
      // In a production environment, you would want to implement proper log storage and retrieval
      res.status(200).json({
        message: 'This endpoint returns recent logs for debugging purposes',
        environment: process.env.NODE_ENV,
        logs: logs.slice(-100), // Return the last 100 logs
        config: {
          port: cfg.port,
          hostname: cfg.hostname,
          serviceDid: cfg.serviceDid,
          publisherDid: cfg.publisherDid,
        },
      })
    })

    // Health check endpoint
    app.get('/health', (req: express.Request, res: express.Response) => {
      log('Health check called')
      res.status(200).send('OK')
    })

    // Firehose health check endpoint
    app.get(
      '/health/firehose',
      (req: express.Request, res: express.Response) => {
        log('Firehose health check called')
        const isConnected = firehose.isFirehoseConnected()
        const lastCursor = firehose.getLastCursor()

        if (isConnected) {
          res.status(200).json({
            status: 'connected',
            lastCursor: lastCursor,
            timestamp: new Date().toISOString(),
          })
        } else {
          res.status(503).json({
            status: 'disconnected',
            lastCursor: lastCursor,
            timestamp: new Date().toISOString(),
          })
        }
      },
    )

    // Debug endpoint
    app.get('/debug', (req: express.Request, res: express.Response) => {
      log('Debug endpoint called')
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
      log('XRPC test endpoint called')
      res.status(200).json({
        message: 'XRPC test endpoint',
        xrpcAvailable: true,
      })
    })

    // Add a direct test endpoint for the XRPC endpoints
    app.get('/xrpc/app.bsky.feed.describeFeedGenerator', (req, res) => {
      log('Direct test endpoint for describeFeedGenerator called')
      res.status(200).json({
        did: cfg.serviceDid,
        feeds: [
          {
            uri: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community',
            cid: 'bafyreihbvkwdpxqvvkxqjgvjlvvlvqvkxqvjvlvvlvqvkxqvjvlvvlvqvkxq',
          },
          {
            uri: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-trending',
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
    log('Creating XRPC server...')
    try {
      const xrpcServer = createXrpcServer({})
      log('XRPC server created successfully')
      log('XRPC server object keys: ' + Object.keys(xrpcServer).join(', '))

      if (xrpcServer.app) {
        log(
          'XRPC server.app object keys: ' +
            Object.keys(xrpcServer.app).join(', '),
        )
        if (xrpcServer.app.bsky) {
          log(
            'XRPC server.app.bsky object keys: ' +
              Object.keys(xrpcServer.app.bsky).join(', '),
          )
          if (xrpcServer.app.bsky.feed) {
            log(
              'XRPC server.app.bsky.feed object keys: ' +
                Object.keys(xrpcServer.app.bsky.feed).join(', '),
            )
          } else {
            log('ERROR: XRPC server.app.bsky.feed is undefined')
          }
        } else {
          log('ERROR: XRPC server.app.bsky is undefined')
        }
      } else {
        log('ERROR: XRPC server.app is undefined')
      }

      // Create AppContext
      const ctx: AppContext = {
        db,
        didResolver,
        cfg,
      }

      // Register methods
      log('Registering XRPC methods...')
      feedGeneration(xrpcServer, ctx)
      describeGenerator(xrpcServer, ctx)
      log('XRPC methods registered successfully')

      // Mount XRPC routes
      log('Mounting XRPC routes...')
      if (xrpcServer.xrpc && xrpcServer.xrpc.router) {
        app.use(xrpcServer.xrpc.router)
        log('XRPC routes mounted successfully')
      } else {
        log('ERROR: xrpcServer.xrpc.router is undefined')
      }
    } catch (err) {
      log('Error creating XRPC server: ' + err)
      console.error('Failed to create XRPC server:', err)
    }

    return new FeedGenerator(app, db, firehose, cfg)
  }

  async start(): Promise<http.Server> {
    await migrateToLatest(this.db)
    this.firehose.run(this.cfg.subscriptionReconnectDelay)

    // Use the PORT environment variable provided by Render.com if available
    const port = process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : this.cfg.port

    log(`Starting server on port ${port}`)

    this.server = this.app.listen(port, this.cfg.listenhost)
    await events.once(this.server, 'listening')
    log(`Server is now listening on port ${port}`)

    // Add root path handler
    this.app.get('/', (req, res) => {
      console.log('Root path called')
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
              <div class="feed-uri">at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community</div>
            </div>
            <div class="feed-item">
              <div class="feed-title">Swarm Trending</div>
              <p>A feed of trending posts from the Swarm community</p>
              <div class="feed-uri">at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-trending</div>
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
