import express from 'express'
import fs from 'fs'
import path from 'path'

import { AppContext } from './config'

const makeRouter = (ctx: AppContext) => {
  const router = express.Router()

  router.get('/.well-known/did.json', (_req, res) => {
    if (!ctx.cfg.serviceDid.endsWith(ctx.cfg.hostname)) {
      return res.sendStatus(404)
    }

    // Path to our custom DID document
    const customDidPath = path.join(__dirname, '../public/.well-known/did.json')

    // Check if our custom DID document exists
    if (fs.existsSync(customDidPath)) {
      // Serve the custom DID document
      return res.sendFile(customDidPath)
    }

    // Fallback to generating a basic DID document
    res.json({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: ctx.cfg.serviceDid,
      service: [
        {
          id: '#bsky_fg',
          type: 'BskyFeedGenerator',
          serviceEndpoint: `https://${ctx.cfg.hostname}`,
        },
      ],
    })
  })

  return router
}
export default makeRouter
