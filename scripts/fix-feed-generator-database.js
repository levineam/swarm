#!/usr/bin/env node

/**
 * Fix Feed Generator Database Script
 * 
 * This script manually adds your posts to the feed generator's database.
 * Note: This is a temporary fix until the firehose subscription is working properly.
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

async function fixFeedGeneratorDatabase() {
  log.section('Fix Feed Generator Database');
  
  try {
    log.info('This script will help you manually add your posts to the feed generator database.');
    log.info('Note: This is a temporary fix until the firehose subscription is working properly.');
    
    // Step 1: Get your recent posts
    log.info('Fetching your recent posts...');
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });
    
    try {
      await agent.login({
        identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
        password: process.env.BLUESKY_PASSWORD
      });
      
      log.success('Logged in successfully');
      
      // Get the user's profile
      const profile = await agent.getProfile({ actor: agent.session.did });
      const userDid = profile.data.did;
      
      log.info(`Your DID: ${userDid}`);
      
      // Get the user's recent posts
      const posts = await agent.getAuthorFeed({ actor: userDid, limit: 20 });
      
      if (posts.data.feed.length === 0) {
        log.warning('No posts found in your feed');
        return;
      }
      
      log.success(`Found ${posts.data.feed.length} posts in your feed`);
      
      // Extract post information
      const postData = posts.data.feed.map(item => {
        const post = item.post;
        return {
          uri: post.uri,
          cid: post.cid,
          author: post.author.did,
          text: post.record.text,
          createdAt: post.record.createdAt,
          indexedAt: post.indexedAt
        };
      });
      
      log.info('Recent posts:');
      postData.forEach((post, index) => {
        log.info(`${index + 1}. "${post.text}" (${post.uri})`);
      });
      
      // Step 2: Generate SQL statements to insert posts into the database
      log.section('SQL Statements to Insert Posts');
      log.info('Copy and paste these SQL statements into the feed generator database:');
      
      // Generate SQL for each post
      postData.forEach(post => {
        const sql = `INSERT OR IGNORE INTO posts (uri, cid, author, text, created_at, indexed_at) VALUES ('${post.uri}', '${post.cid}', '${post.author}', '${post.text.replace(/'/g, "''")}', '${post.createdAt}', '${post.indexedAt}');`;
        console.log(sql);
      });
      
      log.section('Next Steps');
      log.info('1. Access the feed generator database on Render.com');
      log.info('2. Run the SQL statements above to insert your posts into the database');
      log.info('3. Run the test-feed-indexing.js script to see if your posts appear in the feed');
      
      // Step 3: Generate a curl command to manually update the feed
      log.section('Manual Feed Update');
      log.info('Alternatively, you can use the following curl command to manually update the feed:');
      
      const postUris = postData.map(post => post.uri);
      const curlCommand = `curl -X POST https://swarm-feed-generator.onrender.com/admin/update-feed -H "Content-Type: application/json" -d '{"feedUri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community", "postUris": ${JSON.stringify(postUris)}}'`;
      
      console.log(curlCommand);
      
      log.info('Note: This endpoint might not exist in your feed generator implementation.');
      log.info('If it doesn\'t, you\'ll need to implement it or use the SQL statements above.');
      
    } catch (error) {
      log.error(`Error fetching posts: ${error.message}`);
      if (error.stack) {
        log.error(`Stack trace: ${error.stack}`);
      }
    }
    
  } catch (error) {
    log.error(`Error fixing feed generator database: ${error.message}`);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
fixFeedGeneratorDatabase().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  if (error.stack) {
    log.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}); 