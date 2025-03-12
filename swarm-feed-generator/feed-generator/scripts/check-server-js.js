const fs = require('fs')
const path = require('path')

console.log('=== CHECKING SERVER.JS FILE ===')
console.log('Current working directory:', process.cwd())
console.log('Script execution timestamp:', new Date().toISOString())

// Check if the dist directory exists
const distDir = path.join(process.cwd(), 'dist')
console.log(`Checking if dist directory exists: ${fs.existsSync(distDir)}`)

// Check if the server.js file exists in the dist directory
const serverJsPath = path.join(distDir, 'server.js')
console.log(`Checking if server.js exists: ${fs.existsSync(serverJsPath)}`)

if (!fs.existsSync(serverJsPath)) {
  console.error('server.js not found in dist directory')
  process.exit(1)
}

// Read the server.js file
let serverJsContent = fs.readFileSync(serverJsPath, 'utf8')
console.log(`Read ${serverJsContent.length} bytes from server.js`)

// Check if the XRPC endpoints are included
const hasDescribeFeedGenerator = serverJsContent.includes(
  '/xrpc/app.bsky.feed.describeFeedGenerator',
)
const hasGetFeedSkeleton = serverJsContent.includes(
  '/xrpc/app.bsky.feed.getFeedSkeleton',
)
const hasXrpcTest = serverJsContent.includes('/xrpc-test')
const hasRootPath = serverJsContent.includes("app.get('/', (req, res)")

console.log('Endpoints included in server.js:')
console.log(`- describeFeedGenerator: ${hasDescribeFeedGenerator}`)
console.log(`- getFeedSkeleton: ${hasGetFeedSkeleton}`)
console.log(`- xrpc-test: ${hasXrpcTest}`)
console.log(`- root path: ${hasRootPath}`)

// If the root path handler is not included, check why
if (!hasRootPath) {
  console.log('\nRoot path handler is not included in server.js')

  // Check if the debug endpoint exists
  const debugEndpointPos = serverJsContent.indexOf("app.get('/debug'")
  if (debugEndpointPos === -1) {
    console.log('Debug endpoint not found in server.js')
  } else {
    console.log(`Debug endpoint found at position ${debugEndpointPos}`)

    // Find the end of the debug endpoint handler
    const debugEndpointEndPos = serverJsContent.indexOf('});', debugEndpointPos)
    if (debugEndpointEndPos === -1) {
      console.log('End of debug endpoint handler not found in server.js')
    } else {
      console.log(
        `End of debug endpoint handler found at position ${debugEndpointEndPos}`,
      )

      // Check the content around the debug endpoint
      const contentBeforeDebug = serverJsContent.substring(
        Math.max(0, debugEndpointPos - 100),
        debugEndpointPos,
      )
      const contentAfterDebug = serverJsContent.substring(
        debugEndpointEndPos,
        Math.min(serverJsContent.length, debugEndpointEndPos + 100),
      )

      console.log('\nContent before debug endpoint:')
      console.log(contentBeforeDebug)

      console.log('\nContent after debug endpoint:')
      console.log(contentAfterDebug)
    }
  }
}

// Check if the modify-server-on-startup.js script is being executed
console.log('\nChecking if modify-server-on-startup.js is being executed:')
const startScript = process.env.npm_lifecycle_script || 'Unknown'
console.log(`Start script: ${startScript}`)
console.log(`NODE_ENV: ${process.env.NODE_ENV}`)

console.log('\n=== SERVER.JS CHECK COMPLETE ===')
