const axios = require('axios')

const BASE_URL = 'https://swarm-feed-generator.onrender.com'

async function checkEndpoint(url) {
  try {
    console.log(`Checking ${url}...`)
    const response = await axios.get(url, { timeout: 10000 })
    console.log(`Status: ${response.status}`)
    console.log('Response data:', JSON.stringify(response.data, null, 2))
    return true
  } catch (error) {
    console.error(`Error checking ${url}:`, error.message)
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
  console.log('Checking Render.com deployment status...')

  // Check health endpoint
  const healthStatus = await checkEndpoint(`${BASE_URL}/health`)

  if (!healthStatus) {
    console.log(
      '\nThe service appears to be down or hibernated. Try visiting the health endpoint in a browser to wake it up:',
    )
    console.log(`${BASE_URL}/health`)
    return
  }

  // Check debug endpoint
  await checkEndpoint(`${BASE_URL}/debug`)

  // Check DID document
  await checkEndpoint(`${BASE_URL}/.well-known/did.json`)

  // Check XRPC test endpoint
  await checkEndpoint(`${BASE_URL}/xrpc-test`)

  // Check describeFeedGenerator endpoint
  await checkEndpoint(`${BASE_URL}/xrpc/app.bsky.feed.describeFeedGenerator`)

  // Check getFeedSkeleton endpoint
  await checkEndpoint(
    `${BASE_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`,
  )

  console.log('\nDeployment status check complete.')
  console.log(
    'If the XRPC endpoints are returning 404 errors, check the Render.com logs for any issues with the deployment.',
  )
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
