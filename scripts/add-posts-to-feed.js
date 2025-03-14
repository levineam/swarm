#!/usr/bin/env node

/**
 * Add Posts to Feed Script
 *
 * This script manually adds your recent posts to the feed generator's database.
 * It's useful for testing if the issue is with the firehose subscription or database persistence.
 *
 * Note: This script requires direct access to the feed generator's database, which may not be
 * possible if the feed generator is hosted on Render's free tier with no database persistence.
 */

const {BskyAgent} = require('@atproto/api')
const {Kysely} = require('kysely')
const {SqliteDialect} = require('kysely/sqlite')
const Database = require('better-sqlite3')
require('dotenv').config()

// Configuration
const YOUR_DID = 'did:plc:ouadmsyvsfcpkxg3yyz4trqi' // andrarchy.bsky.social
const DB_PATH = process.env.DB_PATH || './swarm-feed.db' // Path to the feed generator's database

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
        creator: YOUR_DID,
        indexedAt: new Date().toISOString(),
        text: item.post.record.text,
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

async function connectToDatabase() {
  log.section('Connecting to Database')

  try {
    log.info(`Connecting to database at ${DB_PATH}`)

    const db = new Kysely({
      dialect: new SqliteDialect({
        database: new Database(DB_PATH),
      }),
    })

    // Test the connection
    const result = await db
      .selectFrom('sqlite_master')
      .select('name')
      .where('type', '=', 'table')
      .execute()

    log.success(`Connected to database. Found ${result.length} tables`)
    log.info(`Tables: ${result.map(r => r.name).join(', ')}`)

    return db
  } catch (error) {
    log.error(`Error connecting to database: ${error.message}`)
    throw error
  }
}

async function addPostsToDatabase(db, posts) {
  log.section('Adding Posts to Database')

  try {
    // Check if the post table exists
    const tables = await db
      .selectFrom('sqlite_master')
      .select('name')
      .where('type', '=', 'table')
      .execute()
    const postTableExists = tables.some(t => t.name === 'post')

    if (!postTableExists) {
      log.error('Post table does not exist in the database')
      return false
    }

    // Add posts to the database
    log.info(`Adding ${posts.length} posts to the database`)

    for (const post of posts) {
      // Check if the post already exists
      const existingPost = await db
        .selectFrom('post')
        .select('uri')
        .where('uri', '=', post.uri)
        .execute()

      if (existingPost.length > 0) {
        log.info(`Post already exists in database: ${post.uri}`)
      } else {
        // Add the post to the database
        await db
          .insertInto('post')
          .values({
            uri: post.uri,
            cid: post.cid,
            creator: post.creator,
            indexedAt: post.indexedAt,
          })
          .execute()

        log.success(`Added post to database: ${post.uri}`)
      }
    }

    return true
  } catch (error) {
    log.error(`Error adding posts to database: ${error.message}`)
    return false
  }
}

async function verifyPostsInDatabase(db, posts) {
  log.section('Verifying Posts in Database')

  try {
    // Get all posts from the database
    const dbPosts = await db
      .selectFrom('post')
      .select(['uri', 'creator'])
      .execute()

    log.info(`Found ${dbPosts.length} posts in the database`)

    // Check if your posts are in the database
    const postUris = posts.map(p => p.uri)
    const foundPosts = dbPosts.filter(p => postUris.includes(p.uri))

    if (foundPosts.length === posts.length) {
      log.success('All posts were successfully added to the database')
    } else {
      log.warning(
        `Only ${foundPosts.length} out of ${posts.length} posts were found in the database`,
      )

      // List missing posts
      const foundUris = foundPosts.map(p => p.uri)
      const missingPosts = posts.filter(p => !foundUris.includes(p.uri))

      log.info('Missing posts:')
      missingPosts.forEach(post => {
        log.info(`- "${post.text}" (${post.uri})`)
      })
    }
  } catch (error) {
    log.error(`Error verifying posts in database: ${error.message}`)
  }
}

async function addPostsToFeed() {
  log.section('Add Posts to Feed')
  log.info(
    "This script manually adds your recent posts to the feed generator's database.",
  )

  try {
    // Get your recent posts
    const posts = await getYourRecentPosts()

    if (posts.length === 0) {
      log.error('No posts to add')
      return
    }

    // Connect to the database
    const db = await connectToDatabase()

    // Add posts to the database
    const success = await addPostsToDatabase(db, posts)

    if (success) {
      // Verify posts in the database
      await verifyPostsInDatabase(db, posts)

      log.section('Next Steps')
      log.info(
        '1. Restart the feed generator service to ensure it loads the updated database',
      )
      log.info(
        '2. Check the feed in the Bluesky app to see if your posts now appear',
      )
      log.info(
        "3. If your posts still don't appear, check the Render logs for any errors",
      )
    }
  } catch (error) {
    log.error(`Error adding posts to feed: ${error.message}`)

    log.section('Alternative Approach')
    log.info(
      "Since direct database access might not be possible with Render's free tier, consider:",
    )
    log.info(
      '1. Redeploying the feed generator service with a clear build cache',
    )
    log.info(
      '2. Making a new post and waiting a few minutes for it to be indexed',
    )
    log.info('3. Setting up a periodic ping to keep the service active')
  }
}

// Run the script
addPostsToFeed().catch(error => {
  log.error(`Unhandled error: ${error.message}`)
  process.exit(1)
})
