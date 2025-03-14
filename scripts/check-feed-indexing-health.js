// scripts/check-feed-indexing-health.js
// This script checks the health of the feed generator service
// For more information, see .cursor/instructions/feed-indexing-troubleshooting-guide.md

const https = require('https')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Utility logging functions
const info = message => console.log(`ℹ️ ${message}`)
const success = message => console.log(`✅ ${message}`)
const warning = message => console.log(`⚠️ ${message}`)
const error = message => console.log(`❌ ${message}`)

// Feed generator service configuration
const FEED_GENERATOR_URL =
  process.env.FEED_GENERATOR_URL || 'https://swarm-feed-generator.onrender.com'
const SERVICE_DID =
  process.env.FEEDGEN_SERVICE_DID || 'did:web:swarm-feed-generator.onrender.com'
const PUBLISHER_DID =
  process.env.FEEDGEN_PUBLISHER_DID || 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'
const FEED_URI = `at://${PUBLISHER_DID}/app.bsky.feed.generator/swarm-community`

// List of endpoints to check
const endpoints = [
  {url: '/', name: 'Root endpoint'},
  {url: '/health', name: 'Health endpoint'},
  {url: '/.well-known/did.json', name: 'DID document'},
  {
    url: '/xrpc/app.bsky.feed.describeFeedGenerator',
    name: 'Feed description endpoint',
  },
  {
    url: `/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
      FEED_URI,
    )}`,
    name: 'Feed skeleton endpoint',
  },
]

// Function to make a request to an endpoint
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${FEED_GENERATOR_URL}${endpoint.url}`
    const startTime = Date.now()

    info(`Checking ${endpoint.name} at ${url}...`)

    const req = https.get(url, res => {
      const duration = Date.now() - startTime
      let responseData = ''

      res.on('data', chunk => {
        responseData += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          success(
            `${endpoint.name} is responding with ${res.statusCode} (${duration}ms)`,
          )

          // Parse and show summary of response data if it's JSON
          try {
            const data = JSON.parse(responseData)
            if (endpoint.url.includes('getFeedSkeleton') && data.feed) {
              info(`Feed contains ${data.feed.length} posts`)
            } else if (
              endpoint.url.includes('describeFeedGenerator') &&
              data.did
            ) {
              info(`Feed generator DID: ${data.did}`)
              if (data.did !== SERVICE_DID) {
                warning(
                  `DID mismatch! Expected: ${SERVICE_DID}, Got: ${data.did}`,
                )
              }
            }
          } catch (e) {
            // Not JSON or couldn't parse
          }

          resolve({
            endpoint,
            success: true,
            statusCode: res.statusCode,
            duration,
          })
        } else {
          error(
            `${endpoint.name} responded with ${res.statusCode}: ${responseData}`,
          )
          resolve({
            endpoint,
            success: false,
            statusCode: res.statusCode,
            duration,
          })
        }
      })
    })

    req.on('error', e => {
      error(`Error checking ${endpoint.name}: ${e.message}`)
      resolve({endpoint, success: false, error: e.message})
    })

    // Set a timeout of 30 seconds
    req.setTimeout(30000, () => {
      error(`Timeout checking ${endpoint.name}`)
      req.abort()
      resolve({endpoint, success: false, error: 'Timeout'})
    })

    req.end()
  })
}

// Function to check PLC directory
function checkPlcDirectory() {
  return new Promise((resolve, reject) => {
    const url = `https://plc.directory/${SERVICE_DID}`
    const startTime = Date.now()

    info(`Checking PLC directory resolution at ${url}...`)

    const req = https.get(url, res => {
      const duration = Date.now() - startTime
      let responseData = ''

      res.on('data', chunk => {
        responseData += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          success(`PLC directory is resolving the DID (${duration}ms)`)
          resolve({success: true, statusCode: res.statusCode, duration})
        } else {
          error(
            `PLC directory responded with ${res.statusCode}: ${responseData}`,
          )
          resolve({success: false, statusCode: res.statusCode, duration})
        }
      })
    })

    req.on('error', e => {
      error(`Error checking PLC directory: ${e.message}`)
      resolve({success: false, error: e.message})
    })

    // Set a timeout of 30 seconds
    req.setTimeout(30000, () => {
      error(`Timeout checking PLC directory`)
      req.abort()
      resolve({success: false, error: 'Timeout'})
    })

    req.end()
  })
}

// Main function to check all endpoints
async function checkServiceHealth() {
  info('=== Swarm Feed Generator Health Check ===')
  info(`Service URL: ${FEED_GENERATOR_URL}`)
  info(`Service DID: ${SERVICE_DID}`)
  info(`Publisher DID: ${PUBLISHER_DID}`)
  info(`Feed URI: ${FEED_URI}`)
  info('=======================================')

  // Check PLC directory
  await checkPlcDirectory()

  // Check all endpoints
  const results = await Promise.all(
    endpoints.map(endpoint => makeRequest(endpoint)),
  )

  // Summarize results
  info('=======================================')
  info('Health Check Summary:')

  const successCount = results.filter(r => r.success).length
  if (successCount === endpoints.length) {
    success('All endpoints are healthy! 🎉')
  } else {
    warning(`${successCount}/${endpoints.length} endpoints are healthy`)

    // List failing endpoints
    const failingEndpoints = results.filter(r => !r.success)
    if (failingEndpoints.length > 0) {
      error('Failing endpoints:')
      failingEndpoints.forEach(r => {
        error(
          `- ${r.endpoint.name}: ${r.error || `Status code ${r.statusCode}`}`,
        )
      })
    }
  }

  // Provide recommendations
  info('=======================================')
  info('Recommendations:')

  if (results.some(r => !r.success)) {
    if (results.every(r => !r.success)) {
      error('The service appears to be down or hibernating. Try:')
      info('1. Check if the service is deployed on Render')
      info('2. Manually restart the service via the Render dashboard')
      info('3. Run the keep-service-active.js script to prevent hibernation')
    } else {
      warning('Some endpoints are not responding. Try:')
      info('1. Wait a few minutes for the service to fully initialize')
      info('2. Restart the service using restart-render-service.js')
      info('3. Check the Render logs for errors')
    }
  } else {
    if (
      results.some(r => r.endpoint.url.includes('getFeedSkeleton') && r.success)
    ) {
      info(
        '1. Run test-feed-indexing.js to verify your posts are being indexed',
      )
      info(
        '2. If posts are not appearing in the feed, try restarting the service',
      )
      info('3. Set up a keep-service-active.js cron job to prevent hibernation')
    }
  }

  info('=======================================')
}

// Run the health check
checkServiceHealth().catch(err => {
  error(`Unexpected error: ${err.message}`)
  if (err.stack) {
    console.error(err.stack)
  }
})
