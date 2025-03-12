const fs = require('fs')
const path = require('path')

console.log('=== CHECKING SERVER.JS CONFIGURATION ===')
console.log('Current working directory:', process.cwd())
console.log('Script execution timestamp:', new Date().toISOString())
console.log('Node.js version:', process.version)
console.log('Environment:', process.env.NODE_ENV || 'development')

// Define paths
const distDir = path.join(process.cwd(), 'dist')
const serverJsPath = path.join(distDir, 'server.js')
const serverJsBackupPath = path.join(distDir, 'server.js.backup')

// Check if dist directory exists
console.log(`Checking if dist directory exists: ${fs.existsSync(distDir)}`)
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist')
  process.exit(1)
}

// Check if server.js exists
console.log(`Checking if server.js exists: ${fs.existsSync(serverJsPath)}`)
if (!fs.existsSync(serverJsPath)) {
  console.error('Error: server.js not found in dist directory')

  // Try to find server.js in other locations
  const possibleLocations = [
    path.join(process.cwd(), 'server.js'),
    path.join(process.cwd(), 'src', 'server.js'),
    path.join(process.cwd(), '..', 'dist', 'server.js'),
  ]

  let foundServerJs = false
  for (const location of possibleLocations) {
    console.log(`Checking ${location}: ${fs.existsSync(location)}`)
    if (fs.existsSync(location)) {
      console.log(`Found server.js at ${location}`)
      foundServerJs = true
      break
    }
  }

  if (!foundServerJs) {
    console.error('Could not find server.js in any location')
    process.exit(1)
  }
}

// Read server.js content
let serverJsContent
try {
  serverJsContent = fs.readFileSync(serverJsPath, 'utf8')
  console.log(`Read ${serverJsContent.length} bytes from server.js`)
} catch (readError) {
  console.error(`Error reading server.js: ${readError.message}`)
  process.exit(1)
}

// Create a backup of the original server.js
try {
  fs.writeFileSync(serverJsBackupPath, serverJsContent)
  console.log(`Created backup of server.js at ${serverJsBackupPath}`)
} catch (backupError) {
  console.error(`Error creating backup of server.js: ${backupError.message}`)
  // Continue anyway
}

// Check for required endpoints
const hasDescribeFeedGenerator = serverJsContent.includes(
  '/xrpc/app.bsky.feed.describeFeedGenerator',
)
const hasGetFeedSkeleton = serverJsContent.includes(
  '/xrpc/app.bsky.feed.getFeedSkeleton',
)
const hasXrpcTest = serverJsContent.includes('/xrpc-test')
const hasRootPath = serverJsContent.includes("app.get('/', (req, res)")
const hasHealthEndpoint = serverJsContent.includes("app.get('/health'")
const hasDebugEndpoint = serverJsContent.includes("app.get('/debug'")

console.log('\nEndpoints found in server.js:')
console.log(`- Root path handler: ${hasRootPath ? '✅ FOUND' : '❌ MISSING'}`)
console.log(
  `- Health endpoint: ${hasHealthEndpoint ? '✅ FOUND' : '❌ MISSING'}`,
)
console.log(`- Debug endpoint: ${hasDebugEndpoint ? '✅ FOUND' : '❌ MISSING'}`)
console.log(`- XRPC test endpoint: ${hasXrpcTest ? '✅ FOUND' : '❌ MISSING'}`)
console.log(
  `- describeFeedGenerator endpoint: ${
    hasDescribeFeedGenerator ? '✅ FOUND' : '❌ MISSING'
  }`,
)
console.log(
  `- getFeedSkeleton endpoint: ${
    hasGetFeedSkeleton ? '✅ FOUND' : '❌ MISSING'
  }`,
)

// Check for express app initialization
const hasExpressApp = serverJsContent.includes('const app = express()')
console.log(
  `\nExpress app initialization: ${hasExpressApp ? '✅ FOUND' : '❌ MISSING'}`,
)

// Check for server listening
const hasServerListen = serverJsContent.includes('app.listen(')
console.log(`Server listening: ${hasServerListen ? '✅ FOUND' : '❌ MISSING'}`)

// Check for imports
const hasExpressImport = serverJsContent.includes(
  "const express = require('express')",
)
console.log(`Express import: ${hasExpressImport ? '✅ FOUND' : '❌ MISSING'}`)

// Check for configuration
const hasConfig = serverJsContent.includes('cfg.')
console.log(`Configuration reference: ${hasConfig ? '✅ FOUND' : '❌ MISSING'}`)

// Print server.js structure
console.log('\nServer.js structure:')
const lines = serverJsContent.split('\n')
console.log(`Total lines: ${lines.length}`)

// Print first 10 lines
console.log('\nFirst 10 lines:')
for (let i = 0; i < Math.min(10, lines.length); i++) {
  console.log(
    `${i + 1}: ${lines[i].substring(0, 100)}${
      lines[i].length > 100 ? '...' : ''
    }`,
  )
}

// Find and print endpoint definitions
console.log('\nEndpoint definitions:')
const endpointLines = []
for (let i = 0; i < lines.length; i++) {
  if (
    lines[i].includes('app.get(') ||
    lines[i].includes('app.post(') ||
    lines[i].includes('app.put(') ||
    lines[i].includes('app.delete(')
  ) {
    endpointLines.push({ line: i + 1, content: lines[i].trim() })
  }
}

if (endpointLines.length > 0) {
  endpointLines.forEach(({ line, content }) => {
    console.log(`Line ${line}: ${content}`)
  })
} else {
  console.log('No endpoint definitions found')
}

// Summary
console.log('\nSummary:')
const allEndpointsPresent =
  hasRootPath &&
  hasHealthEndpoint &&
  hasDebugEndpoint &&
  hasXrpcTest &&
  hasDescribeFeedGenerator &&
  hasGetFeedSkeleton

if (allEndpointsPresent) {
  console.log('✅ All required endpoints are present in server.js')
} else {
  console.log('❌ Some required endpoints are missing from server.js')
  console.log(
    'The modify-server-on-startup.js script may not be running correctly during deployment.',
  )
  console.log('Possible issues:')
  console.log('1. The script is not being executed during the build process')
  console.log('2. The script is running but failing to modify server.js')
  console.log(
    '3. The server.js file is being overwritten after the script runs',
  )

  console.log('\nRecommended actions:')
  console.log(
    '1. Check the build logs on Render to see if the script is running',
  )
  console.log(
    '2. Verify that the postbuild script in package.json is correctly configured',
  )
  console.log(
    '3. Try manually adding the endpoints to server.js in the source code',
  )
}

console.log('\n=== SERVER.JS CHECK COMPLETE ===')
