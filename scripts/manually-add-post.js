// scripts/manually-add-post.js
// This script manually adds a post to the feed database
// For more information, see .cursor/instructions/feed-indexing-troubleshooting-guide.md

import {BskyAgent} from '@atproto/api'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

// Load environment variables
dotenv.config()

// Utility logging functions
const info = message => console.log(`ℹ️ ${message}`)
const success = message => console.log(`✅ ${message}`)
const warning = message => console.log(`⚠️ ${message}`)
const error = message => console.log(`❌ ${message}`)

async function manuallyAddPost() {
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
        'No post URI provided. Usage: node scripts/manually-add-post.js <post-uri>',
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
      author: postView.data.post.author.did,
      text: postView.data.post.record.text,
      createdAt: postView.data.post.record.createdAt,
    }

    // Send the post to the feed generator's admin endpoint
    const feedGeneratorUrl =
      'https://swarm-feed-generator.onrender.com/admin/add-post'

    info(`Sending post to feed generator at ${feedGeneratorUrl}`)

    const response = await fetch(feedGeneratorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_TOKEN || 'admin-token'}`,
      },
      body: JSON.stringify(post),
    })

    if (response.ok) {
      const result = await response.json()
      success(`Post added to feed: ${JSON.stringify(result)}`)
    } else {
      const errorText = await response.text()
      error(`Failed to add post: ${response.status} ${response.statusText}`)
      error(`Error details: ${errorText}`)
    }
  } catch (err) {
    error(`Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack)
    }
  }
}

manuallyAddPost()
