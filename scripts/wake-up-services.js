#!/usr/bin/env node

/**
 * Wake Up Services Script
 *
 * This script sends requests to the Swarm services to "wake them up" if they've
 * been spun down due to inactivity on Render's free tier.
 *
 * Run this script before running health checks or when you need to ensure
 * the services are active.
 */

const fetch = require('node-fetch')

// Configuration
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'
const MAIN_APP_URL = 'https://swarm-social.onrender.com'
const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds

// Utility functions
const log = {
  info: message => console.log(`ℹ️ ${message}`),
  success: message => console.log(`✅ ${message}`),
  warning: message => console.log(`⚠️ ${message}`),
  error: message => console.log(`❌ ${message}`),
  section: title =>
    console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`),
}

// Sleep function for waiting between retries
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function wakeUpService(url, name) {
  log.info(`Attempting to wake up ${name} at ${url}...`)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log.info(`Attempt ${attempt}/${MAX_RETRIES}...`)
      const startTime = Date.now()
      const response = await fetch(url, {timeout: 60000}) // 60 second timeout
      const responseTime = Date.now() - startTime

      if (response.ok) {
        log.success(`${name} is awake! Response time: ${responseTime}ms`)
        return true
      } else {
        log.warning(
          `${name} returned status ${response.status}. Response time: ${responseTime}ms`,
        )
        if (attempt < MAX_RETRIES) {
          log.info(`Waiting ${RETRY_DELAY / 1000} seconds before retrying...`)
          await sleep(RETRY_DELAY)
        }
      }
    } catch (error) {
      log.warning(`Failed to connect to ${name}: ${error.message}`)
      if (attempt < MAX_RETRIES) {
        log.info(`Waiting ${RETRY_DELAY / 1000} seconds before retrying...`)
        await sleep(RETRY_DELAY)
      }
    }
  }

  log.error(`Failed to wake up ${name} after ${MAX_RETRIES} attempts.`)
  return false
}

async function wakeUpFeedGeneratorEndpoints() {
  log.section('Waking up Feed Generator XRPC Endpoints')

  const endpoints = [
    {url: `${FEED_GENERATOR_URL}/xrpc/_health`, name: 'Health Endpoint'},
    {
      url: `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.describeFeedGenerator`,
      name: 'DescribeFeedGenerator Endpoint',
    },
    {
      url: `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`,
      name: 'GetFeedSkeleton Endpoint',
    },
    {url: `${FEED_GENERATOR_URL}/.well-known/did.json`, name: 'DID Document'},
  ]

  for (const endpoint of endpoints) {
    await wakeUpService(endpoint.url, endpoint.name)
    await sleep(2000) // Add a small delay between requests
  }
}

async function wakeUpServices() {
  log.section('Wake Up Services')
  log.info(
    'This script will attempt to wake up the Swarm services if they have been spun down due to inactivity.',
  )
  log.info(
    "This is particularly useful for services hosted on Render's free tier.",
  )

  // Wake up the main app
  log.section('Waking up Main App')
  const mainAppAwake = await wakeUpService(MAIN_APP_URL, 'Main App')

  // Wake up the feed generator
  log.section('Waking up Feed Generator')
  const feedGeneratorAwake = await wakeUpService(
    FEED_GENERATOR_URL,
    'Feed Generator',
  )

  // If the feed generator is awake, wake up its endpoints
  if (feedGeneratorAwake) {
    await wakeUpFeedGeneratorEndpoints()
  }

  // Summary
  log.section('Wake Up Summary')
  if (mainAppAwake) {
    log.success('Main App is awake and responding')
  } else {
    log.error('Failed to wake up Main App')
  }

  if (feedGeneratorAwake) {
    log.success('Feed Generator is awake and responding')
  } else {
    log.error('Failed to wake up Feed Generator')
  }

  if (mainAppAwake && feedGeneratorAwake) {
    log.success(
      '\nAll services are awake! You can now run health checks or use the application.',
    )
    log.info(
      'Note: Services may still be initializing internally. If you encounter errors in subsequent requests, wait a few more minutes and try again.',
    )
  } else {
    log.error(
      '\nSome services failed to wake up. Check the Render dashboard for any issues.',
    )
  }
}

// Run the wake up process
wakeUpServices().catch(error => {
  log.error(`Unhandled error during wake up process: ${error.message}`)
  process.exit(1)
})
