const { BskyAgent } = require('@atproto/api');
const axios = require('axios');
require('dotenv').config();

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

async function manuallyAddPosts() {
  log.section('Manual Add Posts to Feed');
  log.info('This script will manually add your recent posts to the feed database.');

  // Login to Bluesky
  log.section('Logging in to Bluesky');
  const agent = new BskyAgent({ service: 'https://bsky.social' });
  try {
    await agent.login({
      identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
      password: process.env.BLUESKY_PASSWORD
    });
    log.success('Logged in successfully');
  } catch (error) {
    log.error(`Failed to log in: ${error.message}`);
    return;
  }

  // Fetch recent posts
  log.section('Fetching Your Recent Posts');
  let posts = [];
  try {
    const response = await agent.getAuthorFeed({
      actor: agent.session.did,
      limit: 10,
    });
    posts = response.data.feed.map(item => ({
      uri: item.post.uri,
      cid: item.post.cid,
      text: item.post.record.text,
      createdAt: item.post.record.createdAt
    }));
    log.success(`Found ${posts.length} recent posts`);
    posts.forEach((post, index) => {
      log.info(`${index + 1}. "${post.text}" (${post.uri})`);
    });
  } catch (error) {
    log.error(`Failed to fetch posts: ${error.message}`);
    return;
  }

  // Manually add posts to the feed
  log.section('Adding Posts to Feed Database');
  
  // First, check if the admin endpoint exists
  try {
    const adminEndpoint = 'https://swarm-feed-generator.onrender.com/admin/stats';
    log.info(`Checking if admin endpoint exists at ${adminEndpoint}...`);
    const adminResponse = await axios.get(adminEndpoint);
    log.success(`Admin endpoint exists! Status: ${adminResponse.status}`);
    log.info(`Database stats: ${JSON.stringify(adminResponse.data)}`);
  } catch (error) {
    log.warning(`Admin endpoint not available: ${error.message}`);
    log.info('Will try to use direct database access instead.');
  }

  // Generate SQL statements to manually add posts
  log.section('SQL Statements for Manual Database Update');
  log.info('You can use these SQL statements to manually add posts to the database:');
  
  posts.forEach(post => {
    const uri = post.uri;
    const cid = post.cid;
    const authorDid = agent.session.did;
    const createdAt = new Date(post.createdAt).getTime();
    
    const sql = `INSERT OR REPLACE INTO posts (uri, cid, author, created_at, indexed_at, feed) VALUES ('${uri}', '${cid}', '${authorDid}', ${createdAt}, ${Date.now()}, 'swarm-community');`;
    log.info(sql);
  });

  // Try to use the admin endpoint to add posts
  log.section('Attempting to Add Posts via API');
  for (const post of posts) {
    try {
      const updateEndpoint = 'https://swarm-feed-generator.onrender.com/admin/update-feed';
      log.info(`Attempting to add post "${post.text.substring(0, 30)}..." to feed...`);
      
      const updateResponse = await axios.post(updateEndpoint, {
        feedName: 'swarm-community',
        postUri: post.uri,
        postCid: post.cid,
        authorDid: agent.session.did
      });
      
      log.success(`Successfully added post to feed! Status: ${updateResponse.status}`);
    } catch (error) {
      log.error(`Failed to add post to feed: ${error.message}`);
    }
  }

  log.section('Next Steps');
  log.info('1. Run the test-feed-indexing.js script to see if your posts now appear in the feed');
  log.info('2. If posts still don\'t appear, you may need to manually update the database on Render');
  log.info('3. Consider implementing a more persistent database solution for the feed generator');
}

manuallyAddPosts().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 