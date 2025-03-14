#!/usr/bin/env node

/**
 * Check Feed Generator Environment Variables Script
 * 
 * This script checks the feed generator's environment variables to ensure they are correctly configured.
 */

const axios = require('axios');
require('dotenv').config();

// Utility functions
const log = {
  info: (message) => console.log(`ℹ️ ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warning: (message) => console.log(`⚠️ ${message}`),
  error: (message) => console.log(`❌ ${message}`),
  section: (title) => console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`)
};

// Base URL for the feed generator
const BASE_URL = 'https://swarm-feed-generator.onrender.com';

async function checkFeedGeneratorEnv() {
  log.section('Feed Generator Environment Check');
  
  try {
    // Step 1: Check the debug endpoint for environment info
    log.info('Checking debug endpoint for environment info...');
    try {
      const debugResponse = await axios.get(`${BASE_URL}/debug`);
      log.success(`Debug endpoint responded with status ${debugResponse.status}`);
      
      // Check if the debug response contains environment info
      const debugData = debugResponse.data;
      log.info(`Service info: ${JSON.stringify(debugData)}`);
      
      if (debugData && debugData.environment) {
        log.success(`Environment: ${debugData.environment}`);
      }
      
      if (debugData && debugData.config) {
        log.success('Configuration found in debug response');
        
        // Check hostname
        if (debugData.config.hostname) {
          log.info(`Hostname: ${debugData.config.hostname}`);
          if (debugData.config.hostname !== 'swarm-feed-generator.onrender.com') {
            log.warning(`Hostname is not set to 'swarm-feed-generator.onrender.com'`);
            log.info('This might cause issues with the firehose subscription');
          } else {
            log.success('Hostname is correctly set to swarm-feed-generator.onrender.com');
          }
        } else {
          log.warning('No hostname found in configuration');
        }
        
        // Check service DID
        if (debugData.config.serviceDid) {
          log.info(`Service DID: ${debugData.config.serviceDid}`);
          if (debugData.config.serviceDid !== 'did:web:swarm-feed-generator.onrender.com') {
            log.warning(`Service DID is not set to 'did:web:swarm-feed-generator.onrender.com'`);
            log.info('This might cause issues with the DID resolution');
          } else {
            log.success('Service DID is correctly set to did:web:swarm-feed-generator.onrender.com');
          }
        } else {
          log.warning('No service DID found in configuration');
        }
        
        // Check publisher DID
        if (debugData.config.publisherDid) {
          log.info(`Publisher DID: ${debugData.config.publisherDid}`);
          if (debugData.config.publisherDid !== 'did:plc:ouadmsyvsfcpkxg3yyz4trqi') {
            log.warning(`Publisher DID is not set to 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'`);
            log.info('This might cause issues with the feed generator record');
          } else {
            log.success('Publisher DID is correctly set to did:plc:ouadmsyvsfcpkxg3yyz4trqi');
          }
        } else {
          log.warning('No publisher DID found in configuration');
        }
        
        // Check port
        if (debugData.config.port) {
          log.info(`Port: ${debugData.config.port}`);
        } else {
          log.warning('No port found in configuration');
        }
      } else {
        log.warning('No configuration found in debug response');
      }
    } catch (error) {
      log.error(`Error accessing debug endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Step 2: Check the DID document
    log.info('Checking DID document...');
    try {
      const didResponse = await axios.get(`${BASE_URL}/.well-known/did.json`);
      log.success(`DID document endpoint responded with status ${didResponse.status}`);
      
      const didData = didResponse.data;
      log.info(`DID document: ${JSON.stringify(didData)}`);
      
      if (didData && didData.id) {
        log.info(`DID: ${didData.id}`);
        if (didData.id !== 'did:web:swarm-feed-generator.onrender.com') {
          log.warning(`DID is not set to 'did:web:swarm-feed-generator.onrender.com'`);
          log.info('This might cause issues with the DID resolution');
        } else {
          log.success('DID is correctly set to did:web:swarm-feed-generator.onrender.com');
        }
      } else {
        log.warning('No DID found in DID document');
      }
    } catch (error) {
      log.error(`Error accessing DID document: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Step 3: Check the feed generator record
    log.info('Checking feed generator record...');
    try {
      const describeResponse = await axios.get(`${BASE_URL}/xrpc/app.bsky.feed.describeFeedGenerator`);
      log.success(`describeFeedGenerator endpoint responded with status ${describeResponse.status}`);
      
      const describeData = describeResponse.data;
      log.info(`Feed generator record: ${JSON.stringify(describeData)}`);
      
      if (describeData && describeData.did) {
        log.info(`Feed generator DID: ${describeData.did}`);
        if (describeData.did !== 'did:web:swarm-feed-generator.onrender.com') {
          log.warning(`Feed generator DID is not set to 'did:web:swarm-feed-generator.onrender.com'`);
          log.info('This might cause issues with the feed generator record');
        } else {
          log.success('Feed generator DID is correctly set to did:web:swarm-feed-generator.onrender.com');
        }
      } else {
        log.warning('No DID found in feed generator record');
      }
      
      if (describeData && describeData.feeds) {
        log.success(`Found ${describeData.feeds.length} feeds in the feed generator record`);
        
        // Check if the Swarm community feed is included
        const swarmCommunityFeed = describeData.feeds.find(feed => 
          feed.uri.includes('swarm-community')
        );
        
        if (swarmCommunityFeed) {
          log.success('Swarm community feed found in the feed generator record');
          log.info(`URI: ${swarmCommunityFeed.uri}`);
        } else {
          log.warning('Swarm community feed not found in the feed generator record');
        }
      } else {
        log.warning('No feeds found in feed generator record');
      }
    } catch (error) {
      log.error(`Error accessing describeFeedGenerator endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    log.section('Environment Recommendations');
    log.info('The following environment variables should be set in the Render dashboard:');
    log.info('1. FEEDGEN_HOSTNAME=swarm-feed-generator.onrender.com');
    log.info('2. FEEDGEN_LISTENHOST=0.0.0.0');
    log.info('3. FEEDGEN_SERVICE_DID=did:web:swarm-feed-generator.onrender.com');
    log.info('4. FEEDGEN_PUBLISHER_DID=did:plc:ouadmsyvsfcpkxg3yyz4trqi');
    log.info('5. FEEDGEN_SUBSCRIPTION_ENDPOINT=wss://bsky.network');
    log.info('6. FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY=3000');
    
  } catch (error) {
    log.error(`Error checking feed generator environment: ${error.message}`);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
checkFeedGeneratorEnv().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  if (error.stack) {
    log.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}); 