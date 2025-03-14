#!/usr/bin/env node

/**
 * Keep Service Active Script
 *
 * This script periodically pings the feed generator service to keep it active
 * and help with DID resolution. It's particularly useful for services hosted
 * on Render's free tier, which spin down after periods of inactivity.
 *
 * Run this script in the background to keep the service active.
 */

const fetch = require('node-fetch')

// Configuration
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'
const PING_INTERVAL = 10 * 60 * 1000 // 10 minutes in milliseconds
const ENDPOINTS = [
  '/',
  '/.well-known/did.json',
  '/xrpc/app.bsky.feed.describeFeedGenerator',
  '/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community',
]

// Utility functions
const log = {
  info: message => console.log(`[${new Date().toISOString()}] ℹ️ ${message}`),
  success: message =>
    console.log(`[${new Date().toISOString()}] ✅ ${message}`),
  warning: message =>
    console.log(`[${new Date().toISOString()}] ⚠️ ${message}`),
  error: message => console.log(`[${new Date().toISOString()}] ❌ ${message}`),
}

async function pingEndpoint(url) {
  try {
    const startTime = Date.now()
    const response = await fetch(url, {timeout: 30000}) // 30 second timeout
    const responseTime = Date.now() - startTime

    if (response.ok) {
      log.success(`${url} - ${response.status} - ${responseTime}ms`)
      return true
    } else {
      log.warning(`${url} - ${response.status} - ${responseTime}ms`)
      return false
    }
  } catch (error) {
    log.error(`${url} - ${error.message}`)
    return false
  }
}

async function pingService() {
  log.info('Pinging feed generator service...')

  let allSuccessful = true

  for (const endpoint of ENDPOINTS) {
    const url = `${FEED_GENERATOR_URL}${endpoint}`
    const success = await pingEndpoint(url)

    if (!success) {
      allSuccessful = false
    }

    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  if (allSuccessful) {
    log.success('All endpoints are responding correctly')
  } else {
    log.warning('Some endpoints are not responding correctly')
  }

  return allSuccessful
}

async function keepServiceActive() {
  log.info(`Starting service monitor for ${FEED_GENERATOR_URL}`)
  log.info(`Ping interval: ${PING_INTERVAL / 1000 / 60} minutes`)

  // Initial ping
  await pingService()

  // Set up interval for periodic pings
  setInterval(async () => {
    await pingService()
  }, PING_INTERVAL)

  log.info('Service monitor is running. Press Ctrl+C to stop.')
}

// Handle process termination
process.on('SIGINT', () => {
  log.info('Service monitor stopped')
  process.exit(0)
})

// Run the service monitor
keepServiceActive().catch(error => {
  log.error(`Unhandled error: ${error.message}`)
  process.exit(1)
})
