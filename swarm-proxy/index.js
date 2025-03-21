import {Buffer} from 'node:buffer'

import cors from 'cors'
import express from 'express'
import fetch from 'node-fetch'

const app = express()
const PORT = process.env.PORT || 3000
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'

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
  const url = `${FEED_GENERATOR_URL}${req.originalUrl}`
  console.log(`Forwarding request to: ${url}`)

  try {
    // Create headers object without host, connection, etc.
    const headers = {...req.headers}
    delete headers.host
    delete headers.connection
    delete headers['content-length']

    // Add explicit accept header if not present
    if (!headers.accept) {
      headers.accept = 'application/json'
    }

    // Forward the request to the feed generator
    const response = await fetch(url, {
      method: req.method,
      headers: headers,
      body:
        req.method !== 'GET' && req.method !== 'HEAD' && req.body
          ? JSON.stringify(req.body)
          : undefined,
    })

    console.log(`Received response with status: ${response.status}`)

    // Set status code from the feed generator response
    res.status(response.status)

    // Get all headers from the response
    const responseHeaders = Object.fromEntries(response.headers.entries())
    console.log('Response headers:', responseHeaders)

    // Forward headers from the feed generator response
    for (const [key, value] of response.headers) {
      // Skip setting headers that would conflict with CORS headers
      if (
        ![
          'access-control-allow-origin',
          'access-control-allow-methods',
          'access-control-allow-headers',
          'access-control-allow-credentials',
          'access-control-max-age',
        ].includes(key.toLowerCase())
      ) {
        res.setHeader(key, value)
      }
    }

    // Send the response body
    const data = await response.arrayBuffer()
    const contentType =
      response.headers.get('content-type') || 'application/json'
    res.setHeader('Content-Type', contentType)

    res.send(Buffer.from(data))
    console.log('Response sent successfully')
  } catch (error) {
    console.error('Proxy error:', error)
    // Still maintain CORS headers even in error response
    res.status(500).json({
      error: 'Error proxying request to feed generator',
      message: error.message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`CORS Proxy server running on port ${PORT}`)
  console.log(`Proxying requests to: ${FEED_GENERATOR_URL}`)
})
