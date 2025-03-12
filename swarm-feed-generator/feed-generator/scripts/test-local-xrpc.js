const axios = require('axios')

const BASE_URL = 'http://localhost:3000'

async function testEndpoint(url) {
  try {
    console.log(`Testing ${url}...`)
    const response = await axios.get(url)
    console.log(`Status: ${response.status}`)
    console.log('Response data:', JSON.stringify(response.data, null, 2))
    return true
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message)
    if (error.response) {
      console.error(`Status: ${error.response.status}`)
      console.error(
        'Response data:',
        JSON.stringify(error.response.data, null, 2),
      )
    }
    return false
  }
}

async function main() {
  console.log('Testing local XRPC endpoints...')

  // Test health endpoint
  await testEndpoint(`${BASE_URL}/health`)

  // Test debug endpoint
  await testEndpoint(`${BASE_URL}/debug`)

  // Test DID document
  await testEndpoint(`${BASE_URL}/.well-known/did.json`)

  // Test XRPC test endpoint
  await testEndpoint(`${BASE_URL}/xrpc-test`)

  // Test describeFeedGenerator endpoint
  await testEndpoint(`${BASE_URL}/xrpc/app.bsky.feed.describeFeedGenerator`)

  // Test getFeedSkeleton endpoint
  await testEndpoint(
    `${BASE_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`,
  )
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
