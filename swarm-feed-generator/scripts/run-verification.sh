#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Run DID Audit
echo -e "\n=== Running DID Document Audit ==="
node audit-did-documents.js

# Run HTTP Method Test
echo -e "\n=== Testing HTTP Methods for DID Document Endpoints ==="
node test-did-http-methods.js

# Run DID Resolution Verification
echo -e "\n=== Verifying DID Resolution ==="
node verify-did-resolution.js 