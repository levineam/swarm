#!/usr/bin/env node

/**
 * Create Test Post Script
 * 
 * This script creates a test post with a unique identifier to see if it gets indexed
 * by the feed generator.
 */

const { BskyAgent } = require('@atproto/api');
require('dotenv').config();

// Utility functions
const log = {
  info: (message) => console.log(`ℹ️ ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warning: (message) => console.log(`⚠️ ${message}`),
  error: (message) => console.log(`❌ ${message}`),
  section: (title) => console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`)
};

async function createTestPost() {
  log.section('Create Test Post');
  
  try {
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });
    
    // Login
    log.info(`Logging in as ${process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social'}`);
    
    try {
      await agent.login({
        identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
        password: process.env.BLUESKY_PASSWORD
      });
      
      log.success('Logged in successfully');
    } catch (loginError) {
      log.error(`Login failed: ${loginError.message}`);
      if (loginError.status) {
        log.error(`Status code: ${loginError.status}`);
      }
      if (loginError.error) {
        log.error(`Error details: ${JSON.stringify(loginError.error)}`);
      }
      return;
    }
    
    // Generate a unique identifier
    const timestamp = new Date().toISOString();
    const randomId = Math.random().toString(36).substring(2, 8);
    const uniqueId = `${timestamp}-${randomId}`;
    
    // Create the post
    const postText = `Swarm feed indexing test: ${uniqueId}`;
    log.info(`Creating post with text: "${postText}"`);
    
    try {
      const result = await agent.post({
        text: postText,
      });
      
      log.success('Post created successfully');
      log.info(`Post URI: ${result.uri}`);
      log.info(`Post CID: ${result.cid}`);
      
      log.section('Next Steps');
      log.info('1. Wait a few minutes for the post to be indexed');
      log.info('2. Run the test-feed-indexing.js script to see if the post appears in the feed');
      log.info('3. If the post does not appear, check the Render logs for any errors');
    } catch (postError) {
      log.error(`Failed to create post: ${postError.message}`);
      if (postError.status) {
        log.error(`Status code: ${postError.status}`);
      }
      if (postError.error) {
        log.error(`Error details: ${JSON.stringify(postError.error)}`);
      }
    }
  } catch (error) {
    log.error(`Error creating post: ${error.message}`);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
createTestPost().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  if (error.stack) {
    log.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}); 