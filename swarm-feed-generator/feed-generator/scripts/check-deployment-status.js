const axios = require('axios')

console.log('=== CHECKING DEPLOYMENT STATUS ===')
console.log('Timestamp:', new Date().toISOString())

const BASE_URL = 'https://swarm-feed-generator.onrender.com'

async function checkEndpoint(endpoint, description) {
  console.log(`\nChecking ${description} at ${endpoint}...`)
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 10000,
    })
    console.log(`Status: ${response.status}`)
    if (typeof response.data === 'object') {
      console.log('Response data:', JSON.stringify(response.data, null, 2))
    } else {
      console.log(`Response length: ${response.data.length} characters`)
      if (response.data.length < 200) {
        console.log('Response data:', response.data)
      } else {
        console.log(
          'Response data (truncated):',
          response.data.substring(0, 200) + '...',
        )
      }
    }
    return { success: true, status: response.status, data: response.data }
  } catch (error) {
    console.error(`Error: ${error.message}`)
    if (error.response) {
      console.log(`Status: ${error.response.status}`)
      console.log('Response data:', error.response.data)
    }
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
    }
  }
}

async function checkDeployment() {
  // Check health endpoint
  const healthResult = await checkEndpoint('/health', 'health endpoint')

  // Check debug endpoint
  const debugResult = await checkEndpoint('/debug', 'debug endpoint')

  // Check root path
  const rootResult = await checkEndpoint('/', 'root path')

  // Check XRPC endpoints
  const describeFeedResult = await checkEndpoint(
    '/xrpc/app.bsky.feed.describeFeedGenerator',
    'describeFeedGenerator endpoint',
  )
  const getFeedSkeletonResult = await checkEndpoint(
    '/xrpc/app.bsky.feed.getFeedSkeleton',
    'getFeedSkeleton endpoint',
  )

  // Check if the deployment has been updated with our changes
  console.log('\n=== DEPLOYMENT STATUS SUMMARY ===')
  console.log(`Health endpoint: ${healthResult.success ? 'OK' : 'FAIL'}`)
  console.log(`Debug endpoint: ${debugResult.success ? 'OK' : 'FAIL'}`)
  console.log(`Root path: ${rootResult.success ? 'OK' : 'FAIL'}`)
  console.log(
    `describeFeedGenerator endpoint: ${
      describeFeedResult.success ? 'OK' : 'FAIL'
    }`,
  )
  console.log(
    `getFeedSkeleton endpoint: ${
      getFeedSkeletonResult.success ? 'OK' : 'FAIL'
    }`,
  )

  // Check if the root path handler has been added
  const rootPathAdded =
    rootResult.success &&
    rootResult.status === 200 &&
    typeof rootResult.data === 'string' &&
    rootResult.data.includes('Swarm Feed Generator')

  console.log(`\nRoot path handler added: ${rootPathAdded ? 'YES' : 'NO'}`)

  if (rootPathAdded) {
    console.log('\nThe deployment has been updated with our changes!')
    console.log('The root path handler is now working correctly.')
  } else {
    console.log('\nThe deployment has not been updated with our changes yet.')
    console.log('It may take some time for the changes to be deployed.')
    console.log(
      'You can check the Render logs to see if the deployment is in progress.',
    )
  }

  console.log('\n=== DEPLOYMENT CHECK COMPLETE ===')
}

// Run the check
checkDeployment().catch((error) => {
  console.error('Error checking deployment:', error.message)
})
