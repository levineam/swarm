#!/usr/bin/env node

/**
 * Test Feed Indexing Script
 * 
 * This script checks if posts from community members are properly being indexed
 * by comparing the post authors in the database with the community members list.
 */

const axios = require('axios');
const { BskyAgent } = require('@atproto/api');

// Configuration
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com';
const BLUESKY_API = 'https://bsky.social';

async function main() {
  console.log('=== Feed Indexing Test ===');
  console.log('Testing if posts from community members are properly being indexed');
  console.log(`Feed Generator URL: ${FEED_GENERATOR_URL}`);
  
  try {
    // Step 1: Get feed diagnostic information
    console.log('\n1. Fetching feed diagnostic information...');
    const feedDiagnostic = await axios.get(`${FEED_GENERATOR_URL}/debug/feed`);
    
    const { community, database, firehose } = feedDiagnostic.data;
    
    console.log(`Community members: ${community.memberCount}`);
    console.log(`Total posts in database: ${database.totalPosts}`);
    console.log(`Firehose connected: ${firehose.connected}`);
    
    // Step 2: Check if any community members have posts
    console.log('\n2. Checking community member posts...');
    if (community.postsPerMember.length === 0) {
      console.log('⚠️ No posts from community members found in the database');
    } else {
      console.log('✅ Found posts from community members:');
      community.postsPerMember.forEach(member => {
        console.log(`  - ${member.creator}: ${member.postCount} posts`);
      });
    }
    
    // Step 3: Connect to Bluesky to check for recent posts
    console.log('\n3. Checking for recent posts from community members on Bluesky...');
    const agent = new BskyAgent({ service: BLUESKY_API });
    
    // Check for each community member
    for (const memberDid of community.members) {
      console.log(`\nChecking posts for ${memberDid}...`);
      
      try {
        // Get profile
        const profile = await agent.getProfile({ actor: memberDid });
        console.log(`Profile: @${profile.data.handle}`);
        
        // Get recent posts
        const posts = await agent.getAuthorFeed({ actor: memberDid, limit: 10 });
        
        if (posts.data.feed.length === 0) {
          console.log('⚠️ No recent posts found on Bluesky');
        } else {
          console.log(`✅ Found ${posts.data.feed.length} recent posts on Bluesky`);
          
          // Log post URIs and check if they're in our database
          for (const feedItem of posts.data.feed.slice(0, 3)) {
            const postUri = feedItem.post.uri;
            console.log(`  - Post URI: ${postUri}`);
            
            // Check if the post is in our database
            const inDatabase = database.recentPosts.some(post => post.uri === postUri);
            if (inDatabase) {
              console.log('    ✅ Post is in our database');
            } else {
              console.log('    ❌ Post is NOT in our database');
            }
          }
        }
      } catch (error) {
        console.error(`Error checking posts for ${memberDid}:`, error.message);
      }
    }
    
    // Step 4: Check firehose health
    console.log('\n4. Checking firehose health...');
    if (firehose.connected) {
      console.log('✅ Firehose is connected');
      console.log(`Last cursor: ${firehose.lastCursor}`);
      if (firehose.stats) {
        console.log(`Connection started: ${firehose.stats.connectionStartTime}`);
        console.log(`Connection age: ${firehose.stats.connectionAge}`);
        console.log(`Events processed: ${firehose.stats.eventCount}`);
      }
    } else {
      console.log('❌ Firehose is NOT connected');
      console.log('This could be why posts are not being indexed');
    }
    
    // Step 5: Summary and recommendations
    console.log('\n5. Summary and recommendations:');
    if (community.postsPerMember.length === 0 && database.totalPosts > 0) {
      console.log('⚠️ The database contains posts, but none from community members');
      console.log('Potential issues:');
      console.log('  - Community member DIDs may be incorrect');
      console.log('  - The isSwarmCommunityMember function may not be working correctly');
      console.log('  - Community members may not have posted recently');
    } else if (database.totalPosts === 0) {
      console.log('⚠️ The database contains no posts at all');
      console.log('Potential issues:');
      console.log('  - Firehose connection may not be working properly');
      console.log('  - Database may be getting reset between deployments');
      console.log('  - The handleEvent method may not be correctly processing events');
    } else if (community.postsPerMember.length > 0) {
      console.log('✅ The system appears to be working correctly');
      console.log('  - There are posts from community members in the database');
      console.log('  - The firehose connection is established');
      console.log('The empty feed issue may be related to:');
      console.log('  - The feed algorithm not returning posts correctly');
      console.log('  - Issues with the Swarm social app retrieving the feed');
    }
    
  } catch (error) {
    console.error('Error running feed indexing test:', error.message);
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