#!/usr/bin/env node

/**
 * Trace Post Script
 *
 * This script traces a post through the feed generator system to verify its existence
 * and diagnose where it might be getting lost in the pipeline.
 */

const { BskyAgent } = require('@atproto/api')
const fs = require('fs')
const path = require('path')
const { createDb } = require('../src/db')

// Configuration
const BLUESKY_API = 'https://bsky.social'
const DB_PATH =
  process.env.DATABASE_PATH || path.join(__dirname, '../swarm-feed.db')

// Get command line arguments
const postUri = process.argv[2]

if (!postUri) {
  console.error('Error: No post URI provided')
  console.log('Usage: node trace-post.js <post-uri>')
  console.log(
    'Example: node trace-post.js at://did:plc:abcdefg123456/app.bsky.feed.post/12345',
  )
  console.log('\nOptions:')
  console.log('DATABASE_PATH - Environment variable to specify database path')
  process.exit(1)
}

async function main() {
  console.log('=== Post Trace Diagnostic Tool ===')
  console.log(`Tracing post: ${postUri}`)
  console.log(`Database path: ${DB_PATH}`)

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Error: Database file not found at ${DB_PATH}`)
    console.log(
      "Make sure you're running this script from the correct directory",
    )
    console.log('or set the DATABASE_PATH environment variable')
    process.exit(1)
  }

  try {
    // STEP 1: Check if the post exists in the Bluesky network
    console.log('\n1. Checking if post exists in Bluesky...')
    const agent = new BskyAgent({ service: BLUESKY_API })

    try {
      // Get post from Bluesky
      const postResponse = await agent.getPost({ uri: postUri })
      const post = postResponse.data

      console.log('✅ Post exists in Bluesky:')
      console.log(`  Author: @${post.author.handle} (${post.author.did})`)
      console.log(`  Posted: ${post.indexedAt}`)
      console.log(
        `  Text: ${post.record.text.substring(0, 100)}${
          post.record.text.length > 100 ? '...' : ''
        }`,
      )
      console.log(`  CID: ${post.cid}`)

      // STEP 2: Check if the post exists in the database
      console.log('\n2. Checking if post exists in database...')

      // Connect to the database
      const db = createDb(`sqlite:${DB_PATH}`)

      const existingPost = await db
        .selectFrom('post')
        .selectAll()
        .where('uri', '=', postUri)
        .executeTakeFirst()

      if (existingPost) {
        console.log('✅ Post exists in database:')
        console.log(`  URI: ${existingPost.uri}`)
        console.log(`  CID: ${existingPost.cid}`)
        console.log(`  Creator: ${existingPost.creator}`)
        console.log(`  Indexed At: ${existingPost.indexedAt}`)
      } else {
        console.log('❌ Post NOT found in database')
        console.log(
          'This suggests the firehose missed this post or it was filtered out.',
        )
        console.log('You can add it manually with:')
        console.log(`  node manual-add-post.js ${postUri}`)
        // Continue with further checks even if not in DB
      }

      // STEP 3: Check if the post creator is a community member
      console.log('\n3. Checking if author is a community member...')

      // Import the community members array
      const communityMembersPath = path.join(
        __dirname,
        '../src/swarm-community-members.ts',
      )

      try {
        // Read the file content
        const content = fs.readFileSync(communityMembersPath, 'utf8')

        // Extract the array content using regex
        const arrayMatch = content.match(
          /export const SWARM_COMMUNITY_MEMBERS: string\[\] = \[([\s\S]*?)\]/,
        )

        if (arrayMatch) {
          const arrayContent = arrayMatch[1]

          // Simple check for the author DID
          const isCommunityMember = arrayContent.includes(post.author.did)

          if (isCommunityMember) {
            console.log(`✅ ${post.author.did} IS a community member`)
            console.log('The post should be eligible for inclusion in the feed')
          } else {
            console.log(`❌ ${post.author.did} is NOT a community member`)
            console.log('To make this post appear in the feed:')
            console.log(`1. Add the author to the community members list:`)
            console.log(
              `   node add-community-member.js "${post.author.did}" "${post.author.handle}"`,
            )
            console.log('2. Deploy the updated code to Render.com')
          }
        } else {
          console.log('⚠️ Could not parse community members array')
        }
      } catch (error) {
        console.error('Error checking community membership:', error.message)
      }

      // STEP 4: Check if post appears in the feed
      console.log('\n4. Checking if post appears in feed...')

      try {
        // Get feed endpoint
        const feedEndpoint =
          'at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community'
        console.log(`Checking feed: ${feedEndpoint}`)

        // Try to get feed
        const feedResponse = await agent.app.bsky.feed.getFeedSkeleton({
          feed: feedEndpoint,
        })

        if (feedResponse.success) {
          // Check if our post is in the feed
          const feedItems = feedResponse.data.feed
          const postInFeed = feedItems.some((item) => item.post === postUri)

          if (postInFeed) {
            console.log('✅ Post is included in the feed!')
          } else {
            console.log('❌ Post is NOT in the feed')
            console.log('Reasons this could happen:')
            console.log(
              '  - Post is too old (outside the time window for the feed)',
            )
            console.log('  - Feed algorithm is filtering it out')
            console.log('  - Recent database issues')

            // If we have feed items, show a sample
            if (feedItems.length > 0) {
              console.log('\nSample of what IS in the feed:')
              await Promise.all(
                feedItems.slice(0, 3).map(async (item, index) => {
                  try {
                    const itemResp = await agent.getPost({ uri: item.post })
                    console.log(
                      `  ${index + 1}. ${
                        itemResp.data.author.handle
                      }: ${itemResp.data.record.text.substring(0, 50)}...`,
                    )
                  } catch (e) {
                    console.log(
                      `  ${index + 1}. ${item.post} (Could not fetch details)`,
                    )
                  }
                }),
              )
            } else {
              console.log('\nThe feed is completely empty.')
            }
          }
        } else {
          console.log('❌ Could not fetch feed')
        }
      } catch (error) {
        console.log('❌ Error fetching feed:', error.message)
      }

      // STEP 5: Summary and recommendations
      console.log('\n===== DIAGNOSIS SUMMARY =====')

      if (!existingPost) {
        console.log('PRIMARY ISSUE: Post not in database')
        console.log('RECOMMENDED ACTION: Add post to database manually')
        console.log(`  node manual-add-post.js ${postUri}`)
      } else if (!isCommunityMember) {
        console.log('PRIMARY ISSUE: Author not in community member list')
        console.log('RECOMMENDED ACTION: Add author to community members')
        console.log(
          `  node add-community-member.js "${post.author.did}" "${post.author.handle}"`,
        )
      } else if (!postInFeed) {
        console.log('PRIMARY ISSUE: Post in database but not appearing in feed')
        console.log('RECOMMENDED ACTIONS:')
        console.log(
          '1. Check feed algorithm implementation in src/algos/swarm-community.ts',
        )
        console.log('2. Verify feed generator service is running properly')
        console.log('3. Consider redeploying the feed generator service')
      } else {
        console.log(
          '✅ ALL CHECKS PASSED! Post exists and is included in the feed.',
        )
      }
    } catch (error) {
      console.error('Error fetching post from Bluesky:', error.message)
      console.log('Make sure the post URI is correct and the post exists')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
