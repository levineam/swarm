#!/usr/bin/env node

/**
 * Auto-Add Community Posts Script
 *
 * This script automatically finds recent posts from Swarm community members
 * and adds them to the Swarm community feed using the admin endpoint.
 *
 * Usage:
 *   node scripts/auto-add-community-posts.js [hours_back]
 *
 * Example:
 *   node scripts/auto-add-community-posts.js 24
 *
 * The default is to look for posts from the last 24 hours if not specified.
 *
 * To run this script on a schedule (every hour):
 *   Set up a cron job: 0 * * * * cd /path/to/project && node scripts/auto-add-community-posts.js
 */

const axios = require('axios')
const {BskyAgent} = require('@atproto/api')
require('dotenv').config()

// Import the community members list
const {
  SWARM_COMMUNITY_MEMBERS,
} = require('../swarm-feed-generator/feed-generator/src/swarm-community-members')

// Configuration
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'
const FEED_URI =
  'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'
const DEFAULT_HOURS_BACK = 24

// Get hours back from command line arguments or use default
const hoursBack = parseInt(process.argv[2]) || DEFAULT_HOURS_BACK

// Format time for logging
function formatTime() {
  return new Date().toISOString()
}

// Initialize Bluesky agent
async function initializeAgent() {
  console.log(`[${formatTime()}] Initializing Bluesky agent...`)

  const agent = new BskyAgent({
    service: 'https://bsky.social',
  })

  // Check if we have credentials
  if (process.env.BLUESKY_USERNAME && process.env.BLUESKY_PASSWORD) {
    try {
      await agent.login({
        identifier: process.env.BLUESKY_USERNAME,
        password: process.env.BLUESKY_PASSWORD,
      })
      console.log(`[${formatTime()}] Logged in as ${agent.session.handle}`)
    } catch (error) {
      console.error(`[${formatTime()}] Error logging in: ${error.message}`)
      // Continue without login - we can still fetch public data
    }
  } else {
    console.log(
      `[${formatTime()}] No credentials provided, continuing without login`,
    )
  }

  return agent
}

// Get recent posts from a community member
async function getMemberPosts(agent, did, since) {
  try {
    const result = await agent.getAuthorFeed({
      actor: did,
      limit: 20,
    })

    if (!result.success) {
      console.error(`[${formatTime()}] Failed to get posts for ${did}`)
      return []
    }

    // Filter posts by date
    const recentPosts = result.data.feed
      .filter(item => {
        const postDate = new Date(item.post.indexedAt)
        return postDate >= since
      })
      .map(item => ({
        uri: item.post.uri,
        cid: item.post.cid,
        text:
          item.post.record.text.substring(0, 50) +
          (item.post.record.text.length > 50 ? '...' : ''),
        indexedAt: item.post.indexedAt,
      }))

    console.log(
      `[${formatTime()}] Found ${recentPosts.length} recent posts from ${did}`,
    )
    return recentPosts
  } catch (error) {
    console.error(
      `[${formatTime()}] Error getting posts for ${did}: ${error.message}`,
    )
    return []
  }
}

// Get current posts in the feed
async function getCurrentFeedPosts() {
  try {
    const response = await axios.get(
      `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        FEED_URI,
      )}`,
    )

    return response.data.feed.map(item => item.post)
  } catch (error) {
    console.error(
      `[${formatTime()}] Error getting current feed posts: ${error.message}`,
    )
    return []
  }
}

// Add posts to the feed
async function addPostsToFeed(postUris) {
  if (postUris.length === 0) {
    console.log(`[${formatTime()}] No new posts to add to the feed`)
    return
  }

  console.log(
    `[${formatTime()}] Adding ${postUris.length} posts to the feed...`,
  )

  try {
    const response = await axios.post(
      `${FEED_GENERATOR_URL}/admin/update-feed`,
      {
        feedUri: FEED_URI,
        postUris: postUris,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    console.log(
      `[${formatTime()}] Success! ${
        response.data.postCount
      } posts added to the feed`,
    )
  } catch (error) {
    console.error(`[${formatTime()}] Error adding posts to feed:`)
    if (error.response) {
      console.error(`Status: ${error.response.status}`)
      console.error('Response:', error.response.data)
    } else {
      console.error(error.message)
    }
  }
}

// Main function
async function main() {
  console.log(`[${formatTime()}] Starting auto-add community posts script`)
  console.log(
    `[${formatTime()}] Looking for posts from the last ${hoursBack} hours`,
  )

  // Calculate the cutoff time
  const since = new Date()
  since.setHours(since.getHours() - hoursBack)
  console.log(`[${formatTime()}] Cutoff time: ${since.toISOString()}`)

  // Initialize the Bluesky agent
  const agent = await initializeAgent()

  // Get current posts in the feed
  console.log(`[${formatTime()}] Getting current posts in the feed...`)
  const currentFeedPosts = await getCurrentFeedPosts()
  console.log(
    `[${formatTime()}] Found ${
      currentFeedPosts.length
    } posts currently in the feed`,
  )

  // Get recent posts from all community members
  console.log(
    `[${formatTime()}] Getting recent posts from ${
      SWARM_COMMUNITY_MEMBERS.length
    } community members...`,
  )

  let allRecentPosts = []
  for (const did of SWARM_COMMUNITY_MEMBERS) {
    const memberPosts = await getMemberPosts(agent, did, since)
    allRecentPosts = allRecentPosts.concat(memberPosts)
  }

  console.log(
    `[${formatTime()}] Found a total of ${
      allRecentPosts.length
    } recent posts from community members`,
  )

  // Filter out posts that are already in the feed
  const newPosts = allRecentPosts.filter(
    post => !currentFeedPosts.includes(post.uri),
  )
  console.log(
    `[${formatTime()}] Found ${newPosts.length} new posts to add to the feed`,
  )

  // Display the new posts
  if (newPosts.length > 0) {
    console.log(`[${formatTime()}] New posts to add:`)
    newPosts.forEach((post, index) => {
      console.log(
        `${index + 1}. [${post.indexedAt}] "${post.text}" (${post.uri})`,
      )
    })

    // Add the new posts to the feed
    await addPostsToFeed(newPosts.map(post => post.uri))
  }

  console.log(`[${formatTime()}] Script completed`)
}

// Run the script
main().catch(error => {
  console.error(`[${formatTime()}] Unhandled error: ${error.message}`)
  process.exit(1)
})
