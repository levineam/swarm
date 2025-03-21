# CORS Proxy Server Implementation Plan

## Introduction

Based on our investigation and expert feedback, we're implementing a CORS proxy solution to resolve the cross-origin issues between the Bluesky client and the Swarm feed generator. Instead of modifying the feed generator API directly or implementing complex client-side workarounds, we need a proxy to handle cross-origin requests and enforce proper CORS headers.

After careful analysis of the existing architecture, we recommend **creating a separate CORS proxy service** on Render rather than modifying the existing client application for these reasons:

1. The existing client application (`swarm-social`) is a Dockerized Go application that would require significant changes to implement proxy functionality
2. A separate proxy service provides better separation of concerns and is easier to maintain
3. This approach minimizes risk to the existing services

This approach offers several advantages:
- Avoids modifying the core feed generator code
- Provides a single point for CORS configuration
- Works consistently across all browsers and devices
- Maintains security while enabling cross-origin access
- Allows for independent scaling and maintenance

## Implementation Steps

### 1. Set Up a New Node.js Project for the CORS Proxy Server

**✅ EXECUTION SUMMARY:**
- Created the `swarm-proxy` directory in the `social-app` project root
- Initialized a Node.js project with `package.json`
- Installed the required dependencies including express, node-fetch, and cors
- The initial project structure is set up and ready for implementation

### 2. Write the Proxy Server Code

**✅ EXECUTION SUMMARY:**
- Created the `index.js` file with the proxy server implementation
- Enhanced the original code with additional logging and error handling
- Updated the implementation to properly forward headers and handle CORS
- Improved the proxy to handle OPTIONS requests appropriately
- Modified the code to use ES modules syntax since node-fetch v3 is an ES module
- Fixed the deprecated `response.buffer()` method by replacing with `response.arrayBuffer()`
- Added explicit headers to ensure consistent CORS behavior across browsers

### 3. Deploy the Proxy Server on Render

To deploy the proxy as a separate service on Render:

1. **Create a GitHub Repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial CORS proxy implementation"
   git remote add origin <your-repo-url>
   git push origin main
   ```

2. **Set Up Render Deployment**:
   - Log in to [Render](https://render.com/)
   - Click "New" > "Web Service"
   - Connect to your GitHub repository
   - Configure the service:
     - Name: `swarm-cors-proxy`
     - Runtime: `Node`
     - Build Command: `npm install`
     - Start Command: `node index.js`
     - Instance Type: Starter ($7/month) or Free tier for testing
   - Add Environment Variables:
     - `FEED_GENERATOR_URL`: `https://swarm-feed-generator.onrender.com`
     - `ALLOWED_ORIGINS`: `https://bsky.app,http://localhost:8080,http://localhost:19006`
   - Click "Create Web Service"

3. **Verify Deployment**:
   - Once deployed, note the service URL (e.g., `https://swarm-cors-proxy.onrender.com`)
   - Test the proxy endpoint with curl:
     ```bash
     curl https://swarm-cors-proxy.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community
     ```

**🔄 IN PROGRESS:**
- Repository has been initialized with git
- Prepared deployment script `prepare-deploy.sh` for GitHub setup
- Created render.yaml for easier deployment configuration
- Code is tested and ready for deployment to Render
- REMAINING: Connect to GitHub and set up the Render service

### 4. Update Client Application

Now that we have a CORS proxy in place, we need to update the client-side code to use the proxy instead of directly accessing the feed generator. Since the client is a React application, we'll need to update the API call URLs:

```typescript
// In src/view/com/posts/SwarmFeedFallback.tsx or similar

// Change from:
// const response = await fetch(
//   `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(SWARM_FEED_URI)}&_t=${Date.now()}`
// )

// To:
const response = await fetch(
  `https://swarm-cors-proxy.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(SWARM_FEED_URI)}&_t=${Date.now()}`
)
```

For better maintainability, add the proxy URL to a constants file:

```typescript
// In src/lib/constants.ts
export const SWARM_API_PROXY = 'https://swarm-cors-proxy.onrender.com'
```

Then update the fetch call:

```typescript
import {SWARM_API_PROXY} from '#/lib/constants'

// ...

