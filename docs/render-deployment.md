# Deploying to Render

This document outlines the steps and configuration needed to deploy the Swarm social app to [Render](https://render.com/).

## Prerequisites

- A Render account
- A GitHub repository with the Swarm social app code
- Basic understanding of Docker and web services

## Configuration Files

The following files are required for proper deployment on Render:

### 1. `.dockerignore`

This file specifies which files and directories should be excluded from the Docker build context, optimizing build times and reducing image size.

```
# Node.js
node_modules
npm-debug.log
yarn-error.log
.yarn-cache
.npm

# Build artifacts
build/
dist/
web-build/
...
```

### 2. `Dockerfile`

The Dockerfile is configured to:
- Build the application using Node.js and Go
- Set up a wrapper script that dynamically configures the HTTP_ADDRESS based on Render's PORT environment variable
- Include health check capabilities

Key sections:
```dockerfile
# Create a wrapper script to set HTTP_ADDRESS based on PORT
RUN echo '#!/bin/bash\n\
export HTTP_ADDRESS=":${PORT:-10000}"\n\
echo "Starting server on HTTP_ADDRESS=$HTTP_ADDRESS"\n\
exec /usr/bin/bskyweb serve\n\
' > /usr/bin/start.sh && chmod +x /usr/bin/start.sh

# Use the wrapper script as the command
CMD ["/usr/bin/start.sh"]
```

### 3. `render.yaml`

This file defines the service configuration for Render:

```yaml
services:
  - type: web
    name: swarm-social
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: PORT
        value: "10000"
      - key: ATP_APPVIEW_HOST
        value: "https://bsky.network"
      # Additional environment variables...
    healthCheckPath: /
    numInstances: 1
    region: ohio
    plan: free
    branch: main
    autoDeploy: true
```

### 4. `healthcheck.sh`

A simple script that checks if the application is running:

```bash
#!/bin/bash
# Simple health check script for Render

# Get the PORT environment variable or default to 10000
PORT=${PORT:-10000}

# Try to connect to the application
curl -f http://localhost:$PORT/ || exit 1

exit 0
```

## Deployment Process

1. Ensure all configuration files are in place
2. Commit and push changes to the configured branch (default: `main`)
3. Render will automatically detect changes and start a new deployment
4. Monitor the deployment progress in the Render dashboard

## Troubleshooting

### Port Configuration Issues

The application must listen on the port specified by Render's `PORT` environment variable. Our wrapper script handles this by setting `HTTP_ADDRESS` to the correct value.

### Health Check Failures

If health checks fail, check:
- The application is properly starting
- The application is listening on the correct port
- The health check path (`/`) is accessible

### Build Failures

If the Docker build fails:
- Check the build logs in Render
- Ensure all dependencies are properly specified
- Verify that the Dockerfile is correctly configured for your application

## Testing Locally

You can test the Render configuration locally using the `test-start.sh` script:

```bash
./test-start.sh
```

This script sets up the same environment variables used in Render and starts the application.

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Go Web Server Documentation](https://golang.org/doc/articles/wiki/) 