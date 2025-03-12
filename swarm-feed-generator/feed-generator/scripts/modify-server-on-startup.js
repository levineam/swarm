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
const hasRootPath = serverJsContent.includes("app.get('/', (req, res)")

console.log('Endpoints already included in server.js:')
console.log(`- describeFeedGenerator: ${hasDescribeFeedGenerator}`)
console.log(`- getFeedSkeleton: ${hasGetFeedSkeleton}`)
console.log(`- xrpc-test: ${hasXrpcTest}`)
console.log(`- root path: ${hasRootPath}`)

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

// Prepare the endpoints to add
let endpointsToAdd = ''

// Add XRPC endpoints if they don't exist
if (!(hasDescribeFeedGenerator && hasGetFeedSkeleton && hasXrpcTest)) {
  endpointsToAdd += `
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
}

// Add root path handler if it doesn't exist
if (!hasRootPath) {
  endpointsToAdd += `
    // Root path handler
    app.get('/', (req, res) => {
      console.log('Root path called');
      res.status(200).send(\`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Swarm Feed Generator</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #1D9BF0;
            }
            .endpoint {
              background-color: #f5f5f5;
              padding: 10px;
              border-radius: 5px;
              margin-bottom: 10px;
              font-family: monospace;
            }
            a {
              color: #1D9BF0;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            .feeds {
              margin-top: 20px;
            }
            .feed-item {
              margin-bottom: 15px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .feed-title {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .feed-uri {
              font-family: monospace;
              font-size: 0.9em;
              background-color: #f5f5f5;
              padding: 5px;
              border-radius: 3px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <h1>Swarm Feed Generator</h1>
          <p>This is the feed generator service for the <a href="https://swarm-social.onrender.com" target="_blank">Swarm</a> community platform on Bluesky.</p>
          
          <h2>Available Feeds</h2>
          <div class="feeds">
            <div class="feed-item">
              <div class="feed-title">Swarm Community</div>
              <p>A feed of posts from Swarm community members</p>
              <div class="feed-uri">at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community</div>
            </div>
            <div class="feed-item">
              <div class="feed-title">Swarm Trending</div>
              <p>A feed of trending posts from the Swarm community</p>
              <div class="feed-uri">at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-trending</div>
            </div>
          </div>
          
          <h2>API Endpoints</h2>
          <div class="endpoint">GET /health - Health check endpoint</div>
          <div class="endpoint">GET /debug - Debug information</div>
          <div class="endpoint">GET /xrpc-test - Test XRPC functionality</div>
          <div class="endpoint">GET /xrpc/app.bsky.feed.describeFeedGenerator - Feed generator metadata</div>
          <div class="endpoint">GET /xrpc/app.bsky.feed.getFeedSkeleton?feed={feedUri} - Get feed content</div>
          
          <h2>How to Use</h2>
          <p>To use these feeds in your Bluesky client:</p>
          <ol>
            <li>Open the Bluesky app</li>
            <li>Go to the Discover tab</li>
            <li>Search for "Swarm"</li>
            <li>Add the Swarm Community or Swarm Trending feed</li>
          </ol>
          
          <h2>Integration</h2>
          <p>This feed generator is integrated with the <a href="https://swarm-social.onrender.com" target="_blank">Swarm Social</a> platform, which provides a customized Bluesky experience with community features.</p>
          
          <footer style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            <p>© ${new Date().getFullYear()} Swarm Community Platform</p>
          </footer>
        </body>
        </html>
      \`);
    });
`
}

// If there are no endpoints to add, exit
if (!endpointsToAdd) {
  console.log('All endpoints are already included in server.js')
  process.exit(0)
}

// Insert the endpoints
serverJsContent =
  serverJsContent.slice(0, debugEndpointEndPos + 3) +
  endpointsToAdd +
  serverJsContent.slice(debugEndpointEndPos + 3)

// Write the modified server.js file
fs.writeFileSync(serverJsPath, serverJsContent)
console.log(`Wrote ${serverJsContent.length} bytes to server.js`)

console.log('Endpoints added to server.js')
console.log('=== SERVER MODIFIED ===')