const response = await fetch(
  `${SWARM_API_PROXY}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(SWARM_FEED_URI)}&_t=${Date.now()}`
)
```

**⏱ NOT STARTED:**
- Will be implemented after successful deployment to Render

### 5. Testing

**✅ EXECUTION SUMMARY:**
- Created two test clients (`test-client.html` and `simple-test.html`) to verify CORS functionality
- Successfully tested direct API calls and proxy API calls with the test clients
- Verified that CORS headers are properly set in the proxy responses
- Test client shows that both direct and proxied requests are working correctly
- Confirmed proper logging and error handling in the proxy server
- Remaining: Test with the actual Bluesky client integration

## Next Steps

### 1. Update Technical Architecture Documentation

Update the `swarm-technical-architecture.md` document to include the CORS proxy server as a key component of the architecture:

1. Add the CORS proxy to the Core Components section
2. Update the Domain Architecture section to include the proxy server domain
3. Update the Data Flow section to reflect the proxy's role in handling requests
4. Include the proxy server in the Technical Considerations section
5. Document future security requirements for the proxy server

Example updates for the architecture document:

```markdown
#### CORS Proxy Server
- **Technology**: Node.js with Express
- **Purpose**: Handles cross-origin requests between client and feed generator
- **Features**: CORS headers management, request forwarding, error handling
- **Deployment**: Hosted on Render at https://swarm-cors-proxy.onrender.com
- **Integration Points**: Client application, Feed Generator API
- **Security Roadmap**: Rate limiting, configurable origins, and request validation planned for future implementation as adoption grows
```

```markdown
### Domain Architecture
The Swarm platform consists of three separate services with distinct domains:

1. **Client Application**: https://swarm-social.onrender.com
   - Provides the user interface for interacting with the Swarm community
   - References to the main Swarm web application use this domain

2. **CORS Proxy Server**: https://swarm-cors-proxy.onrender.com
   - Handles cross-origin requests between the client and feed generator
   - All client requests to the feed generator pass through this proxy
   - Future security enhancements planned as user base grows

3. **Feed Generator Service**: https://swarm-feed-generator.onrender.com
   - Implements the AT Protocol feed generator specification
   - The DID document and service references use this domain
```

```markdown
### Data Flow
1. AT Protocol firehose sends real-time posts to feed generator
2. Feed generator filters posts based on community membership and rules
3. Client application authenticates with the feed generator using JWT tokens via Bluesky credentials
4. Client requests feed data from the CORS proxy server
5. CORS proxy forwards requests to the feed generator and returns responses with proper CORS headers
6. Users interact with content through the client application
```

```markdown
### Security Considerations
- The CORS proxy server will implement rate limiting, origin validation, and request filtering as user adoption grows
- Initial deployment focuses on basic functionality with security features to be added incrementally
- Security monitoring and logging will be implemented to detect and respond to potential abuse
```

**⏱ NOT STARTED:**
- Will be updated once the proxy is deployed and integrated with the client

### 2. Secure the Proxy Server

As user adoption increases, implement the following security measures:

1. Install rate limiting to prevent abuse:
   ```bash
   npm install express-rate-limit
   ```

2. Add rate limiting to the server code:
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   // Apply rate limiting before other middleware
   app.use(rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // Limit each IP to 100 requests per window
     message: 'Too many requests from this IP, please try again later'
   }));
   ```

3. Add environment variable support for configuration:
   ```javascript
   const PORT = process.env.PORT || 3000;
   const FEED_GENERATOR_URL = process.env.FEED_GENERATOR_URL || 'https://swarm-feed-generator.onrender.com';
   const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://bsky.app,http://localhost:8080,http://localhost:19006').split(',');
   
   app.use(cors({
     origin: ALLOWED_ORIGINS,
     // rest of configuration...
   }));
   ```

**⏱ NOT STARTED:**
- Will be implemented after initial deployment and usage metrics are available

### 3. Future Enhancements

1. **Caching**:
   - Add response caching to improve performance
   - Implement cache invalidation strategies

2. **Advanced Logging**:
   - Integrate with logging services (e.g., Sentry)
   - Add request/response detail logging for debugging

3. **Authentication**:
   - If needed, add authentication to the proxy server
   - Implement JWT validation for secure endpoints

**⏱ NOT STARTED:**
- Will be considered after initial deployment and based on performance metrics

## Maintenance Considerations

1. **Monitoring**:
   - Set up monitoring for the proxy server
   - Track errors, response times, and request volumes

2. **Scaling**:
   - If traffic increases, consider scaling the Render instance
   - For high-volume scenarios, consider moving to a more robust hosting platform

3. **Security Updates**:
   - Regularly update dependencies
   - Periodically review and adjust CORS and rate limiting configurations

**⏱ NOT STARTED:**
- Will be implemented after deployment to production

## Conclusion

The CORS proxy approach offers a clean solution to the cross-origin issues we're experiencing. By implementing a dedicated proxy server, we can ensure reliable access to the Swarm feed generator without complex client-side workarounds or modifications to the core feed generator code.

This implementation plan follows best practices for proxy servers and includes security measures to prevent abuse. The proxy is designed to be lightweight, maintainable, and scalable.


---

