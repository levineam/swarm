// scripts/restart-render-service.js
// This script restarts a service on Render.com

const https = require('https')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Utility logging functions
const info = message => console.log(`ℹ️ ${message}`)
const success = message => console.log(`✅ ${message}`)
const warning = message => console.log(`⚠️ ${message}`)
const error = message => console.log(`❌ ${message}`)

// Render API configuration
const RENDER_API_KEY = process.env.RENDER_API_KEY
const SERVICE_ID = process.env.RENDER_SERVICE_ID || 'srv-cqvnvvs1hbls73f0iqr0' // Default to feed generator service ID

if (!RENDER_API_KEY) {
  error('RENDER_API_KEY environment variable is required')
  info(
    'Please set it in your .env file or provide it as an environment variable',
  )
  process.exit(1)
}

// Function to make a request to the Render API
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(options, res => {
      let responseData = ''

      res.on('data', chunk => {
        responseData += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = responseData ? JSON.parse(responseData) : {}
            resolve({statusCode: res.statusCode, data: parsedData})
          } catch (e) {
            resolve({statusCode: res.statusCode, data: responseData})
          }
        } else {
          reject(
            new Error(
              `Request failed with status code ${res.statusCode}: ${responseData}`,
            ),
          )
        }
      })
    })

    req.on('error', e => {
      reject(new Error(`Request error: ${e.message}`))
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

// Function to restart a service
async function restartService() {
  try {
    info(`Restarting service with ID: ${SERVICE_ID}`)

    // First, get the current service status
    const serviceResponse = await makeRequest(
      'GET',
      `/v1/services/${SERVICE_ID}`,
    )
    info(
      `Current service status: ${
        serviceResponse.data.service?.suspenders?.suspended
          ? 'Suspended'
          : 'Active'
      }`,
    )

    // Trigger a manual deploy to restart the service
    const deployResponse = await makeRequest(
      'POST',
      `/v1/services/${SERVICE_ID}/deploys`,
    )

    success(`Deployment triggered successfully!`)
    info(`Deployment ID: ${deployResponse.data.deploy?.id}`)
    info(`Status: ${deployResponse.data.deploy?.status}`)

    // Poll for deployment status
    info('Waiting for deployment to complete...')
    let deployStatus = deployResponse.data.deploy?.status
    let deployId = deployResponse.data.deploy?.id

    while (deployStatus === 'created' || deployStatus === 'build_in_progress') {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

      const statusResponse = await makeRequest(
        'GET',
        `/v1/services/${SERVICE_ID}/deploys/${deployId}`,
      )
      deployStatus = statusResponse.data.deploy?.status

      info(`Current deployment status: ${deployStatus}`)
    }

    if (deployStatus === 'live') {
      success('Service restarted successfully!')
      info('The feed generator should now be running with a fresh instance')
      info(
        'Please wait a few minutes for it to fully initialize and connect to the firehose',
      )
    } else {
      warning(`Deployment completed with status: ${deployStatus}`)
      info('Please check the Render dashboard for more details')
    }
  } catch (err) {
    error(`Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack)
    }
    info('Please check your Render API key and service ID')
    info('You can also restart the service manually from the Render dashboard')
  }
}

restartService()
