// @ts-nocheck
import express from 'express'
import fs from 'fs'
import path from 'path'
import { logger } from './util/logger'

import { AppContext } from './config'

const makeRouter = (ctx: AppContext) => {
  const router = express.Router()

  // Helper function to serve the DID document
  const serveDidDocument = (req, res) => {
    logger.info(`Received ${req.method} request for DID document`, {
      serviceDid: ctx.cfg.serviceDid,
      hostname: ctx.cfg.hostname,
      method: req.method
    })

    // Add cache-busting headers to prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.set('Content-Type', 'application/json; charset=utf-8')

    if (!ctx.cfg.serviceDid.endsWith(ctx.cfg.hostname)) {
      logger.warn(`DID document request rejected: Service DID/hostname mismatch`, {
        serviceDid: ctx.cfg.serviceDid,
        hostname: ctx.cfg.hostname
      })
      return res.sendStatus(404)
    }

    // Try multiple paths for the custom DID document
    const possiblePaths = [
      path.join(__dirname, '../public/.well-known/did.json'),
      path.join(process.cwd(), 'public/.well-known/did.json'),
      path.join(process.cwd(), '.well-known/did.json'),
    ]

    // Log all possible paths we're checking
    logger.debug('Checking for DID document at paths', { paths: possiblePaths })

    // Try each path
    for (const customDidPath of possiblePaths) {
      if (fs.existsSync(customDidPath)) {
        logger.info(`Found DID document at ${customDidPath}`)
        
        // For HEAD requests, don't send the file content
        if (req.method === 'HEAD') {
          return res.sendStatus(200)
        }
        
        return res.sendFile(customDidPath)
      }
    }

    logger.warn('No custom DID document found, generating a basic one')

    // Fallback to generating a basic DID document
    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: ctx.cfg.serviceDid,
      service: [
        {
          id: '#atproto_pds',
          type: 'AtprotoPersonalDataServer',
          serviceEndpoint: 'https://bsky.social',
        },
        {
          id: '#bsky_fg',
          type: 'BskyFeedGenerator',
          serviceEndpoint: `https://${ctx.cfg.hostname}`,
        },
      ],
    }

    logger.debug('Generated DID document', { document: didDocument })
    
    // For HEAD requests, don't send the document content
    if (req.method === 'HEAD') {
      return res.sendStatus(200)
    }
    
    res.json(didDocument)
  }

  // Handle GET, HEAD, and OPTIONS for /.well-known/did.json
  router.get('/.well-known/did.json', serveDidDocument)
  router.head('/.well-known/did.json', serveDidDocument)
  
  // Explicit OPTIONS handler for CORS preflight requests
  router.options('/.well-known/did.json', (req, res) => {
    logger.info('Received OPTIONS request for DID document')
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Max-Age', '86400') // 24 hours
    
    res.sendStatus(204) // No content
  })

  // Also serve the DID document at /did.json for backward compatibility
  router.get('/did.json', serveDidDocument)
  router.head('/did.json', serveDidDocument)
  router.options('/did.json', (req, res) => {
    logger.info('Received OPTIONS request for /did.json')
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Max-Age', '86400') // 24 hours
    
    res.sendStatus(204) // No content
  })

  return router
}

export default makeRouter
