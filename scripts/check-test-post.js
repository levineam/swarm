#!/usr/bin/env node

/**
 * Check Test Post Script
 *
 * This script checks if a specific test post exists in the feed generator database.
 * It helps diagnose issues with the feed generator by verifying if posts are being indexed.
 *
 * Usage:
 *   node scripts/check-test-post.js <post-uri>
 *
 * Example:
 *   node scripts/check-test-post.js at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/3juopmelyou2w
 */

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

async function checkTestPost() {
  log.section('Test Post Verification')

  // Get the post URI from command line arguments
  const postUri = process.argv[2]
  if (!postUri) {
    log.error('No post URI provided.')
    log.info('Usage: node scripts/check-test-post.js <post-uri>')
    process.exit(1)
  }

  log.info(`Checking for post: ${postUri}`)

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

    // Check if the post exists in the database
    const post = await db.get('SELECT * FROM post WHERE uri = ?', postUri)

    if (post) {
      log.success('Post found in the database!')
      log.info('Post details:')
      log.info(`URI: ${post.uri}`)
      log.info(`CID: ${post.cid}`)
      log.info(`Creator: ${post.creator}`)
      log.info(`Indexed at: ${post.indexedAt}`)
    } else {
      log.warning('Post NOT found in the database.')
      log.info(
        'This suggests the post is not being indexed by the feed generator.',
      )

      // Check if any posts exist in the database
      const count = await db.get('SELECT COUNT(*) as count FROM post')
      log.info(`Total posts in database: ${count.count}`)

      if (count.count > 0) {
        // Show a few sample posts if any exist
        const samplePosts = await db.all('SELECT * FROM post LIMIT 3')
        log.info('Sample posts in database:')
        samplePosts.forEach((p, i) => {
          log.info(`Post ${i + 1}: ${p.uri} (creator: ${p.creator})`)
        })
      }
    }

    // Check if the creator is in the SWARM_COMMUNITY_MEMBERS list
    // This is a heuristic check since we don't have direct access to that array here
    const creatorDid = postUri.split('/')[0].replace('at://', '')
    log.info(`Post creator DID: ${creatorDid}`)
    log.info(
      'Ensure this DID is included in the SWARM_COMMUNITY_MEMBERS array in src/swarm-community-members.ts',
    )

    await db.close()
  } catch (error) {
    log.error(`Database error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
  }
}

checkTestPost().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
