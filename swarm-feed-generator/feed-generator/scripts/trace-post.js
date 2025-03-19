#!/usr/bin/env node

/**
 * Post Tracer - Simple version
 *
 * This script traces a post through the system to diagnose feed issues
 */

const sqlite3 = require('sqlite3').verbose()
const axios = require('axios')
const path = require('path')
const fs = require('fs')

// Configuration
const POST_URI = process.argv[2]
const DB_PATH = path.join(__dirname, '../swarm-feed.db')
const FEED_URI =
  'at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community'
const FEED_URL =
  'https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton'

// Check command line arguments
if (!POST_URI) {
  console.error('Error: No post URI provided')
  console.log('Usage: node trace-post.js <post-uri>')
  process.exit(1)
}

// Extract creator DID from post URI
const didMatch = POST_URI.match(/at:\/\/(did:[^\/]+)/)
if (!didMatch) {
  console.error('Error: Invalid post URI format')
  process.exit(1)
}
const creatorDid = didMatch[1]

// Main trace function
async function tracePost() {
  console.log('=== Post Trace Tool ===')
  console.log(`Tracing post: ${POST_URI}`)
  console.log(`Creator DID: ${creatorDid}`)

  // Step 1: Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Error: Database not found at ${DB_PATH}`)
    process.exit(1)
  }

  // Step 2: Connect to database
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error(`Database connection error: ${err.message}`)
      process.exit(1)
    }
    console.log(`Connected to database at ${DB_PATH}`)

    // Step 3: Check if post exists in database
    db.get('SELECT * FROM post WHERE uri = ?', [POST_URI], (err, row) => {
      if (err) {
        console.error(`Query error: ${err.message}`)
        db.close()
        process.exit(1)
      }

      console.log('\n=== Database Check ===')
      if (row) {
        console.log('✅ Post found in database:')
        console.log(`- URI: ${row.uri}`)
        console.log(`- CID: ${row.cid}`)
        console.log(`- Creator: ${row.creator}`)
        console.log(`- Indexed at: ${row.indexedAt}`)
      } else {
        console.log('❌ Post NOT found in database')
        console.log('Recommendation: Add post manually with:')
        console.log(`node scripts/manual-add-post.js "${POST_URI}"`)
      }

      // Step 4: Count creator's posts
      db.get(
        'SELECT COUNT(*) as count FROM post WHERE creator = ?',
        [creatorDid],
        (err, countRow) => {
          if (err) {
            console.error(`Count query error: ${err.message}`)
            db.close()
            process.exit(1)
          }

          console.log(`\nCreator has ${countRow.count} posts in the database`)

          // Step 5: Check if in community members config
          try {
            const communityMembersPath = path.join(
              __dirname,
              '../src/swarm-community-members.ts',
            )
            const communityMembersContent = fs.readFileSync(
              communityMembersPath,
              'utf8',
            )
            const didInConfig = communityMembersContent.includes(creatorDid)

            console.log('\n=== Community Membership ===')
            console.log(
              didInConfig
                ? '✅ Creator is in community members config'
                : '❌ Creator is NOT in community members config',
            )

            if (!didInConfig) {
              console.log(
                'Recommendation: Add creator to community members with:',
              )
              console.log(
                `node scripts/add-community-member.js "${creatorDid}" "handle"`,
              )
            }

            // Step 6: Check feed endpoint
            checkFeedEndpoint(POST_URI).then(() => {
              // Close database connection when all checks are done
              db.close()
              console.log('\n=== Trace complete ===')
            })
          } catch (error) {
            console.error(`Error checking community members: ${error.message}`)
            db.close()
          }
        },
      )
    })
  })
}

// Helper function to check feed endpoint
async function checkFeedEndpoint(postUri) {
  console.log('\n=== Feed Endpoint Check ===')
  try {
    const feedUrl = `${FEED_URL}?feed=${encodeURIComponent(FEED_URI)}&limit=100`
    console.log(`Querying: ${feedUrl}`)

    const response = await axios.get(feedUrl)

    if (response.status === 200 && response.data && response.data.feed) {
      const feed = response.data.feed
      console.log(`Feed returned ${feed.length} posts`)

      const postInFeed = feed.some((item) => item.post === postUri)
      if (postInFeed) {
        console.log('✅ Post IS in feed output')
      } else {
        console.log('❌ Post is NOT in feed output')
        console.log('\nPotential issues:')
        console.log('1. Feed algorithm implementation (swarm-community.ts)')
        console.log('2. Caching issues with feed endpoint')
        console.log('3. Query parameters for community members')
      }
    } else {
      console.log(
        `❌ Feed endpoint returned unexpected response: ${response.status}`,
      )
    }
  } catch (error) {
    console.log(`❌ Error querying feed endpoint: ${error.message}`)
  }
}

// Run the trace
tracePost().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
