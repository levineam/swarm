#!/usr/bin/env node

/**
 * Check Feed Algorithm Script
 *
 * This script checks if the feed algorithm is working correctly by comparing
 * the posts in the database with the posts in the feed. It helps diagnose
 * issues with the feed algorithm not properly filtering posts from community members.
 *
 * Usage:
 *   node scripts/check-feed-algorithm.js [limit]
 *
 * Example:
 *   node scripts/check-feed-algorithm.js 50
 *
 * The default is to check the 20 most recent posts if not specified.
 */

const axios = require('axios')
const {
  SWARM_COMMUNITY_MEMBERS,
} = require('../swarm-feed-generator/feed-generator/src/swarm-community-members')

// Configuration
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'
const FEED_URI =
  'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'
const DEFAULT_LIMIT = 20

// Get limit from command line arguments or use default
const limit = parseInt(process.argv[2]) || DEFAULT_LIMIT

// Format time for logging
function formatTime() {
  return new Date().toISOString()
}

// Get posts from the database
async function getPostsFromDatabase(limit) {
  try {
    const response = await axios.get(
      `${FEED_GENERATOR_URL}/admin/stats?limit=${limit}`,
    )
    return response.data.recentPosts || []
  } catch (error) {
    console.error(`[${formatTime()}] Error getting posts from database:`)
    if (error.response) {
      console.error(`Status: ${error.response.status}`)
      console.error('Response:', error.response.data)
    } else {
      console.error(error.message)
    }
    return []
  }
}

// Get posts from the feed
async function getPostsFromFeed() {
  try {
    const response = await axios.get(
      `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        FEED_URI,
      )}`,
    )
    return response.data.feed || []
  } catch (error) {
    console.error(`[${formatTime()}] Error getting posts from feed:`)
    if (error.response) {
      console.error(`Status: ${error.response.status}`)
      console.error('Response:', error.response.data)
    } else {
      console.error(error.message)
    }
    return []
  }
}

// Check if a post should be in the feed based on the algorithm
function shouldBeInFeed(post) {
  return SWARM_COMMUNITY_MEMBERS.includes(post.creator)
}

// Main function
async function main() {
  console.log(`[${formatTime()}] Starting feed algorithm check`)
  console.log(`[${formatTime()}] Checking the ${limit} most recent posts`)

  // Get posts from the database
  console.log(`[${formatTime()}] Getting posts from the database...`)
  const databasePosts = await getPostsFromDatabase(limit)
  console.log(
    `[${formatTime()}] Found ${databasePosts.length} posts in the database`,
  )

  // Get posts from the feed
  console.log(`[${formatTime()}] Getting posts from the feed...`)
  const feedPosts = await getPostsFromFeed()
  console.log(`[${formatTime()}] Found ${feedPosts.length} posts in the feed`)

  // Extract post URIs from feed
  const feedPostUris = feedPosts.map(post => post.post)

  // Check which posts should be in the feed based on the algorithm
  const shouldBeInFeedPosts = databasePosts.filter(post => shouldBeInFeed(post))
  console.log(
    `[${formatTime()}] ${shouldBeInFeedPosts.length} out of ${
      databasePosts.length
    } posts should be in the feed based on the algorithm`,
  )

  // Check which posts that should be in the feed are actually in the feed
  const correctlyInFeedPosts = shouldBeInFeedPosts.filter(post =>
    feedPostUris.includes(post.uri),
  )
  console.log(
    `[${formatTime()}] ${correctlyInFeedPosts.length} out of ${
      shouldBeInFeedPosts.length
    } posts that should be in the feed are actually in the feed`,
  )

  // Check which posts that should be in the feed are missing from the feed
  const missingFromFeedPosts = shouldBeInFeedPosts.filter(
    post => !feedPostUris.includes(post.uri),
  )
  console.log(
    `[${formatTime()}] ${
      missingFromFeedPosts.length
    } posts that should be in the feed are missing`,
  )

  // Check which posts in the feed shouldn't be there
  const feedPostsDetails = await Promise.all(
    feedPostUris.map(async uri => {
      try {
        const response = await axios.get(
          `${FEED_GENERATOR_URL}/admin/post?uri=${encodeURIComponent(uri)}`,
        )
        return response.data
      } catch (error) {
        return {uri, error: true}
      }
    }),
  )

  const incorrectlyInFeedPosts = feedPostsDetails.filter(
    post => !post.error && !shouldBeInFeed(post),
  )
  console.log(
    `[${formatTime()}] ${
      incorrectlyInFeedPosts.length
    } posts in the feed shouldn't be there based on the algorithm`,
  )

  // Print detailed results
  if (missingFromFeedPosts.length > 0) {
    console.log(
      `\n[${formatTime()}] Posts that should be in the feed but are missing:`,
    )
    missingFromFeedPosts.forEach((post, index) => {
      console.log(`${index + 1}. [${post.indexedAt}] Creator: ${post.creator}`)
      console.log(`   URI: ${post.uri}`)
    })

    console.log(
      `\n[${formatTime()}] Would you like to add these missing posts to the feed? (Y/n)`,
    )
    console.log(
      `Run: node scripts/add-posts-to-feed.js ${missingFromFeedPosts
        .map(post => post.uri)
        .join(' ')}`,
    )
  }

  if (incorrectlyInFeedPosts.length > 0) {
    console.log(
      `\n[${formatTime()}] Posts that are in the feed but shouldn't be:`,
    )
    incorrectlyInFeedPosts.forEach((post, index) => {
      console.log(`${index + 1}. [${post.indexedAt}] Creator: ${post.creator}`)
      console.log(`   URI: ${post.uri}`)
    })
  }

  // Summary
  console.log(`\n[${formatTime()}] Feed Algorithm Check Summary:`)
  console.log(`- Total posts in database: ${databasePosts.length}`)
  console.log(`- Posts that should be in feed: ${shouldBeInFeedPosts.length}`)
  console.log(`- Posts actually in feed: ${feedPosts.length}`)
  console.log(`- Posts correctly in feed: ${correctlyInFeedPosts.length}`)
  console.log(`- Posts missing from feed: ${missingFromFeedPosts.length}`)
  console.log(`- Posts incorrectly in feed: ${incorrectlyInFeedPosts.length}`)

  // Conclusion
  if (
    missingFromFeedPosts.length === 0 &&
    incorrectlyInFeedPosts.length === 0
  ) {
    console.log(
      `\n[${formatTime()}] ✅ The feed algorithm is working correctly!`,
    )
  } else {
    console.log(
      `\n[${formatTime()}] ❌ The feed algorithm is NOT working correctly.`,
    )
    console.log(
      `[${formatTime()}] Consider investigating the feed algorithm implementation in swarm-feed-generator/feed-generator/src/algos/swarm-community.ts`,
    )
  }
}

// Run the script
main().catch(error => {
  console.error(`[${formatTime()}] Unhandled error: ${error.message}`)
  process.exit(1)
})
