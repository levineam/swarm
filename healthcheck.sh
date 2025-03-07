#!/bin/bash
# Simple health check script for Render

# Get the PORT environment variable or default to 10000
PORT=${PORT:-10000}

# Try to connect to the application
curl -f http://localhost:$PORT/ || exit 1

exit 0 