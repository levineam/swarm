#!/usr/bin/env node

/**
 * Check Firehose Subscription Script
 * 
 * This script checks if the feed generator is properly subscribing to the firehose.
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

async function checkFirehoseSubscription() {
  log.section('Firehose Subscription Check');
  
  try {
    // Step 1: Check the debug endpoint for subscription info
    log.info('Checking debug endpoint for subscription info...');
    try {
      const debugResponse = await axios.get(`${BASE_URL}/debug`);
      log.success(`Debug endpoint responded with status ${debugResponse.status}`);
      
      // Check if the debug response contains subscription info
      const debugData = debugResponse.data;
      log.info(`Service info: ${JSON.stringify(debugData)}`);
      
      if (debugData && debugData.subscription) {
        log.success('Firehose subscription info found in debug response');
        log.info(`Subscription status: ${debugData.subscription.status || 'Unknown'}`);
        log.info(`Connected: ${debugData.subscription.connected ? 'Yes' : 'No'}`);
        log.info(`Last event: ${debugData.subscription.lastEvent || 'None'}`);
      } else {
        log.warning('No firehose subscription info found in debug response');
        log.info('This suggests the feed generator might not be properly configured to subscribe to the firehose');
      }
    } catch (error) {
      log.error(`Error accessing debug endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Step 2: Check the health endpoint
    log.info('Checking health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      log.success(`Health endpoint responded with status ${healthResponse.status}`);
      log.info(`Health info: ${JSON.stringify(healthResponse.data)}`);
      
      // Check if the health response contains subscription info
      const healthData = healthResponse.data;
      if (healthData && healthData.firehose) {
        log.success('Firehose info found in health response');
        log.info(`Firehose status: ${healthData.firehose.status || 'Unknown'}`);
        log.info(`Connected: ${healthData.firehose.connected ? 'Yes' : 'No'}`);
      } else {
        log.warning('No firehose info found in health response');
      }
    } catch (error) {
      log.error(`Error accessing health endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Step 3: Check the feed skeleton endpoint to see if posts are being indexed
    log.info('Checking feed skeleton endpoint...');
    try {
      const feedSkeletonResponse = await axios.get(
        `${BASE_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`
      );
      log.success(`getFeedSkeleton endpoint responded with status ${feedSkeletonResponse.status}`);
      
      const feedData = feedSkeletonResponse.data;
      if (feedData && feedData.feed && feedData.feed.length > 0) {
        log.success(`Feed contains ${feedData.feed.length} posts`);
        log.info('This suggests the feed generator is indexing some posts');
        
        // Log the first few posts in the feed
        log.info('Recent posts in the feed:');
        for (let i = 0; i < Math.min(feedData.feed.length, 5); i++) {
          log.info(`${i + 1}. ${feedData.feed[i].post}`);
        }
      } else {
        log.warning('Feed contains no posts');
        log.info('This suggests the feed generator is not indexing posts from the firehose');
      }
    } catch (error) {
      log.error(`Error accessing getFeedSkeleton endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    log.section('Troubleshooting Recommendations');
    log.info('1. Check if the feed generator service is running on Render.com');
    log.info('2. Verify that the firehose subscription is configured correctly in the feed generator');
    log.info('3. Check the Render logs for any errors related to the firehose subscription');
    log.info('4. Consider restarting the feed generator service to reconnect to the firehose');
    log.info('5. Make sure the feed generator has the correct environment variables set');
    
  } catch (error) {
    log.error(`Error checking firehose subscription: ${error.message}`);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
checkFirehoseSubscription().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  if (error.stack) {
    log.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}); 