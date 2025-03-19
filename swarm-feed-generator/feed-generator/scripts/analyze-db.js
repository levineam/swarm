#!/usr/bin/env node

/**
 * Database Analysis Script
 *
 * This script analyzes the swarm-feed database to diagnose issues
 * with the feed content and post processing.
 */

const fs = require('fs')
const path = require('path')
const { createDb } = require('../src/db')

// Configuration
const DB_PATH =
  process.env.DATABASE_PATH || path.join(__dirname, '../swarm-feed.db')
const OUTPUT_FILE = path.join(__dirname, '../database-analysis-report.md')

// Formatting helper
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A'
  try {
    return new Date(timestamp).toISOString()
  } catch (e) {
    return String(timestamp)
  }
}

// Get readable time ago
function timeAgo(timestamp) {
  if (!timestamp) return 'N/A'

  try {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now - time
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
    return `${diffSec} second${diffSec !== 1 ? 's' : ''} ago`
  } catch (e) {
    return 'unknown time ago'
  }
}

async function main() {
  console.log('=== Swarm Feed Database Analysis Tool ===')
  console.log(`Analyzing database at: ${DB_PATH}`)

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Error: Database file not found at ${DB_PATH}`)
    console.log(
      "Make sure you're running this script from the correct directory",
    )
    console.log('or set the DATABASE_PATH environment variable')
    process.exit(1)
  }

  // Initialize report content
  let report = `# Swarm Feed Database Analysis Report
Generated on: ${new Date().toISOString()}

## Database Information
- Path: \`${DB_PATH}\`
- Size: \`${(fs.statSync(DB_PATH).size / (1024 * 1024)).toFixed(2)} MB\`
- Last Modified: \`${formatTimestamp(fs.statSync(DB_PATH).mtime)}\` (${timeAgo(
    fs.statSync(DB_PATH).mtime,
  )})

`

  try {
    // Connect to the database
    console.log('\n1. Connecting to database...')
    const db = createDb(`sqlite:${DB_PATH}`)

    // Get firehose cursor info
    console.log('2. Checking firehose cursor state...')

    const cursorState = await db.selectFrom('sub_state').selectAll().execute()

    report += `## Firehose Cursor State\n`

    if (cursorState.length === 0) {
      report += `No cursor state found in the database. This may indicate the firehose subscription hasn't been initialized.\n\n`
    } else {
      report += `| Service | Cursor | Last Updated |\n`
      report += `|---------|--------|-------------|\n`

      for (const state of cursorState) {
        report += `| \`${state.service || 'N/A'}\` | \`${
          state.cursor || 'N/A'
        }\` | Not available |\n`
      }
      report += `\n`
    }

    // Get basic database stats
    console.log('3. Collecting basic database statistics...')

    const postCount = await db
      .selectFrom('post')
      .select(db.fn.count('uri').as('count'))
      .executeTakeFirst()

    const oldestPost = await db
      .selectFrom('post')
      .select(['uri', 'creator', 'indexedAt'])
      .orderBy('indexedAt', 'asc')
      .limit(1)
      .executeTakeFirst()

    const newestPost = await db
      .selectFrom('post')
      .select(['uri', 'creator', 'indexedAt'])
      .orderBy('indexedAt', 'desc')
      .limit(1)
      .executeTakeFirst()

    report += `## Basic Database Statistics\n`
    report += `- Total Posts: \`${postCount?.count || 0}\`\n`

    if (oldestPost) {
      report += `- Oldest Post: \`${formatTimestamp(
        oldestPost.indexedAt,
      )}\` (${timeAgo(oldestPost.indexedAt)})\n`
    }

    if (newestPost) {
      report += `- Newest Post: \`${formatTimestamp(
        newestPost.indexedAt,
      )}\` (${timeAgo(newestPost.indexedAt)})\n`
    }

    report += `\n`

    // Get unique creator stats
    console.log('4. Analyzing post creators...')

    const uniqueCreators = await db
      .selectFrom('post')
      .select('creator')
      .distinct()
      .execute()

    report += `## Post Creator Analysis\n`
    report += `- Total Unique Creators: \`${uniqueCreators.length}\`\n\n`

    // Get top creators
    const creatorStats = await db
      .selectFrom('post')
      .select(['creator', db.fn.count('uri').as('count')])
      .groupBy('creator')
      .orderBy('count', 'desc')
      .limit(10)
      .execute()

    report += `### Top 10 Post Creators\n`
    report += `| Creator DID | Post Count |\n`
    report += `|-------------|------------|\n`

    for (const stat of creatorStats) {
      report += `| \`${stat.creator}\` | ${stat.count} |\n`
    }

    report += `\n`

    // Import the community members array
    console.log('5. Checking for community members posts...')

    try {
      // Read the community members file and extract DIDs
      const communityMembersPath = path.join(
        __dirname,
        '../src/swarm-community-members.ts',
      )
      const content = fs.readFileSync(communityMembersPath, 'utf8')
      const arrayMatch = content.match(
        /export const SWARM_COMMUNITY_MEMBERS: string\[\] = \[([\s\S]*?)\]/,
      )

      if (arrayMatch) {
        const communityDids = arrayMatch[1]
          .split(',')
          .map((line) => {
            const didMatch = line.match(/'([^']+)'/)
            return didMatch ? didMatch[1].trim() : null
          })
          .filter(Boolean)

        report += `## Community Member Posts Analysis\n`
        report += `- Total Community Members: \`${communityDids.length}\`\n\n`

        // For each community member, check their posts
        report += `### Posts by Community Members\n`
        report += `| Member DID | Post Count | Latest Post |\n`
        report += `|------------|------------|-------------|\n`

        for (const did of communityDids) {
          const memberPostCount = await db
            .selectFrom('post')
            .select(db.fn.count('uri').as('count'))
            .where('creator', '=', did)
            .executeTakeFirst()

          const latestMemberPost = await db
            .selectFrom('post')
            .select(['indexedAt'])
            .where('creator', '=', did)
            .orderBy('indexedAt', 'desc')
            .limit(1)
            .executeTakeFirst()

          report += `| \`${did}\` | ${memberPostCount?.count || 0} | ${
            latestMemberPost
              ? formatTimestamp(latestMemberPost.indexedAt) +
                ' (' +
                timeAgo(latestMemberPost.indexedAt) +
                ')'
              : 'None'
          } |\n`
        }

        report += `\n`

        // Check for posts from non-community members
        console.log('6. Checking for posts from non-community members...')

        const nonCommunityPostCount = await db
          .selectFrom('post')
          .select(db.fn.count('uri').as('count'))
          .where((eb) => eb.not('creator', 'in', communityDids))
          .executeTakeFirst()

        report += `### Posts from Non-Community Members\n`
        report += `- Total Posts from Non-Community Members: \`${
          nonCommunityPostCount?.count || 0
        }\`\n\n`

        if (parseInt(nonCommunityPostCount?.count || '0') > 0) {
          const nonCommunityCreators = await db
            .selectFrom('post')
            .select(['creator', db.fn.count('uri').as('count')])
            .where((eb) => eb.not('creator', 'in', communityDids))
            .groupBy('creator')
            .orderBy('count', 'desc')
            .limit(10)
            .execute()

          report += `#### Top Non-Community Posters\n`
          report += `| Creator DID | Post Count |\n`
          report += `|-------------|------------|\n`

          for (const creator of nonCommunityCreators) {
            report += `| \`${creator.creator}\` | ${creator.count} |\n`
          }

          report += `\n`
        }
      } else {
        report += `## Community Member Analysis\n`
        report += `Failed to parse the community members array from the source file.\n\n`
      }
    } catch (error) {
      report += `## Community Member Analysis\n`
      report += `Error analyzing community members: ${error.message}\n\n`
    }

    // Get recent posts for inspection
    console.log('7. Fetching sample of recent posts...')

    const recentPosts = await db
      .selectFrom('post')
      .select(['uri', 'cid', 'creator', 'indexedAt'])
      .orderBy('indexedAt', 'desc')
      .limit(10)
      .execute()

    report += `## Sample of 10 Most Recent Posts\n`
    report += `| Post URI | Creator | Indexed At | Age |\n`
    report += `|----------|---------|------------|-----|\n`

    for (const post of recentPosts) {
      report += `| \`${post.uri}\` | \`${post.creator}\` | \`${formatTimestamp(
        post.indexedAt,
      )}\` | ${timeAgo(post.indexedAt)} |\n`
    }

    report += `\n`

    // Check for time distribution of posts
    console.log('8. Analyzing post time distribution...')

    // Get posts per day for the last 7 days
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    report += `## Post Time Distribution\n`
    report += `### Posts in the Last 7 Days\n\n`

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)

      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const postsOnDay = await db
        .selectFrom('post')
        .select(db.fn.count('uri').as('count'))
        .where('indexedAt', '>=', startOfDay.toISOString())
        .where('indexedAt', '<=', endOfDay.toISOString())
        .executeTakeFirst()

      const dayName = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
      report += `- **${dayName}**: ${postsOnDay?.count || 0} posts\n`
    }

    report += `\n`

    // Database schema information
    console.log('9. Collecting database schema information...')

    // SQLite doesn't have a standardized way to get schema information,
    // but we can use a pragma statement to get table info

    report += `## Database Schema Information\n`
    report += `This information is based on the expected schema for the feed generator.\n\n`

    report += `### Tables\n`
    report += `- **post**: Stores all posts captured from the firehose\n`
    report += `- **sub_state**: Stores the firehose cursor state\n\n`

    report += `### Indexes\n`
    report += `- Primary key on post(uri)\n`
    report += `- Index on post(creator)\n`
    report += `- Index on post(indexedAt)\n\n`

    // Write the report to a file
    console.log(`\nWriting analysis report to ${OUTPUT_FILE}...`)
    fs.writeFileSync(OUTPUT_FILE, report)

    console.log(`\n✅ Analysis complete!`)
    console.log(`Report saved to: ${OUTPUT_FILE}`)
    console.log(
      `\nTo view the analysis, open the markdown file in a text editor or viewer.`,
    )
  } catch (error) {
    console.error('Error during database analysis:', error.message)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
