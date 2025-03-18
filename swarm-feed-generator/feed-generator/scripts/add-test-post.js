require('dotenv').config();
const { BskyAgent } = require('@atproto/api');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { SWARM_COMMUNITY_MEMBERS } = require('../dist/swarm-community-members');

// Utility logging functions
const log = {
  info: (message) => console.log(`ℹ️ ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warning: (message) => console.log(`⚠️ ${message}`),
  error: (message) => console.log(`❌ ${message}`),
  section: (title) => {
    console.log(`\n🔍 ${title}`);
    console.log('='.repeat(title.length + 2));
  }
};

// Configuration - use environment variables or defaults
const config = {
  dbPaths: [
    './swarm-feed.db',
    '../swarm-feed.db', 
    '../../swarm-feed.db',
    './feed-generator/swarm-feed.db',
    '../feed-generator/swarm-feed.db'
  ],
  blueskyUsername: process.env.BLUESKY_USERNAME,
  blueskyPassword: process.env.BLUESKY_PASSWORD,
  testPostUri: process.env.TEST_POST_URI
};

async function addTestPost() {
  log.section('Add Test Post to Feed Database');
  log.info('This script manually adds a test post to the feed database, bypassing the firehose subscription');

  // Validate credentials
  if (!config.blueskyUsername || !config.blueskyPassword) {
    log.error('Bluesky credentials missing! Please set BLUESKY_USERNAME and BLUESKY_PASSWORD');
    log.info('Example usage:');
    log.info('BLUESKY_USERNAME=yourusername.bsky.social BLUESKY_PASSWORD=yourpassword TEST_POST_URI=at://did:plc:xyz/app.bsky.feed.post/123 node add-test-post.js');
    return;
  }

  // Login to Bluesky
  log.section('Logging in to Bluesky');
  const agent = new BskyAgent({ service: 'https://bsky.social' });
  try {
    await agent.login({
      identifier: config.blueskyUsername,
      password: config.blueskyPassword
    });
    log.success(`Logged in successfully as ${config.blueskyUsername}`);
    log.info(`Your DID: ${agent.session.did}`);
  } catch (error) {
    log.error(`Failed to log in: ${error.message}`);
    return;
  }

  // Verify if the user is in SWARM_COMMUNITY_MEMBERS
  log.section('Checking Community Membership');
  if (SWARM_COMMUNITY_MEMBERS.includes(agent.session.did)) {
    log.success(`Your DID (${agent.session.did}) is in the SWARM_COMMUNITY_MEMBERS list`);
  } else {
    log.warning(`Your DID (${agent.session.did}) is NOT in the SWARM_COMMUNITY_MEMBERS list`);
    log.info('This post might not show up in the feed due to community member filtering');
    log.info('Consider adding your DID to SWARM_COMMUNITY_MEMBERS in src/swarm-community-members.ts');
  }

  // Get test post details
  log.section('Getting Post Details');
  let testPost;
  
  if (config.testPostUri) {
    log.info(`Using provided test post URI: ${config.testPostUri}`);
    
    try {
      // Fetch the post details
      const postView = await agent.getPostThread({ uri: config.testPostUri, depth: 0 });
      testPost = {
        uri: postView.data.thread.post.uri,
        cid: postView.data.thread.post.cid,
        text: postView.data.thread.post.record.text.substring(0, 50) + '...',
        creator: postView.data.thread.post.author.did,
        indexedAt: new Date().toISOString()
      };
      log.success('Successfully fetched post details');
      log.info(`Post text: "${testPost.text}"`);
      log.info(`Author: ${testPost.creator}`);
    } catch (error) {
      log.error(`Failed to fetch post details: ${error.message}`);
      return;
    }
  } else {
    // Fetch the user's most recent post
    log.info('No post URI provided, fetching your most recent post');
    
    try {
      const response = await agent.getAuthorFeed({
        actor: agent.session.did,
        limit: 1
      });
      
      if (response.data.feed.length === 0) {
        log.error('No posts found in your feed');
        return;
      }
      
      const post = response.data.feed[0].post;
      testPost = {
        uri: post.uri,
        cid: post.cid,
        text: post.record.text.substring(0, 50) + '...',
        creator: agent.session.did,
        indexedAt: new Date().toISOString()
      };
      log.success('Found your most recent post');
      log.info(`Post URI: ${testPost.uri}`);
      log.info(`Post text: "${testPost.text}"`);
    } catch (error) {
      log.error(`Failed to fetch your posts: ${error.message}`);
      return;
    }
  }

  // Connect to the database
  log.section('Connecting to Database');
  
  let db = null;
  let dbPath = null;

  // Find the database file
  for (const path of config.dbPaths) {
    if (fs.existsSync(path)) {
      log.info(`Found database at: ${path}`);
      dbPath = path;
      break;
    }
  }

  if (!dbPath) {
    log.error('Could not find the database file in any of the expected locations');
    log.info('Available files in current directory:');
    const files = fs.readdirSync('.');
    files.forEach(file => log.info(`- ${file}`));
    return;
  }

  try {
    // Open the database for writing
    db = new sqlite3.Database(dbPath);
    log.success('Connected to database successfully');
  } catch (error) {
    log.error(`Failed to connect to database: ${error.message}`);
    return;
  }

  // Check if the post already exists in the database
  log.section('Checking if Post Already Exists');
  
  db.get('SELECT * FROM post WHERE uri = ?', [testPost.uri], (err, row) => {
    if (err) {
      log.error(`Database error: ${err.message}`);
      db.close();
      return;
    }
    
    if (row) {
      log.warning('Post already exists in the database');
      log.info(`Existing record: ${JSON.stringify(row)}`);
      db.close();
      
      log.section('Next Steps');
      log.info('1. Run the test-feed-indexing.js script to verify the post appears in the feed');
      log.info('2. If the post doesn\'t appear in the feed, check the feed algorithm implementation');
      return;
    }
    
    // Post doesn't exist, so let's add it
    log.info('Post not found in database, adding it now');
    
    // Insert the post
    db.run(
      'INSERT INTO post (uri, cid, creator, indexedAt) VALUES (?, ?, ?, ?)',
      [testPost.uri, testPost.cid, testPost.creator, testPost.indexedAt],
      function(err) {
        if (err) {
          log.error(`Failed to insert post: ${err.message}`);
        } else {
          log.success(`Post added to database successfully (ID: ${this.lastID})`);
          log.info('Post details:');
          log.info(`- URI: ${testPost.uri}`);
          log.info(`- CID: ${testPost.cid}`);
          log.info(`- Creator: ${testPost.creator}`);
          log.info(`- Indexed at: ${testPost.indexedAt}`);
        }
        
        // Close the database connection
        db.close();
        
        log.section('Next Steps');
        log.info('1. Run the test-feed-indexing.js script to verify the post appears in the feed');
        log.info('2. If the post still doesn\'t appear in the feed, check the feed algorithm implementation');
        log.info('3. Look for any errors in the logs regarding feed generation or post filtering');
      }
    );
  });
}

// Run the script
addTestPost().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 