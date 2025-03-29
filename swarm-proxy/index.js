const express = require('express')
const axios = require('axios')
const cors = require('cors')
const {Buffer} = require('node:buffer')
const fetch = require('node-fetch')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000
const FEED_GENERATOR_URL = process.env.FEED_GENERATOR_URL || 'https://swarm-feed-generator.onrender.com'

if (!FEED_GENERATOR_URL) {
  console.error('Error: FEED_GENERATOR_URL environment variable is not set.')
  process.exit(1)
}

console.log(`Starting CORS proxy for target: ${FEED_GENERATOR_URL}`)

// Configure CORS middleware
app.use(
  cors({
    origin: [
      'https://bsky.app',
      'http://localhost:8080',
      'http://localhost:19006',
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }),
)

// Always set CORS headers even for errors
app.use((req, res, next) => {
  // Set CORS headers manually for additional assurance
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept',
  )
  res.header('Access-Control-Allow-Credentials', 'true')

  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  next()
})

// Parse JSON bodies
app.use(express.json())

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  console.log(`Origin: ${req.headers.origin || 'not provided'}`)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  next()
})

// Proxy all requests to the feed generator
app.all('*', async (req, res) => {
  const targetPath = req.originalUrl
  const url = `${FEED_GENERATOR_URL}${targetPath}`

  console.log(`\n--- Incoming Request ---`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`Method: ${req.method}`)
  console.log(`Path: ${targetPath}`)
  console.log(`Origin: ${req.headers.origin}`)
  console.log('Incoming Headers:', JSON.stringify(req.headers, null, 2))

  const headers = {
    // Forward essential headers
    'Accept': req.headers.accept || 'application/json', // Default to application/json
    'Content-Type': req.headers['content-type'] || 'application/json', 
    'User-Agent': req.headers['user-agent'],
  }

  // Forward Authorization header if present
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization
  }
  
  // Add Bluesky specific headers if present
  if (req.headers['atproto-proxy']) {
    headers['atproto-proxy'] = req.headers['atproto-proxy']
  }
  if (req.headers['x-atproto-accept-labelers']) {
    headers['x-atproto-accept-labelers'] = req.headers['x-atproto-accept-labelers']
  }

  console.log(`\n--- Forwarding Request ---`)
  console.log(`Target URL: ${url}`)
  console.log('Forwarding Headers:', JSON.stringify(headers, null, 2))

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
      // Important: Don't automatically redirect, let the client handle it
      redirect: 'manual' 
    })

    console.log(`\n--- Received Response ---`)
    console.log(`Status: ${response.status}`)
    console.log(`Status Text: ${response.statusText}`)
    console.log('Response Headers:', JSON.stringify(response.headers.raw(), null, 2))

    // Forward the response status, headers, and body
    res.status(response.status)
    
    // Copy all headers from the target response to the proxy response
    // Ensure CORS headers are present (though cors() middleware should handle most)
    res.setHeader('Access-Control-Allow-Origin', '*')
    response.headers.forEach((value, name) => {
      // Avoid setting headers that cause issues (like content-encoding if body is transformed)
      if (name.toLowerCase() !== 'content-encoding' && name.toLowerCase() !== 'transfer-encoding') {
         res.setHeader(name, value)
      }
    })

    // Pipe the response body
    response.body.pipe(res)

  } catch (error) {
    console.error(`\n--- Proxy Error ---`)
    console.error(`Timestamp: ${new Date().toISOString()}`)
    console.error('Error fetching from target:', error)
    res.status(502).send('Proxy error: Unable to connect to the target service.')
  }
})

// Direct Feed Generator Proxy Route
app.get('/feed/getFeedSkeleton', async (req, res) => {
  try {
    // Extract query parameters
    const params = new URLSearchParams()
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value)
      }
    })
    
    // Build URL for the feed generator
    const url = `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.getFeedSkeleton?${params.toString()}`
    
    console.log(`[${new Date().toISOString()}] Proxying feed request to: ${url}`)
    
    // Make request to feed generator
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Swarm-Feed-Proxy',
      },
      validateStatus: () => true, // Don't throw on non-2xx status
    })
    
    // Copy status and headers from feed generator response
    res.status(response.status)
    
    // Copy content type from original response
    if (response.headers['content-type']) {
      res.header('Content-Type', String(response.headers['content-type']))
    }
    
    // Send the body of the response
    res.send(response.data)
    
    console.log(`[${new Date().toISOString()}] Proxied feed response status: ${response.status}`)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error proxying feed request:`, error.message)
    
    res.status(500).json({
      error: 'ProxyError',
      message: `Error proxying feed request: ${error.message || 'Unknown error'}`
    })
  }
})

// Handle OPTIONS requests for direct, explicit CORS support
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Origin')
  res.sendStatus(200)
})

// Base proxy handler for all feed generator API endpoints
app.all('/xrpc/*', async (req, res) => {
  try {
    const targetUrl = `${FEED_GENERATOR_URL}${req.url}`
    console.log(`[${new Date().toISOString()}] Proxying ${req.method} request to: ${targetUrl}`)
    
    // Prepare headers and forward as much as possible from the original request
    const headers = {
      ...req.headers,
    }
    
    // Remove headers that should be set by axios or might cause issues
    delete headers.host
    delete headers.connection
    delete headers['content-length']
    
    // Set up configuration for the request
    const config = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      validateStatus: () => true, // Don't throw on error status codes
    }
    
    // Include body for POST requests
    if (req.method === 'POST' && req.body) {
      config.data = req.body
    }
    
    // Make the request to the feed generator
    const response = await axios(config)
    
    // Set response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      // Avoid setting headers that might conflict with Express's own handling
      if (!['connection', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.set(key, value)
      }
    })
    
    // Always ensure CORS headers are present
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Origin')
    
    // Set status code and send response
    res.status(response.status).send(response.data)
    
    console.log(`[${new Date().toISOString()}] Proxied response status: ${response.status}`)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Proxy error:`, error.message)
    
    // Ensure CORS headers are present even on error
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Origin')
    
    res.status(500).json({
      error: 'ProxyError',
      message: `Failed to proxy request: ${error.message}`
    })
  }
})

// Simple status endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Swarm CORS Proxy',
    timestamp: new Date().toISOString(),
    feedGeneratorUrl: FEED_GENERATOR_URL
  })
})

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Proxy server running on port ${PORT}`)
  console.log(`[${new Date().toISOString()}] Proxying requests to: ${FEED_GENERATOR_URL}`)
})
