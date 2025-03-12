const axios = require('axios')

console.log('=== CHECKING DEPLOYMENT STATUS ===')
console.log(`Timestamp: ${new Date().toISOString()}`)
console.log('')

const BASE_URL = 'https://swarm-feed-generator.onrender.com'

/**
 * Check a specific endpoint and return the response
 * @param {string} endpoint - The endpoint to check
 * @param {string} description - Description of what we're checking
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} - The response data and status
 */
async function checkEndpoint(endpoint, description, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  console.log(`Checking ${description} at ${endpoint}...`)

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status code
      ...options,
    })

    console.log(`Status: ${response.status}`)

    if (typeof response.data === 'string') {
      console.log(`Response length: ${response.data.length} characters`)
    }

    if (typeof response.data === 'object') {
      console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`)
    } else {
      console.log(`Response data: ${response.data}`)
    }

    return {
      status: response.status,
      data: response.data,
      success: response.status >= 200 && response.status < 300,
    }
  } catch (error) {
    console.log(`Error: ${error.message}`)

    if (error.response) {
      console.log(`Status: ${error.response.status}`)
      console.log(
        `Response data: ${
          typeof error.response.data === 'object'
            ? JSON.stringify(error.response.data, null, 2)
            : error.response.data
        }`,
      )

      return {
        status: error.response.status,
        data: error.response.data,
        success: false,
        error: error.message,
      }
    }

    return {
      status: 0,
      data: null,
      success: false,
      error: error.message,
    }
  }
}

/**
 * Check the deployment status of all endpoints
 */
async function checkDeployment() {
  try {
    // Check health endpoint
    const healthResult = await checkEndpoint('/health', 'health endpoint')
    console.log('')

    // Check debug endpoint
    const debugResult = await checkEndpoint('/debug', 'debug endpoint')
    console.log('')

    // Check root path
    const rootResult = await checkEndpoint('/', 'root path')
    console.log('')

    // Check describeFeedGenerator endpoint
    const describeResult = await checkEndpoint(
      '/xrpc/app.bsky.feed.describeFeedGenerator',
      'describeFeedGenerator endpoint',
    )
    console.log('')

    // Check getFeedSkeleton endpoint
    const skeletonResult = await checkEndpoint(
      '/xrpc/app.bsky.feed.getFeedSkeleton',
      'getFeedSkeleton endpoint',
      {
        params: {
          feed: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community',
          limit: 2,
        },
      },
    )
    console.log('')

    // Check if the root path handler has been added
    const rootPathHandlerAdded =
      rootResult.success &&
      typeof rootResult.data === 'string' &&
      rootResult.data.includes('Swarm Feed Generator')

    // Print summary
    console.log('=== DEPLOYMENT STATUS SUMMARY ===')
    console.log(`Health endpoint: ${healthResult.success ? 'OK' : 'FAIL'}`)
    console.log(`Debug endpoint: ${debugResult.success ? 'OK' : 'FAIL'}`)
    console.log(`Root path: ${rootResult.success ? 'OK' : 'FAIL'}`)
    console.log(
      `describeFeedGenerator endpoint: ${
        describeResult.success ? 'OK' : 'FAIL'
      }`,
    )
    console.log(
      `getFeedSkeleton endpoint: ${skeletonResult.success ? 'OK' : 'FAIL'}`,
    )
    console.log('')
    console.log(
      `Root path handler added: ${rootPathHandlerAdded ? 'YES' : 'NO'}`,
    )
    console.log('')

    if (!rootPathHandlerAdded) {
      console.log('The deployment has not been updated with our changes yet.')
      console.log('It may take some time for the changes to be deployed.')
      console.log(
        'You can check the Render logs to see if the deployment is in progress.',
      )
    } else {
      console.log('The deployment has been updated with our changes!')
      console.log('The root path handler is now working correctly.')
    }

    // Try to get the git commit hash if available
    if (debugResult.success && debugResult.data && debugResult.data.gitCommit) {
      console.log(`\nDeployed Git Commit: ${debugResult.data.gitCommit}`)
    }

    // Check if all endpoints are working
    const allEndpointsWorking =
      healthResult.success &&
      debugResult.success &&
      rootResult.success &&
      describeResult.success &&
      skeletonResult.success

    console.log(
      `\nAll endpoints working: ${allEndpointsWorking ? 'YES' : 'NO'}`,
    )
  } catch (error) {
    console.error('Error checking deployment:', error.message)
  }

  console.log('\n=== DEPLOYMENT CHECK COMPLETE ===')
}

// Run the deployment check
checkDeployment()
