#!/usr/bin/env node

/**
 * Swarm Health Check Script
 *
 * This script performs a comprehensive health check of the Swarm system,
 * including the feed generator service and the main web application.
 *
 * Run this script after deploying to Render to ensure everything is working properly.
 */

const fetch = require('node-fetch')
const {BskyAgent} = require('@atproto/api')
require('dotenv').config()

// Configuration
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'
const MAIN_APP_URL = 'https://swarm-social.onrender.com'
const FEED_URI =
  'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'

// Utility functions
const log = {
  info: message => console.log(`ℹ️ ${message}`),
  success: message => console.log(`✅ ${message}`),
  warning: message => console.log(`⚠️ ${message}`),
  error: message => console.log(`❌ ${message}`),
  section: title =>
    console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`),
}

// Sleep function for rate limiting and waiting for services to start
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function checkEndpoint(url, name) {
  try {
    log.info(`Checking ${name} endpoint: ${url}`)
    const response = await fetch(url)

    if (response.ok) {
      log.success(
        `${name} endpoint is responding with status ${response.status}`,
      )
      return {success: true, status: response.status}
    } else {
      log.error(`${name} endpoint returned status ${response.status}`)
      return {
        success: false,
        status: response.status,
        error: await response.text(),
      }
    }
  } catch (error) {
    log.error(`Failed to connect to ${name} endpoint: ${error.message}`)
    return {success: false, error: error.message}
  }
}

async function checkDidDocument() {
  try {
    log.info(
      `Checking DID document at ${FEED_GENERATOR_URL}/.well-known/did.json`,
    )
    const response = await fetch(`${FEED_GENERATOR_URL}/.well-known/did.json`)

    if (response.ok) {
      const didDoc = await response.json()
      log.success(`DID document is accessible`)

      // Check if the DID document has the correct service endpoint
      const feedGeneratorService = didDoc.service?.find(
        service =>
          service.id === '#bsky_fg' && service.type === 'BskyFeedGenerator',
      )

      if (feedGeneratorService) {
        log.success(
          `Feed generator service found: ${feedGeneratorService.serviceEndpoint}`,
        )

        if (feedGeneratorService.serviceEndpoint === FEED_GENERATOR_URL) {
          log.success(`Service endpoint matches the feed generator URL`)
        } else {
          log.warning(
            `Service endpoint (${feedGeneratorService.serviceEndpoint}) does not match the feed generator URL (${FEED_GENERATOR_URL})`,
          )
        }
      } else {
        log.error(`Feed generator service not found in DID document!`)
        log.info(`DID document: ${JSON.stringify(didDoc, null, 2)}`)
      }

      return {success: true, didDoc}
    } else {
      log.error(`DID document returned status ${response.status}`)
      return {
        success: false,
        status: response.status,
        error: await response.text(),
      }
    }
  } catch (error) {
    log.error(`Failed to fetch DID document: ${error.message}`)
    return {success: false, error: error.message}
  }
}

async function checkXrpcEndpoints() {
  const endpoints = [
    {url: `${FEED_GENERATOR_URL}/xrpc/_health`, name: 'Health'},
    {
      url: `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.describeFeedGenerator`,
      name: 'DescribeFeedGenerator',
    },
    {
      url: `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        FEED_URI,
      )}`,
      name: 'GetFeedSkeleton',
    },
  ]

  const results = {}

  for (const endpoint of endpoints) {
    results[endpoint.name] = await checkEndpoint(endpoint.url, endpoint.name)
    await sleep(1000) // Add a small delay between requests
  }

  return results
}

async function checkFeedGeneratorRecord() {
  try {
    log.info('Checking feed generator record in Bluesky PDS')

    const agent = new BskyAgent({
      service: 'https://bsky.social',
    })

    // Login
    await agent.login({
      identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
      password: process.env.BLUESKY_PASSWORD,
    })

    log.success('Logged in successfully')

    // Get the feed generator record
    const result = await agent.api.com.atproto.repo.getRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.generator',
      rkey: 'swarm-community',
    })

    log.success('Feed generator record found')

    // Check if the DID in the record matches the expected DID
    const expectedDid = 'did:web:swarm-feed-generator.onrender.com'
    const actualDid = result.data.value.did

    if (actualDid === expectedDid) {
      log.success(`DID is correct: ${actualDid}`)
    } else {
      log.error(`DID is incorrect!`)
      log.info(`Expected: ${expectedDid}`)
      log.info(`Actual: ${actualDid}`)
    }

    return {success: true, record: result.data.value}
  } catch (error) {
    log.error(`Error checking feed generator record: ${error.message}`)
    if (error.status === 404) {
      log.error(
        'Feed generator record not found. You may need to create it first.',
      )
    }
    return {success: false, error: error.message}
  }
}

async function resolveDidWithAtProtocol() {
  try {
    log.info('Attempting to resolve DID using AT Protocol...')

    const agent = new BskyAgent({
      service: 'https://bsky.social',
    })

    const did = 'did:web:swarm-feed-generator.onrender.com'
    log.info(`Resolving DID: ${did}`)

    const result = await agent.resolveHandle({handle: did})

    log.success(`DID resolved successfully: ${result.data.did}`)
    return {success: true, did: result.data.did}
  } catch (error) {
    log.error(`Error resolving DID: ${error.message}`)
    return {success: false, error: error.message}
  }
}

async function checkMainAppEndpoint() {
  return await checkEndpoint(MAIN_APP_URL, 'Main App')
}

async function runHealthCheck() {
  log.section('Swarm Health Check')
  log.info(`Feed Generator URL: ${FEED_GENERATOR_URL}`)
  log.info(`Main App URL: ${MAIN_APP_URL}`)
  log.info(`Feed URI: ${FEED_URI}`)

  // Check if the main app is accessible
  log.section('Main App Check')
  const mainAppResult = await checkMainAppEndpoint()

  // Check if the feed generator service is accessible
  log.section('Feed Generator Service Check')
  const feedGeneratorResult = await checkEndpoint(
    FEED_GENERATOR_URL,
    'Feed Generator',
  )

  if (!feedGeneratorResult.success) {
    log.error(
      'Feed Generator service is not accessible. Aborting further checks.',
    )
    return
  }

  // Check the DID document
  log.section('DID Document Check')
  const didDocResult = await checkDidDocument()

  // Check XRPC endpoints
  log.section('XRPC Endpoints Check')
  const xrpcResults = await checkXrpcEndpoints()

  // Check feed generator record in Bluesky PDS
  log.section('Feed Generator Record Check')
  const feedRecordResult = await checkFeedGeneratorRecord()

  // Try to resolve the DID using AT Protocol
  log.section('DID Resolution Check')
  const didResolutionResult = await resolveDidWithAtProtocol()

  // Summary
  log.section('Health Check Summary')

  const allChecks = {
    'Main App': mainAppResult.success,
    'Feed Generator Service': feedGeneratorResult.success,
    'DID Document': didDocResult.success,
    'Health Endpoint': xrpcResults.Health.success,
    'DescribeFeedGenerator Endpoint': xrpcResults.DescribeFeedGenerator.success,
    'GetFeedSkeleton Endpoint': xrpcResults.GetFeedSkeleton.success,
    'Feed Generator Record': feedRecordResult.success,
    'DID Resolution': didResolutionResult.success,
  }

  let allPassed = true

  for (const [check, passed] of Object.entries(allChecks)) {
    if (passed) {
      log.success(`${check}: Passed`)
    } else {
      log.error(`${check}: Failed`)
      allPassed = false
    }
  }

  if (allPassed) {
    log.success('\nAll checks passed! The Swarm system is healthy.')
  } else {
    log.error('\nSome checks failed. Please review the issues above.')

    log.section('Troubleshooting Tips')
    log.info(
      '1. If the Feed Generator Service is down, check the Render dashboard for errors.',
    )
    log.info(
      '2. If the DID document is missing or incorrect, ensure the .well-known/did.json file is properly configured.',
    )
    log.info(
      '3. If XRPC endpoints are failing, check the server logs for errors.',
    )
    log.info(
      '4. If the Feed Generator Record is incorrect, run the updateFeedGenDid.js script to update it.',
    )
    log.info(
      '5. Remember that Render free tier services spin down after inactivity. The first request may take some time to process.',
    )
    log.info(
      '6. After deploying to Render, wait a few minutes for all services to fully initialize before running this health check.',
    )
  }
}

// Run the health check
runHealthCheck().catch(error => {
  log.error(`Unhandled error during health check: ${error.message}`)
  process.exit(1)
})
