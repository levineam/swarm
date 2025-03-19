#!/usr/bin/env node

/**
 * Check Feed Algorithm Script
 * 
 * This script queries the feed generator algorithm endpoint directly
 * to check if it's returning posts correctly.
 */

const axios = require('axios');

// Configuration
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com';
const FEED_URI = 'at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community';
const LIMIT = 20;
const CURSOR = process.argv[2]; // Optional cursor parameter

async function main() {
  console.log('=== Feed Algorithm Test ===');
  console.log(`Testing feed: ${FEED_URI}`);
  console.log(`Feed Generator URL: ${FEED_GENERATOR_URL}`);
  
  try {
    // Get feed diagnostic information first
    console.log('\n1. Fetching feed diagnostic information...');
    const diagnosticUrl = `${FEED_GENERATOR_URL}/debug/feed`;
    const diagnosticResponse = await axios.get(diagnosticUrl);
    
    const { community, database } = diagnosticResponse.data;
    console.log(`Community members: ${community.memberCount}`);
    console.log(`Total posts in database: ${database.totalPosts}`);
    
    // Build the getFeedSkeleton URL
    let feedUrl = `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(FEED_URI)}&limit=${LIMIT}`;
    if (CURSOR) {
      feedUrl += `&cursor=${encodeURIComponent(CURSOR)}`;
    }
    
    // Query the feed algorithm
    console.log('\n2. Querying the feed algorithm directly...');
    console.log(`URL: ${feedUrl}`);
    
    const response = await axios.get(feedUrl);
    
    // Check if we have feed items
    if (!response.data.feed || response.data.feed.length === 0) {
      console.log('⚠️ The feed algorithm returned no posts');
      console.log('\nPossible reasons:');
      console.log('  - No posts from community members in the database');
      console.log('  - Issue with the feed algorithm implementation');
      console.log('  - Incorrect feed URI');
    } else {
      console.log(`✅ The feed algorithm returned ${response.data.feed.length} posts`);
      
      // Show the posts
      console.log('\nPosts returned by the algorithm:');
      for (let i = 0; i < response.data.feed.length; i++) {
        const post = response.data.feed[i];
        console.log(`${i+1}. Post URI: ${post.post}`);
        
        // Check if this post is from a community member
        const postCreator = post.post.split('/')[2]; // Extract the DID from the URI
        const isFromCommunityMember = community.members.includes(postCreator);
        
        if (isFromCommunityMember) {
          console.log('   ✅ Post is from a community member');
        } else {
          console.log('   ⚠️ Post is NOT from a community member');
          console.log(`   Post creator: ${postCreator}`);
        }
      }
      
      // Show cursor if available
      if (response.data.cursor) {
        console.log(`\nCursor for pagination: ${response.data.cursor}`);
        console.log('To fetch the next page, run:');
        console.log(`node check-feed-algorithm.js "${response.data.cursor}"`);
      }
    }
    
    // Additional checks
    console.log('\n3. Checking database for posts from community members...');
    if (community.postsPerMember.length === 0) {
      console.log('⚠️ No posts from community members found in the database');
      console.log('The feed is empty because there are no posts to show');
    } else {
      console.log('✅ Found posts from community members in the database:');
      community.postsPerMember.forEach(member => {
        console.log(`  - ${member.creator}: ${member.postCount} posts`);
      });
      
      if (response.data.feed.length === 0) {
        console.log('\n⚠️ There are posts in the database but the algorithm is not returning them');
        console.log('This suggests an issue with the swarm-community algorithm implementation');
      }
    }
    
    // Summary
    console.log('\n4. Summary:');
    if (database.totalPosts === 0) {
      console.log('⚠️ The database contains no posts');
      console.log('Fix the firehose subscription to index posts first');
    } else if (community.postsPerMember.length === 0) {
      console.log('⚠️ The database contains posts, but none from community members');
      console.log('Add more community members or check the isSwarmCommunityMember function');
    } else if (response.data.feed.length === 0) {
      console.log('⚠️ The database contains posts from community members, but the algorithm returns none');
      console.log('Check the swarm-community algorithm implementation');
    } else {
      console.log('✅ The feed algorithm is working correctly');
      console.log('If the feed still appears empty in the Swarm app, check:');
      console.log('  - The DID resolution in the client');
      console.log('  - The feed URI used by the client');
      console.log('  - Network connectivity between the client and feed generator');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 