const fs = require('fs')
const path = require('path')

console.log('=== CHECKING RENDER DEPLOYMENT ===')
console.log('Current working directory:', process.cwd())

// Check environment variables
console.log('\nEnvironment variables:')
console.log('- NODE_ENV:', process.env.NODE_ENV)
console.log('- RENDER:', process.env.RENDER)
console.log('- RENDER_GIT_COMMIT:', process.env.RENDER_GIT_COMMIT)
console.log('- RENDER_GIT_BRANCH:', process.env.RENDER_GIT_BRANCH)
console.log('- RENDER_SERVICE_NAME:', process.env.RENDER_SERVICE_NAME)
console.log('- FEEDGEN_HOSTNAME:', process.env.FEEDGEN_HOSTNAME)
console.log('- FEEDGEN_SERVICE_DID:', process.env.FEEDGEN_SERVICE_DID)

// Check if the dist directory exists
const distDir = path.join(process.cwd(), 'dist')
console.log('\nChecking if dist directory exists:', fs.existsSync(distDir))

// Check if the server.js file exists in the dist directory
const serverJsPath = path.join(distDir, 'server.js')
console.log('Checking if server.js exists:', fs.existsSync(serverJsPath))

// Check the content of the server.js file
if (fs.existsSync(serverJsPath)) {
  const serverJsContent = fs.readFileSync(serverJsPath, 'utf8')

  // Check if the direct XRPC endpoints are included
  const hasDescribeFeedGenerator = serverJsContent.includes(
    '/xrpc/app.bsky.feed.describeFeedGenerator',
  )
  const hasGetFeedSkeleton = serverJsContent.includes(
    '/xrpc/app.bsky.feed.getFeedSkeleton',
  )
  const hasXrpcTest = serverJsContent.includes('/xrpc-test')

  console.log('\nDirect XRPC endpoints included in server.js:')
  console.log('- describeFeedGenerator:', hasDescribeFeedGenerator)
  console.log('- getFeedSkeleton:', hasGetFeedSkeleton)
  console.log('- xrpc-test:', hasXrpcTest)

  // Check if there are any errors in the file
  const errorLines = serverJsContent
    .split('\n')
    .filter((line) => line.includes('ERROR:'))
  if (errorLines.length > 0) {
    console.log('\nErrors found in server.js:')
    errorLines.forEach((line) => console.log(`- ${line.trim()}`))
  }
}

// Check the available routes
console.log('\nAvailable routes:')
try {
  const app = require('../dist/server').default
  if (app && app.app && typeof app.app._router === 'object') {
    const routes = app.app._router.stack
      .filter((r) => r.route)
      .map((r) => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods).filter((m) => r.route.methods[m]),
      }))

    console.log(JSON.stringify(routes, null, 2))
  } else {
    console.log('Could not access app routes')
  }
} catch (error) {
  console.error('Error checking routes:', error.message)
}

// Add a message to help with debugging
console.log('\n=== DEPLOYMENT CHECK COMPLETE ===')
console.log(
  'If the XRPC endpoints are not included in the server.js file, try the following:',
)
console.log(
  '1. Make sure the changes are committed and pushed to the main branch',
)
console.log('2. Check if the build process is running correctly on Render.com')
console.log('3. Try manually triggering a new deployment on Render.com')
console.log(
  '4. Check the Render.com logs for any errors during the build process',
)
