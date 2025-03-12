const fs = require('fs')
const path = require('path')

console.log('=== MODIFYING SERVER ON STARTUP ===')
console.log('Current working directory:', process.cwd())

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

// Check if the XRPC endpoints are already included
const hasDescribeFeedGenerator = serverJsContent.includes(
  '/xrpc/app.bsky.feed.describeFeedGenerator',
)
const hasGetFeedSkeleton = serverJsContent.includes(
  '/xrpc/app.bsky.feed.getFeedSkeleton',
)
const hasXrpcTest = serverJsContent.includes('/xrpc-test')

console.log('XRPC endpoints already included in server.js:')
console.log(`- describeFeedGenerator: ${hasDescribeFeedGenerator}`)
console.log(`- getFeedSkeleton: ${hasGetFeedSkeleton}`)
console.log(`- xrpc-test: ${hasXrpcTest}`)

// If the XRPC endpoints are already included, exit
if (hasDescribeFeedGenerator && hasGetFeedSkeleton && hasXrpcTest) {
  console.log('All XRPC endpoints are already included in server.js')
  process.exit(0)
}

// Find the position to insert the XRPC endpoints
// Look for the debug endpoint
const debugEndpointPos = serverJsContent.indexOf("app.get('/debug'")
if (debugEndpointPos === -1) {
  console.error('Could not find debug endpoint in server.js')
  process.exit(1)
}

// Find the end of the debug endpoint handler
const debugEndpointEndPos = serverJsContent.indexOf('});', debugEndpointPos)
if (debugEndpointEndPos === -1) {
  console.error('Could not find end of debug endpoint handler in server.js')
  process.exit(1)
}

// Insert the XRPC endpoints after the debug endpoint
const xrpcEndpoints = `
    // XRPC test endpoint
    app.get('/xrpc-test', (req, res) => {
      console.log('XRPC test endpoint called');
      res.status(200).json({
        message: 'XRPC test endpoint',
        xrpcAvailable: true,
      });
    });

    // Add a direct test endpoint for the XRPC endpoints
    app.get('/xrpc/app.bsky.feed.describeFeedGenerator', (req, res) => {
      console.log('Direct test endpoint for describeFeedGenerator called');
      res.status(200).json({
        did: cfg.serviceDid,
        feeds: [
          {
            uri: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community',
            cid: 'bafyreihbvkwdpxqvvkxqjgvjlvvlvqvkxqvjvlvvlvqvkxqvjvlvvlvqvkxq',
          },
          {
            uri: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-trending',
            cid: 'bafyreihbvkwdpxqvvkxqjgvjlvvlvqvkxqvjvlvvlvqvkxqvjvlvvlvqvkxq',
          },
        ],
        links: {
          privacyPolicy: 'https://swarm-social.onrender.com/privacy',
          termsOfService: 'https://swarm-social.onrender.com/terms',
        },
      });
    });

    app.get('/xrpc/app.bsky.feed.getFeedSkeleton', (req, res) => {
      console.log('Direct test endpoint for getFeedSkeleton called');
      const feed = req.query.feed;
      console.log(\`Feed requested: \${feed}\`);
      
      // Return a simple feed skeleton
      res.status(200).json({
        feed: [
          {
            post: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/3kgcdlnbmm22o',
          },
          {
            post: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/3kgcdlnbmm22p',
          },
        ],
      });
    });
`

// Insert the XRPC endpoints
serverJsContent =
  serverJsContent.slice(0, debugEndpointEndPos + 3) +
  xrpcEndpoints +
  serverJsContent.slice(debugEndpointEndPos + 3)

// Write the modified server.js file
fs.writeFileSync(serverJsPath, serverJsContent)
console.log(`Wrote ${serverJsContent.length} bytes to server.js`)

console.log('XRPC endpoints added to server.js')
console.log('=== SERVER MODIFIED ===')
