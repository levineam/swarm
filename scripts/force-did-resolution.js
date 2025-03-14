#!/usr/bin/env node

/**
 * Force DID Resolution Script
 *
 * This script attempts to force refresh the DID resolution by making requests
 * to various DID resolvers. It's useful when you're experiencing DID resolution
 * issues in the Bluesky client.
 */

const fetch = require('node-fetch')
const {BskyAgent} = require('@atproto/api')
require('dotenv').config()

// Configuration
const DID = 'did:web:swarm-feed-generator.onrender.com'
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'
const RESOLVERS = [
  {name: 'PLC Directory', url: `https://plc.directory/${DID}`},
  {name: 'Bluesky API', method: 'resolveWithBskyAgent'},
  {name: 'DID Document', url: `${FEED_GENERATOR_URL}/.well-known/did.json`},
]

// Utility functions
const log = {
  info: message => console.log(`ℹ️ ${message}`),
  success: message => console.log(`✅ ${message}`),
  warning: message => console.log(`⚠️ ${message}`),
  error: message => console.log(`❌ ${message}`),
  section: title =>
    console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`),
}

async function checkResolver(resolver) {
  try {
    if (resolver.method === 'resolveWithBskyAgent') {
      return await resolveWithBskyAgent()
    }

    log.info(`Making request to ${resolver.name}: ${resolver.url}`)

    const response = await fetch(resolver.url, {
      headers: {Accept: 'application/json'},
      timeout: 30000, // 30 second timeout
    })

    if (response.ok) {
      const data = await response.json()
      log.success(`${resolver.name} responded with status ${response.status}`)
      log.info(`Response: ${JSON.stringify(data, null, 2)}`)
      return true
    } else {
      log.warning(`${resolver.name} returned status ${response.status}`)
      log.info(`Response: ${await response.text()}`)
      return false
    }
  } catch (error) {
    log.error(`Error with ${resolver.name}: ${error.message}`)
    return false
  }
}

async function resolveWithBskyAgent() {
  try {
    log.info(`Resolving DID with Bluesky API: ${DID}`)

    const agent = new BskyAgent({
      service: 'https://bsky.social',
    })

    // Try to resolve the DID
    try {
      const result = await agent.resolveHandle({handle: DID})
      log.success(`DID resolved successfully: ${result.data.did}`)
      return true
    } catch (error) {
      log.warning(`Could not resolve DID with Bluesky API: ${error.message}`)

      // If we couldn't resolve the DID, try logging in and then resolving
      log.info('Attempting to resolve after logging in...')

      // Login
      await agent.login({
        identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
        password: process.env.BLUESKY_PASSWORD,
      })

      log.success('Logged in successfully')

      // Try to resolve again
      try {
        const result = await agent.resolveHandle({handle: DID})
        log.success(`DID resolved successfully after login: ${result.data.did}`)
        return true
      } catch (error) {
        log.error(
          `Could not resolve DID with Bluesky API after login: ${error.message}`,
        )
        return false
      }
    }
  } catch (error) {
    log.error(`Error with Bluesky API: ${error.message}`)
    return false
  }
}

async function checkFeedGenerator() {
  log.section('Checking Feed Generator')

  try {
    log.info(
      `Making request to ${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.describeFeedGenerator`,
    )

    const response = await fetch(
      `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.describeFeedGenerator`,
      {
        timeout: 30000, // 30 second timeout
      },
    )

    if (response.ok) {
      const data = await response.json()
      log.success(`Feed generator responded with status ${response.status}`)
      log.info(`DID in response: ${data.did}`)

      if (data.did === DID) {
        log.success('DID in response matches expected DID')
      } else {
        log.warning(
          `DID in response (${data.did}) does not match expected DID (${DID})`,
        )
      }

      return true
    } else {
      log.warning(`Feed generator returned status ${response.status}`)
      log.info(`Response: ${await response.text()}`)
      return false
    }
  } catch (error) {
    log.error(`Error checking feed generator: ${error.message}`)
    return false
  }
}

async function forceDIDResolution() {
  log.section('Force DID Resolution')
  log.info(
    `This script attempts to force refresh the DID resolution for ${DID}`,
  )

  // Check the feed generator first
  await checkFeedGenerator()

  // Check each resolver
  log.section('Checking DID Resolvers')

  for (const resolver of RESOLVERS) {
    log.info(`Checking ${resolver.name}...`)
    await checkResolver(resolver)

    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  log.section('Resolution Attempt Complete')
  log.info(
    "If you're still experiencing DID resolution issues in the Bluesky client:",
  )
  log.info('1. Try clearing your browser cache and reloading the page')
  log.info(
    '2. Run the keep-service-active.js script to keep the service active',
  )
  log.info(
    '3. Check the Render logs for any errors in the feed generator service',
  )
  log.info(
    '4. Consider redeploying the feed generator service with a clear build cache',
  )
}

// Run the script
forceDIDResolution().catch(error => {
  log.error(`Unhandled error: ${error.message}`)
  process.exit(1)
})
