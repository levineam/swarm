#!/usr/bin/env node

/**
 * This script checks the server logs by making a request to the debug endpoint
 * and analyzing the response to help diagnose issues with the XRPC endpoint registration.
 */

const axios = require('axios')

// Configuration
const hostname = 'swarm-feed-generator.onrender.com'
const baseUrl = `https://${hostname}`

async function checkServerLogs() {
  console.log('=== CHECKING SERVER LOGS ===')
  console.log(`Making request to ${baseUrl}/debug to get server information...`)
  
  try {
    // Get debug information
    const debugResponse = await axios.get(`${baseUrl}/debug`)
    console.log('\nServer Debug Information:')
    console.log(JSON.stringify(debugResponse.data, null, 2))
    
    // Extract environment variables
    const env = debugResponse.data.environment
    console.log('\nEnvironment Variables:')
    Object.keys(env).forEach(key => {
      console.log(`- ${key}: ${env[key]}`)
    })
    
    // Check paths
    const paths = debugResponse.data.paths
    console.log('\nPaths:')
    Object.keys(paths).forEach(key => {
      console.log(`- ${key}: ${paths[key]}`)
    })
    
    // Check files
    const files = debugResponse.data.files
    console.log('\nFiles:')
    Object.keys(files).forEach(key => {
      console.log(`- ${key}: ${files[key]}`)
    })
    
    // Check DID document
    const didDocument = debugResponse.data.didDocument
    console.log('\nDID Document:')
    console.log(JSON.stringify(didDocument, null, 2))
    
    // Check available routes
    console.log('\nChecking available routes...')
    try {
      // Make a request to a non-existent route to get the available routes
      const routesResponse = await axios.get(`${baseUrl}/non-existent-route`)
      console.log('Available routes:', routesResponse.data.availableRoutes)
    } catch (error) {
      if (error.response && error.response.data && error.response.data.availableRoutes) {
        console.log('Available routes:', error.response.data.availableRoutes)
      } else {
        console.error('Error getting available routes:', error.message)
      }
    }
    
    // Analyze the results
    console.log('\n=== ANALYSIS ===')
    
    // Check if the XRPC router is being added to the Express app
    if (debugResponse.data.availableRoutes && debugResponse.data.availableRoutes.some(route => route.startsWith('/xrpc'))) {
      console.log('✅ XRPC router is being added to the Express app')
    } else {
      console.log('❌ XRPC router is NOT being added to the Express app')
      console.log('   This suggests that there might be an issue with how the XRPC server is being created or how the routes are being registered.')
    }
    
    // Check if the DID document is being served correctly
    if (files.didJsonExists) {
      console.log('✅ DID document exists and is being served correctly')
    } else {
      console.log('❌ DID document does NOT exist or is NOT being served correctly')
    }
    
    // Check if the environment variables are set correctly
    if (env.FEEDGEN_HOSTNAME && env.FEEDGEN_SERVICE_DID && env.FEEDGEN_PUBLISHER_DID) {
      console.log('✅ Environment variables are set correctly')
    } else {
      console.log('❌ Environment variables are NOT set correctly')
    }
    
    // Provide recommendations
    console.log('\n=== RECOMMENDATIONS ===')
    console.log('1. Check the server.ts file to ensure that the XRPC router is being added to the Express app correctly')
    console.log('2. Check the feed-generation.ts and describe-generator.ts files to ensure that the endpoints are being registered correctly')
    console.log('3. Check the logs on Render.com for any errors during startup')
    console.log('4. Try redeploying the service with the updated code')
    
  } catch (error) {
    console.error('Error checking server logs:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
  }
}

// Run the script
checkServerLogs().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
}) 