// scripts/manually-add-post-to-db.js
// This script directly adds a post to the feed database
// For more information, see .cursor/instructions/feed-indexing-troubleshooting-guide.md

const {BskyAgent} = require('@atproto/api')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')

// Load environment variables
dotenv.config()

// Utility logging functions
const info = message => console.log(`ℹ️ ${message}`)
const success = message => console.log(`✅ ${message}`)
const warning = message => console.log(`⚠️ ${message}`)
const error = message => console.log(`❌ ${message}`)

async function manuallyAddPostToDb() {
  try {
    // Initialize the Bluesky agent
    const agent = new BskyAgent({service: 'https://bsky.social'})

    // Login with credentials
    await agent.login({
      identifier: process.env.BLUESKY_USERNAME,
      password: process.env.BLUESKY_PASSWORD,
    })
    success('Logged in successfully')

    // Get the post URI from command line arguments
    const postUri = process.argv[2]
    if (!postUri) {
      error(
        'No post URI provided. Usage: node scripts/manually-add-post-to-db.js <post-uri>',
      )
      process.exit(1)
    }

    info(`Attempting to add post: ${postUri}`)

    // Get the post details
    const postView = await agent.getPost({uri: postUri})
    if (!postView) {
      error('Post not found')
      process.exit(1)
    }

    success('Post found')
    info(`Post text: "${postView.data.post.record.text}"`)

    // Extract the necessary information
    const post = {
      uri: postUri,
      cid: postView.data.post.cid,
      creator: postView.data.post.author.did,
      indexedAt: new Date().toISOString(),
    }

    // Open the SQLite database
    const dbPath = path.join(
      process.cwd(),
      'swarm-feed-generator',
      'feed-generator',
      'swarm-feed.db',
    )
    info(`Opening database at: ${dbPath}`)

    if (!fs.existsSync(dbPath)) {
      error(`Database file not found at: ${dbPath}`)
      info(
        'Please make sure the feed generator has been started at least once to create the database',
      )
      process.exit(1)
    }

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    // Check if the post already exists
    const existingPost = await db.get(
      'SELECT * FROM post WHERE uri = ?',
      post.uri,
    )
    if (existingPost) {
      warning(`Post already exists in the database: ${post.uri}`)
      info('Skipping insertion')
    } else {
      // Insert the post into the database
      info(`Inserting post into database: ${JSON.stringify(post)}`)
      await db.run(
        'INSERT INTO post (uri, cid, creator, indexedAt) VALUES (?, ?, ?, ?)',
        post.uri,
        post.cid,
        post.creator,
        post.indexedAt,
      )
      success(`Post added to database: ${post.uri}`)
    }

    // Verify the post was added
    const verifyPost = await db.get(
      'SELECT * FROM post WHERE uri = ?',
      post.uri,
    )
    if (verifyPost) {
      success(`Verified post in database: ${JSON.stringify(verifyPost)}`)
    } else {
      error('Failed to verify post in database')
    }

    // Close the database connection
    await db.close()
    success('Database connection closed')

    info('Next steps:')
    info('1. Restart the feed generator service to refresh the feed')
    info('2. Check the feed to see if your post appears')
  } catch (err) {
    error(`Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack)
    }
  }
}

manuallyAddPostToDb()
