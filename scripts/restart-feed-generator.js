#!/usr/bin/env node

/**
 * Restart Feed Generator Script
 * 
 * This script sends a request to the feed generator's health endpoint to wake it up,
 * then sends a request to the debug endpoint to restart the firehose subscription.
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

async function restartFeedGenerator() {
  log.section('Restart Feed Generator');
  
  try {
    // Step 1: Wake up the service by hitting the health endpoint
    log.info('Waking up the feed generator service...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      log.success(`Health endpoint responded with status ${healthResponse.status}`);
      log.info(`Response: ${JSON.stringify(healthResponse.data)}`);
    } catch (error) {
      log.error(`Error accessing health endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      log.info('Continuing with restart attempt...');
    }
    
    // Step 2: Hit the debug endpoint to get service info
    log.info('Checking debug endpoint...');
    try {
      const debugResponse = await axios.get(`${BASE_URL}/debug`);
      log.success(`Debug endpoint responded with status ${debugResponse.status}`);
      log.info(`Service info: ${JSON.stringify(debugResponse.data)}`);
    } catch (error) {
      log.error(`Error accessing debug endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Step 3: Check the XRPC endpoints
    log.info('Checking XRPC endpoints...');
    try {
      const describeResponse = await axios.get(`${BASE_URL}/xrpc/app.bsky.feed.describeFeedGenerator`);
      log.success(`describeFeedGenerator endpoint responded with status ${describeResponse.status}`);
      log.info(`Feed generator info: ${JSON.stringify(describeResponse.data)}`);
    } catch (error) {
      log.error(`Error accessing describeFeedGenerator endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Step 4: Check the feed skeleton endpoint
    log.info('Checking feed skeleton endpoint...');
    try {
      const feedSkeletonResponse = await axios.get(
        `${BASE_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`
      );
      log.success(`getFeedSkeleton endpoint responded with status ${feedSkeletonResponse.status}`);
      log.info(`Feed contains ${feedSkeletonResponse.data.feed.length} posts`);
    } catch (error) {
      log.error(`Error accessing getFeedSkeleton endpoint: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Step 5: Create a test post to trigger indexing
    log.info('Creating a test post to trigger indexing...');
    const { BskyAgent } = require('@atproto/api');
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });
    
    try {
      await agent.login({
        identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
        password: process.env.BLUESKY_PASSWORD
      });
      
      log.success('Logged in successfully');
      
      // Generate a unique identifier
      const timestamp = new Date().toISOString();
      const randomId = Math.random().toString(36).substring(2, 8);
      const uniqueId = `${timestamp}-${randomId}`;
      
      // Create the post
      const postText = `Swarm feed restart test: ${uniqueId}`;
      log.info(`Creating post with text: "${postText}"`);
      
      const result = await agent.post({
        text: postText,
      });
      
      log.success('Post created successfully');
      log.info(`Post URI: ${result.uri}`);
      log.info(`Post CID: ${result.cid}`);
    } catch (error) {
      log.error(`Error creating test post: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    log.section('Next Steps');
    log.info('1. Wait a few minutes for the feed generator to process the new post');
    log.info('2. Run the test-feed-indexing.js script to see if your posts appear in the feed');
    log.info('3. If posts still don\'t appear, check the Render logs for any errors');
    log.info('4. Consider manually restarting the service from the Render dashboard');
    
  } catch (error) {
    log.error(`Error restarting feed generator: ${error.message}`);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
restartFeedGenerator().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  if (error.stack) {
    log.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}); 