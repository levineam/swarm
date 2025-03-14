#!/usr/bin/env node

/**
 * Test Feed Indexing Script
 *
 * This script tests if the feed generator is properly indexing posts from your account.
 * It checks both the feed generator's database and the feed skeleton endpoint.
 */

const fetch = require('node-fetch')
const {BskyAgent} = require('@atproto/api')
require('dotenv').config()

// Configuration
const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'
const FEED_URI =
  'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'
const YOUR_DID = 'did:plc:ouadmsyvsfcpkxg3yyz4trqi' // andrarchy.bsky.social

// Utility functions
const log = {
  info: message => console.log(`ℹ️ ${message}`),
  success: message => console.log(`✅ ${message}`),
  warning: message => console.log(`⚠️ ${message}`),
  error: message => console.log(`❌ ${message}`),
  section: title =>
    console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`),
}

async function getYourRecentPosts() {
  log.section('Fetching Your Recent Posts')

  try {
    const agent = new BskyAgent({
      service: 'https://bsky.social',
    })

    // Login
    await agent.login({
      identifier: process.env.BLUESKY_USERNAME || 'andrarchy.bsky.social',
      password: process.env.BLUESKY_PASSWORD,
    })

    log.success('Logged in successfully')

    // Get your recent posts
    const result = await agent.getAuthorFeed({
      actor: agent.session.did,
      limit: 10,
    })

    if (result.success && result.data.feed.length > 0) {
      log.success(`Found ${result.data.feed.length} recent posts`)

      // Extract post URIs and text
      const posts = result.data.feed.map(item => ({
        uri: item.post.uri,
        cid: item.post.cid,
        text: item.post.record.text,
        createdAt: item.post.record.createdAt,
      }))

      log.info('Recent posts:')
      posts.forEach((post, index) => {
        log.info(`${index + 1}. "${post.text}" (${post.uri})`)
      })

      return posts
    } else {
      log.warning('No recent posts found')
      return []
    }
  } catch (error) {
    log.error(`Error fetching recent posts: ${error.message}`)
    return []
  }
}

async function checkFeedSkeleton() {
  log.section('Checking Feed Skeleton Endpoint')

  try {
    log.info(
      `Fetching feed skeleton from ${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        FEED_URI,
      )}`,
    )

    const response = await fetch(
      `${FEED_GENERATOR_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        FEED_URI,
      )}`,
    )

    if (response.ok) {
      const data = await response.json()
      log.success('Feed skeleton endpoint responded successfully')

      if (data.feed && data.feed.length > 0) {
        log.success(`Feed contains ${data.feed.length} posts`)
        return data.feed
      } else {
        log.warning('Feed skeleton is empty')
        return []
      }
    } else {
      log.error(`Feed skeleton endpoint returned status ${response.status}`)
      return []
    }
  } catch (error) {
    log.error(`Error fetching feed skeleton: ${error.message}`)
    return []
  }
}

async function comparePostsWithFeed(yourPosts, feedPosts) {
  log.section('Comparing Your Posts with Feed')

  if (yourPosts.length === 0) {
    log.warning('No posts to compare (you have no recent posts)')
    return
  }

  if (feedPosts.length === 0) {
    log.warning('No posts to compare (feed is empty)')
    return
  }

  // Extract post URIs from your posts
  const yourPostUris = yourPosts.map(post => post.uri)

  // Extract post URIs from feed posts
  const feedPostUris = feedPosts.map(post => post.post)

  // Find posts that are in your posts but not in the feed
  const missingPosts = yourPostUris.filter(uri => !feedPostUris.includes(uri))

  if (missingPosts.length === 0) {
    log.success('All of your recent posts are in the feed!')
  } else {
    log.warning(
      `${missingPosts.length} of your posts are missing from the feed`,
    )

    log.info('Missing posts:')
    missingPosts.forEach(uri => {
      const post = yourPosts.find(p => p.uri === uri)
      log.info(`- "${post.text}" (${uri})`)
    })

    log.info('\nPossible reasons for missing posts:')
    log.info(
      '1. The feed generator might not be properly subscribing to the firehose',
    )
    log.info('2. The feed generator might have spun down and missed your posts')
    log.info('3. There might be a delay in indexing new posts')
    log.info('4. The database might not be persisted between service restarts')
  }
}

async function testFeedIndexing() {
  log.section('Feed Indexing Test')
  log.info(
    'This script tests if the feed generator is properly indexing posts from your account.',
  )

  // Get your recent posts
  const yourPosts = await getYourRecentPosts()

  // Check the feed skeleton
  const feedPosts = await checkFeedSkeleton()

  // Compare your posts with the feed
  await comparePostsWithFeed(yourPosts, feedPosts)

  log.section('Test Complete')
  log.info('If your posts are missing from the feed, try the following:')
  log.info('1. Make a new post and wait a few minutes for it to be indexed')
  log.info(
    '2. Check the Render logs for any errors in the feed generator service',
  )
  log.info(
    "3. Restart the feed generator service to ensure it's properly subscribing to the firehose",
  )
  log.info(
    '4. Verify that your DID is correctly listed in the SWARM_COMMUNITY_MEMBERS array',
  )
}

// Run the test
testFeedIndexing().catch(error => {
  log.error(`Unhandled error during test: ${error.message}`)
  process.exit(1)
})
