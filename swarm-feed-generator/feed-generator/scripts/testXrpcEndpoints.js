#!/usr/bin/env node

/**
 * This script tests the XRPC endpoints of the feed generator.
 * It makes requests to various endpoints to check if they are working correctly.
 */

const axios = require('axios')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Configuration
const hostname =
  process.env.FEEDGEN_HOSTNAME || 'swarm-feed-generator.onrender.com'
const publisherDid =
  process.env.FEEDGEN_PUBLISHER_DID || 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'
const feedRkey = 'swarm-community'

console.log('=== TESTING XRPC ENDPOINTS ===')
console.log('Base URL:', hostname)
console.log('Publisher DID:', publisherDid)

// Helper function for logging
function log(message) {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp} - ${message}`)
}

// Helper function to make HTTP requests with error handling
async function makeRequest(url, description) {
  log(`Testing ${description}: ${url}`)
  try {
    const response = await axios.get(url)
    log(`✅ ${description} - Status: ${response.status}`)
    log(`Response data: ${JSON.stringify(response.data, null, 2)}`)
    return { success: true, status: response.status, data: response.data }
  } catch (error) {
    if (error.response) {
      log(`❌ ${description} - Status: ${error.response.status}`)
      log(`Error response: ${JSON.stringify(error.response.data, null, 2)}`)
      return {
        success: false,
        status: error.response.status,
        error: error.response.data,
      }
    } else {
      log(`❌ ${description} - Error: ${error.message}`)
      return { success: false, error: error.message }
    }
  }
}

// Main function to run all tests
async function runTests() {
  log('=== STARTING XRPC ENDPOINT TESTS ===')
  log(`Using hostname: ${hostname}`)
  log(`Using publisher DID: ${publisherDid}`)

  // Test 1: Check if the service is running
  const healthResult = await makeRequest(
    `https://${hostname}/health`,
    'Health endpoint',
  )

  // Test 2: Check the debug endpoint
  const debugResult = await makeRequest(
    `https://${hostname}/debug`,
    'Debug endpoint',
  )

  // Test 3: Check the DID document
  const didDocResult = await makeRequest(
    `https://${hostname}/.well-known/did.json`,
    'DID document',
  )

  // Test 4: Check the XRPC root endpoint
  const xrpcRootResult = await makeRequest(
    `https://${hostname}/xrpc`,
    'XRPC root endpoint',
  )

  // Test 5: Check the app.bsky.feed endpoint
  const bskyFeedResult = await makeRequest(
    `https://${hostname}/xrpc/app.bsky.feed`,
    'app.bsky.feed endpoint',
  )

  // Test 6: Check the describeFeedGenerator endpoint
  const describeGenResult = await makeRequest(
    `https://${hostname}/xrpc/app.bsky.feed.describeFeedGenerator`,
    'describeFeedGenerator endpoint',
  )

  // Test 7: Check the getFeedSkeleton endpoint with a valid feed
  const feedUri = `at://${publisherDid}/app.bsky.feed.generator/${feedRkey}`
  const getFeedResult = await makeRequest(
    `https://${hostname}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
      feedUri,
    )}`,
    'getFeedSkeleton endpoint',
  )

  // Summary
  log('\n=== TEST SUMMARY ===')
  log(`Health endpoint: ${healthResult.success ? '✅ OK' : '❌ Failed'}`)
  log(`Debug endpoint: ${debugResult.success ? '✅ OK' : '❌ Failed'}`)
  log(`DID document: ${didDocResult.success ? '✅ OK' : '❌ Failed'}`)
  log(`XRPC root endpoint: ${xrpcRootResult.success ? '✅ OK' : '❌ Failed'}`)
  log(
    `app.bsky.feed endpoint: ${bskyFeedResult.success ? '✅ OK' : '❌ Failed'}`,
  )
  log(
    `describeFeedGenerator endpoint: ${
      describeGenResult.success ? '✅ OK' : '❌ Failed'
    }`,
  )
  log(
    `getFeedSkeleton endpoint: ${
      getFeedResult.success ? '✅ OK' : '❌ Failed'
    }`,
  )
}

// Run the tests
runTests().catch((error) => {
  log(`Unhandled error: ${error}`)
  process.exit(1)
})
