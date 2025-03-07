#!/bin/bash
# Test script to verify the application can start correctly

# Set environment variables
export PORT=10000
export ATP_APPVIEW_HOST="https://bsky.network"
export OGCARD_HOST="https://card.bsky.app"
export LINK_HOST="https://link.bsky.app"
export IPCC_HOST="https://ipcc.bsky.app"
export CORS_ALLOWED_ORIGINS="https://bsky.app,https://main.bsky.dev,https://app.staging.bsky.dev"
export STATIC_CDN_HOST=""
export DEBUG="false"
export EXPO_PUBLIC_BUNDLE_IDENTIFIER="prod"
export GOLOG_LOG_LEVEL="info"

# Run the start script
export HTTP_ADDRESS=":${PORT}"
echo "Starting server on HTTP_ADDRESS=$HTTP_ADDRESS"

# Check if the bskyweb binary exists
if [ -f "./bskyweb/cmd/bskyweb/bskyweb" ]; then
  echo "Found bskyweb binary, starting server..."
  ./bskyweb/cmd/bskyweb/bskyweb serve
else
  echo "bskyweb binary not found, please build it first with:"
  echo "cd bskyweb && go build -o bskyweb ./cmd/bskyweb"
fi 