#!/usr/bin/env node

/**
 * Check Feed Database Script
 * 
 * This script connects to the feed generator's database and checks if posts are being stored.
 */

const { BskyAgent } = require('@atproto/api');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Utility functions
const log = {
  info: (message) => console.log(`ℹ️ ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warning: (message) => console.log(`⚠️ ${message}`),
  error: (message) => console.log(`❌ ${message}`),
  section: (title) => console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`)
};

async function checkFeedDatabase() {
  log.section('Feed Database Check');
  
  try {
    // Connect to the database
    log.info('Connecting to the feed generator database...');
    
    // Check if we're in the feed generator directory
    const fs = require('fs');
    const path = require('path');
    
    let dbPath = path.join(process.cwd(), 'swarm-feed-generator', 'feed-generator', 'db.sqlite');
    if (!fs.existsSync(dbPath)) {
      dbPath = path.join(process.cwd(), 'db.sqlite');
      if (!fs.existsSync(dbPath)) {
        log.error('Could not find the database file. Make sure you are in the correct directory.');
        log.info('Expected path: ' + dbPath);
        return;
      }
    }
    
    log.info(`Using database at: ${dbPath}`);
    
    // Connect to the SQLite database
    const db = createClient({
      url: `file:${dbPath}`
    });
    
    // Check if the posts table exists
    log.info('Checking if the posts table exists...');
    try {
      const tables = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='posts'`);
      if (tables.rows.length === 0) {
        log.error('The posts table does not exist in the database.');
        return;
      }
      log.success('Posts table exists.');
    } catch (error) {
      log.error(`Error checking tables: ${error.message}`);
      return;
    }
    
    // Count the number of posts in the database
    log.info('Counting posts in the database...');
    try {
      const count = await db.execute('SELECT COUNT(*) as count FROM posts');
      const postCount = count.rows[0].count;
      
      if (postCount === 0) {
        log.warning('No posts found in the database.');
        log.info('This suggests the feed generator is not properly subscribing to the firehose or storing posts.');
      } else {
        log.success(`Found ${postCount} posts in the database.`);
      }
    } catch (error) {
      log.error(`Error counting posts: ${error.message}`);
      return;
    }
    
    // Check for posts from the user
    log.info('Checking for your posts in the database...');
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });
    
    try {
      await agent.login({
        identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
        password: process.env.BLUESKY_PASSWORD
      });
      
      log.success('Logged in successfully');
      
      // Get the user's DID
      const profile = await agent.getProfile({ actor: agent.session.did });
      const userDid = profile.data.did;
      
      log.info(`Your DID: ${userDid}`);
      
      // Check for posts from this user
      const userPosts = await db.execute({
        sql: 'SELECT * FROM posts WHERE author = ? LIMIT 10',
        args: [userDid]
      });
      
      if (userPosts.rows.length === 0) {
        log.warning('No posts from you found in the database.');
        log.info('This suggests your posts are not being indexed by the feed generator.');
      } else {
        log.success(`Found ${userPosts.rows.length} of your posts in the database.`);
        log.info('Your posts in the database:');
        
        for (let i = 0; i < userPosts.rows.length; i++) {
          const post = userPosts.rows[i];
          log.info(`${i + 1}. URI: ${post.uri}`);
        }
      }
    } catch (error) {
      log.error(`Error checking user posts: ${error.message}`);
    }
    
    // Check the swarm_community_posts view
    log.info('Checking the swarm_community_posts view...');
    try {
      const viewExists = await db.execute(`SELECT name FROM sqlite_master WHERE type='view' AND name='swarm_community_posts'`);
      
      if (viewExists.rows.length === 0) {
        log.warning('The swarm_community_posts view does not exist.');
        log.info('This suggests the feed generator is not properly configured for the Swarm community feed.');
      } else {
        log.success('The swarm_community_posts view exists.');
        
        // Count posts in the view
        const viewCount = await db.execute('SELECT COUNT(*) as count FROM swarm_community_posts');
        const postCount = viewCount.rows[0].count;
        
        if (postCount === 0) {
          log.warning('No posts found in the swarm_community_posts view.');
          log.info('This suggests no posts from Swarm community members are being indexed.');
        } else {
          log.success(`Found ${postCount} posts in the swarm_community_posts view.`);
          
          // Check for the user's posts in the view
          const userViewPosts = await db.execute({
            sql: 'SELECT * FROM swarm_community_posts WHERE author = ? LIMIT 10',
            args: [userDid]
          });
          
          if (userViewPosts.rows.length === 0) {
            log.warning('None of your posts are in the swarm_community_posts view.');
            log.info('This suggests your posts are not being included in the Swarm community feed.');
          } else {
            log.success(`Found ${userViewPosts.rows.length} of your posts in the swarm_community_posts view.`);
          }
        }
      }
    } catch (error) {
      log.error(`Error checking swarm_community_posts view: ${error.message}`);
    }
    
    log.section('Troubleshooting Recommendations');
    log.info('1. Check if the feed generator service is running on Render.com');
    log.info('2. Verify that the firehose subscription is working properly');
    log.info('3. Make sure your DID is correctly listed in the SWARM_COMMUNITY_MEMBERS array');
    log.info('4. Check if the database is being persisted between service restarts');
    log.info('5. Consider restarting the feed generator service to ensure it reconnects to the firehose');
    
  } catch (error) {
    log.error(`Error checking feed database: ${error.message}`);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
checkFeedDatabase().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  if (error.stack) {
    log.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}); 