#!/usr/bin/env node

/**
 * This script tests the XRPC endpoints of the feed generator.
 * It makes requests to various endpoints to check if they are working correctly.
 */

const axios = require('axios')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Get the hostname from environment variables
const hostname =
  process.env.FEEDGEN_HOSTNAME || 'swarm-feed-generator.onrender.com'
const publisherDid =
  process.env.FEEDGEN_PUBLISHER_DID || 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'
const baseUrl = `https://${hostname}`

console.log('=== TESTING XRPC ENDPOINTS ===')
console.log('Base URL:', baseUrl)
console.log('Publisher DID:', publisherDid)

// Function to make a request and log the response
async function testEndpoint(endpoint, params = {}) {
  const url = `${baseUrl}${endpoint}`
  console.log(`\nTesting endpoint: ${url}`)
  console.log('Params:', params)

  try {
    const response = await axios.get(url, { params })
    console.log('Status:', response.status)
    console.log('Headers:', response.headers)
    console.log('Data:', JSON.stringify(response.data, null, 2))
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Error:', error.message)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Headers:', error.response.headers)
      console.error('Data:', error.response.data)
    }
    return { success: false, error }
  }
}

// Main function to run all tests
async function runTests() {
  console.log('\n=== TESTING BASIC ENDPOINTS ===')

  // Test health endpoint
  await testEndpoint('/health')

  // Test debug endpoint
  await testEndpoint('/debug')

  // Test DID document
  await testEndpoint('/.well-known/did.json')

  // Test XRPC test endpoint
  await testEndpoint('/xrpc-test')

  console.log('\n=== TESTING XRPC ENDPOINTS ===')

  // Test describeFeedGenerator endpoint
  await testEndpoint('/xrpc/app.bsky.feed.describeFeedGenerator')

  // Test getFeedSkeleton endpoint with swarm-community feed
  await testEndpoint('/xrpc/app.bsky.feed.getFeedSkeleton', {
    feed: `at://${publisherDid}/app.bsky.feed.generator/swarm-community`,
  })

  // Test getFeedSkeleton endpoint with swarm-trending feed
  await testEndpoint('/xrpc/app.bsky.feed.getFeedSkeleton', {
    feed: `at://${publisherDid}/app.bsky.feed.generator/swarm-trending`,
  })

  console.log('\n=== TESTING COMPLETED ===')
}

// Run the tests
runTests().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
