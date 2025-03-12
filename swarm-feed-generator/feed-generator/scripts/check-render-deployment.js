const fs = require('fs')
const path = require('path')

// Function to log messages that will be captured by the logs array in server.ts
function log(message) {
  const timestamp = new Date().toISOString()
  const logMessage = `${timestamp} - DEPLOYMENT_CHECK: ${message}`
  console.log(logMessage)
}

log('=== CHECKING RENDER DEPLOYMENT ===')
log(`Current working directory: ${process.cwd()}`)

// Check environment variables
log('\nEnvironment variables:')
log(`- NODE_ENV: ${process.env.NODE_ENV}`)
log(`- RENDER: ${process.env.RENDER}`)
log(`- RENDER_GIT_COMMIT: ${process.env.RENDER_GIT_COMMIT}`)
log(`- RENDER_GIT_BRANCH: ${process.env.RENDER_GIT_BRANCH}`)
log(`- RENDER_SERVICE_NAME: ${process.env.RENDER_SERVICE_NAME}`)
log(`- FEEDGEN_HOSTNAME: ${process.env.FEEDGEN_HOSTNAME}`)
log(`- FEEDGEN_SERVICE_DID: ${process.env.FEEDGEN_SERVICE_DID}`)

// Check if the dist directory exists
const distDir = path.join(process.cwd(), 'dist')
log(`\nChecking if dist directory exists: ${fs.existsSync(distDir)}`)

// Check if the server.js file exists in the dist directory
const serverJsPath = path.join(distDir, 'server.js')
log(`Checking if server.js exists: ${fs.existsSync(serverJsPath)}`)

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

  log('\nDirect XRPC endpoints included in server.js:')
  log(`- describeFeedGenerator: ${hasDescribeFeedGenerator}`)
  log(`- getFeedSkeleton: ${hasGetFeedSkeleton}`)
  log(`- xrpc-test: ${hasXrpcTest}`)

  // Check if there are any errors in the file
  const errorLines = serverJsContent
    .split('\n')
    .filter((line) => line.includes('ERROR:'))
  if (errorLines.length > 0) {
    log('\nErrors found in server.js:')
    errorLines.forEach((line) => log(`- ${line.trim()}`))
  }

  // Log the first 100 characters of the file to verify it's the correct file
  log(
    `\nFirst 100 characters of server.js: ${serverJsContent.substring(0, 100)}`,
  )

  // Check for specific patterns in the file
  const patterns = [
    "app.get('/xrpc-test'",
    "app.get('/xrpc/app.bsky.feed.describeFeedGenerator'",
    "app.get('/xrpc/app.bsky.feed.getFeedSkeleton'",
    'Direct test endpoint for describeFeedGenerator',
    'Direct test endpoint for getFeedSkeleton',
  ]

  log('\nChecking for specific patterns in server.js:')
  patterns.forEach((pattern) => {
    const found = serverJsContent.includes(pattern)
    log(`- Pattern "${pattern}": ${found}`)
  })
}

// Check the available routes
log('\nAttempting to check available routes:')
try {
  const app = require('../dist/server').default
  if (app && app.app && typeof app.app._router === 'object') {
    const routes = app.app._router.stack
      .filter((r) => r.route)
      .map((r) => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods).filter((m) => r.route.methods[m]),
      }))

    log(`Available routes: ${JSON.stringify(routes, null, 2)}`)
  } else {
    log('Could not access app routes')
    if (app) {
      log(`app exists: ${typeof app}`)
      if (app.app) {
        log(`app.app exists: ${typeof app.app}`)
        if (app.app._router) {
          log(`app.app._router exists: ${typeof app.app._router}`)
        } else {
          log('app.app._router does not exist')
        }
      } else {
        log('app.app does not exist')
      }
    } else {
      log('app does not exist')
    }
  }
} catch (error) {
  log(`Error checking routes: ${error.message}`)
  log(`Error stack: ${error.stack}`)
}

// Add a message to help with debugging
log('\n=== DEPLOYMENT CHECK COMPLETE ===')
log(
  'If the XRPC endpoints are not included in the server.js file, try the following:',
)
log('1. Make sure the changes are committed and pushed to the main branch')
log('2. Check if the build process is running correctly on Render.com')
log('3. Try manually triggering a new deployment on Render.com')
log('4. Check the Render.com logs for any errors during the build process')
