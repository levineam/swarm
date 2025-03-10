import { DidResolver, MemoryCache } from '@atproto/identity'
import events from 'events'
import express from 'express'
import fs from 'fs'
import http from 'http'
import path from 'path'

import { AppContext, Config } from './config'
import { createDb, Database, migrateToLatest } from './db'
import { createServer } from './lexicon'
import describeGenerator from './methods/describe-generator'
import feedGeneration from './methods/feed-generation'
import { FirehoseSubscription } from './subscription'
import wellKnown from './well-known'

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
    const app = express()
    const db = createDb(cfg.sqliteLocation)
    const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint)

    const didCache = new MemoryCache()
    const didResolver = new DidResolver({
      plcUrl: 'https://plc.directory',
      didCache,
    })

    const server = createServer({
      validateResponse: true,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    })
    const ctx: AppContext = {
      db,
      didResolver,
      cfg,
    }

    // Log configuration on startup
    console.log('Feed Generator Configuration:')
    console.log('- HOSTNAME:', cfg.hostname)
    console.log('- PUBLISHER_DID:', cfg.publisherDid)
    console.log('- SERVICE_DID:', cfg.serviceDid)
    console.log('- PORT:', cfg.port)
    console.log('- LISTENHOST:', cfg.listenhost)

    // Serve static files from the public directory
    app.use(express.static(path.join(__dirname, '../public')))

    // Add a direct route for the DID document
    app.get('/.well-known/did.json', (req, res) => {
      console.log('Direct request for DID document received')

      // Try to find the DID document in various locations
      const possiblePaths = [
        path.join(__dirname, '../public/.well-known/did.json'),
        path.join(process.cwd(), 'public/.well-known/did.json'),
        path.join(process.cwd(), '.well-known/did.json'),
        path.join(__dirname, '../.well-known/did.json'),
      ]

      console.log('Checking for DID document in the following paths:')
      possiblePaths.forEach((p) => console.log(`- ${p}`))

      // Try each path
      for (const didPath of possiblePaths) {
        if (fs.existsSync(didPath)) {
          console.log(`Found DID document at ${didPath}, serving it directly`)
          return res.sendFile(didPath)
        }
      }

      // If no file is found, generate a DID document
      console.log('No DID document file found, generating one')
      const didDocument = {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/secp256k1-2019/v1',
        ],
        id: cfg.serviceDid,
        service: [
          {
            id: '#atproto_pds',
            type: 'AtprotoPersonalDataServer',
            serviceEndpoint: 'https://bsky.social',
          },
          {
            id: '#atproto_feed_generator',
            type: 'AtprotoFeedGenerator',
            serviceEndpoint: `https://${cfg.hostname}`,
          },
        ],
      }

      res.json(didDocument)
    })

    // Add a debug endpoint to help diagnose issues
    app.get('/debug', (req, res) => {
      const debugInfo = {
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT,
          FEEDGEN_HOSTNAME: process.env.FEEDGEN_HOSTNAME,
          FEEDGEN_PUBLISHER_DID: process.env.FEEDGEN_PUBLISHER_DID,
          FEEDGEN_SERVICE_DID: process.env.FEEDGEN_SERVICE_DID,
        },
        config: {
          hostname: cfg.hostname,
          publisherDid: cfg.publisherDid,
          serviceDid: cfg.serviceDid,
          port: cfg.port,
          listenhost: cfg.listenhost,
        },
        paths: {
          currentDir: __dirname,
          publicDir: path.join(__dirname, '../public'),
          wellKnownDir: path.join(__dirname, '../public/.well-known'),
          cwd: process.cwd(),
        },
        files: {
          publicDirExists: fs.existsSync(path.join(__dirname, '../public')),
          wellKnownDirExists: fs.existsSync(
            path.join(__dirname, '../public/.well-known'),
          ),
          didJsonExists: fs.existsSync(
            path.join(__dirname, '../public/.well-known/did.json'),
          ),
        },
      }

      res.json(debugInfo)
    })

    feedGeneration(server, ctx)
    describeGenerator(server, ctx)
    app.use(server.xrpc.router)
    app.use(wellKnown(ctx))

    return new FeedGenerator(app, db, firehose, cfg)
  }

  async start(): Promise<http.Server> {
    await migrateToLatest(this.db)
    this.firehose.run(this.cfg.subscriptionReconnectDelay)

    // Use the PORT environment variable provided by Render.com if available
    const port = process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : this.cfg.port

    console.log(`Starting server on ${this.cfg.listenhost}:${port}`)
    this.server = this.app.listen(port, this.cfg.listenhost)
    await events.once(this.server, 'listening')
    console.log(`Server is now listening on ${this.cfg.listenhost}:${port}`)
    return this.server
  }
}

export default FeedGenerator
