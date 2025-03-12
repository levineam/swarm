import { DidResolver, MemoryCache } from '@atproto/identity'
import cors from 'cors'
import events from 'events'
import express from 'express'
import http from 'http'

import { AppContext, Config } from './config'
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
        }),
    )

    const app = express()
    const db = createDb(cfg.sqliteLocation)
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
      log('Health check endpoint called')
      res.status(200).send('OK')
    })

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
          privacyPolicy: 'https://swarm-social.onrender.com/privacy',
          termsOfService: 'https://swarm-social.onrender.com/terms',
        },
      })
    })

    app.get('/xrpc/app.bsky.feed.getFeedSkeleton', (req, res) => {
      log('Direct test endpoint for getFeedSkeleton called')
      const feed = req.query.feed
      log(`Feed requested: ${feed}`)

      // Return a simple feed skeleton
      res.status(200).json({
        feed: [
          {
            post: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/3kgcdlnbmm22o',
          },
          {
            post: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/3kgcdlnbmm22p',
          },
        ],
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
    return this.server
  }
}

export default FeedGenerator
