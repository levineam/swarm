#!/usr/bin/env node

/**
 * Add Test Post Script
 *
 * This script manually adds a test post to the feed generator database.
 * It helps diagnose issues by bypassing the firehose subscription and directly adding a post.
 *
 * Usage:
 *   node scripts/add-test-post.js <post-uri>
 *
 * If no post URI is provided, it will search for a recent post with #swarmtest hashtag.
 *
 * Example:
 *   node scripts/add-test-post.js at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/3juopmelyou2w
 */

const {BskyAgent} = require('@atproto/api')
const sqlite3 = require('sqlite3').verbose()
const {open} = require('sqlite')
const path = require('path')
const fs = require('fs')

// Format for nice console output
const log = {
  info: message => console.log(`ℹ️ ${message}`),
  success: message => console.log(`✅ ${message}`),
  warning: message => console.log(`⚠️ ${message}`),
  error: message => console.log(`❌ ${message}`),
  section: title =>
    console.log(`\n📋 ${title}\n${'='.repeat(title.length + 3)}`),
}

async function addTestPost() {
  log.section('Add Test Post to Database')

  // Get the post URI from command line arguments or find it
  const postUri = process.argv[2]
  let testPost

  // Initialize Bluesky agent
  const agent = new BskyAgent({service: 'https://bsky.social'})
  await agent.login({
    identifier: process.env.BSKY_USERNAME || 'andrarchy.bsky.social',
    password: process.env.BSKY_PASSWORD,
  })
  log.success('Logged in to Bluesky')

  if (postUri) {
    // If URI is provided, get post details
    log.info(`Fetching details for post: ${postUri}`)
    try {
      const response = await agent.getPost({uri: postUri})
      testPost = {
        uri: response.data.uri,
        cid: response.data.cid,
        creator: response.data.author.did,
      }
      log.success(
        `Found post: "${response.data.record.text.substring(0, 50)}..."`,
      )
    } catch (error) {
      log.error(`Error fetching post: ${error.message}`)
      process.exit(1)
    }
  } else {
    // If no URI provided, search for #swarmtest post
    log.info('No post URI provided. Searching for recent #swarmtest post...')
    try {
      const search = await agent.app.bsky.feed.searchPosts({q: '#swarmtest'})

      if (search.data.posts.length === 0) {
        log.error('No #swarmtest posts found.')
        log.info(
          'Please create a post with #swarmtest hashtag or provide a specific URI.',
        )
        process.exit(1)
      }

      testPost = {
        uri: search.data.posts[0].uri,
        cid: search.data.posts[0].cid,
        creator: search.data.posts[0].author.did,
      }

      log.success(
        `Found post: "${search.data.posts[0].record.text.substring(0, 50)}..."`,
      )
    } catch (error) {
      log.error(`Error searching for post: ${error.message}`)
      process.exit(1)
    }
  }

  // Find the database file
  const possibleDbPaths = [
    // Local development paths
    path.join(process.cwd(), 'swarm-feed.db'),
    path.join(
      process.cwd(),
      'swarm-feed-generator/feed-generator/swarm-feed.db',
    ),
    // Add more possible paths if needed
  ]

  let dbPath = null
  for (const possiblePath of possibleDbPaths) {
    if (fs.existsSync(possiblePath)) {
      dbPath = possiblePath
      break
    }
  }

  if (!dbPath) {
    log.error('Could not find the database file.')
    log.info(
      "Please ensure you're running this script from the correct directory.",
    )
    process.exit(1)
  }

  log.info(`Using database at: ${dbPath}`)

  // Open the database
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    // Check if the post already exists
    const existingPost = await db.get(
      'SELECT * FROM post WHERE uri = ?',
      testPost.uri,
    )

    if (existingPost) {
      log.warning(`Post already exists in database: ${testPost.uri}`)
      log.info('Post details:')
      log.info(`URI: ${existingPost.uri}`)
      log.info(`CID: ${existingPost.cid}`)
      log.info(`Creator: ${existingPost.creator}`)
      log.info(`Indexed at: ${existingPost.indexedAt}`)
    } else {
      // Add the post to the database
      log.info('Adding post to database...')

      await db.run(
        'INSERT INTO post (uri, cid, creator, indexedAt) VALUES (?, ?, ?, ?)',
        testPost.uri,
        testPost.cid,
        testPost.creator,
        new Date().toISOString(),
      )

      log.success('Post added to database successfully')

      // Verify it was added
      const post = await db.get(
        'SELECT * FROM post WHERE uri = ?',
        testPost.uri,
      )
      log.info('Post details:')
      log.info(`URI: ${post.uri}`)
      log.info(`CID: ${post.cid}`)
      log.info(`Creator: ${post.creator}`)
      log.info(`Indexed at: ${post.indexedAt}`)
    }

    // Check if the creator is in the SWARM_COMMUNITY_MEMBERS list
    // This is a heuristic check since we don't have direct access to that array here
    log.info(`Post creator DID: ${testPost.creator}`)
    log.info(
      'Ensure this DID is included in the SWARM_COMMUNITY_MEMBERS array in src/swarm-community-members.ts',
    )

    await db.close()

    log.section('Next Steps')
    log.info('1. Check if the post appears in the feed:')
    log.info(
      `   curl "https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community"`,
    )
    log.info(
      '2. If the post does not appear, check the feed algorithm implementation.',
    )
    log.info('3. Update the progress in feed-generator-debugging.md.')
  } catch (error) {
    log.error(`Database error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
  }
}

addTestPost().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
