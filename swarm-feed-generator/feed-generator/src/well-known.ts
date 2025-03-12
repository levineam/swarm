// @ts-nocheck
import express from 'express'
import fs from 'fs'
import path from 'path'

import { AppContext } from './config'

const makeRouter = (ctx: AppContext) => {
  const router = express.Router()

  router.get('/.well-known/did.json', (_req, res) => {
    console.log(
      `Received request for DID document. Service DID: ${ctx.cfg.serviceDid}, Hostname: ${ctx.cfg.hostname}`,
    )

    if (!ctx.cfg.serviceDid.endsWith(ctx.cfg.hostname)) {
      console.log(
        `DID document request rejected: Service DID ${ctx.cfg.serviceDid} does not match hostname ${ctx.cfg.hostname}`,
      )
      return res.sendStatus(404)
    }

    // Try multiple paths for the custom DID document
    const possiblePaths = [
      path.join(__dirname, '../public/.well-known/did.json'),
      path.join(process.cwd(), 'public/.well-known/did.json'),
      path.join(process.cwd(), '.well-known/did.json'),
    ]

    // Log all possible paths we're checking
    console.log('Checking for DID document at the following paths:')
    possiblePaths.forEach((p) => console.log(`- ${p}`))

    // Try each path
    for (const customDidPath of possiblePaths) {
      if (fs.existsSync(customDidPath)) {
        console.log(`Found DID document at ${customDidPath}, serving it`)
        return res.sendFile(customDidPath)
      }
    }

    console.log('No custom DID document found, generating a basic one')

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
          id: '#atproto_feed_generator',
          type: 'AtprotoFeedGenerator',
          serviceEndpoint: `https://${ctx.cfg.hostname}`,
        },
      ],
    }

    console.log('Generated DID document:', JSON.stringify(didDocument, null, 2))
    res.json(didDocument)
  })

  return router
}
export default makeRouter
