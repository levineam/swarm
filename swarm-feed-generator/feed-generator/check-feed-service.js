require('dotenv').config()
const fetch = require('node-fetch')

/**
 * Check Feed Generator Service
 *
 * This script checks if the feed generator service is running correctly
 * by making requests to the describeFeedGenerator and getFeedSkeleton endpoints.
 */
async function checkFeedService() {
  try {
    const serviceUrl = process.env.FEEDGEN_HOSTNAME || 'localhost:3000'
    const publisherDid = process.env.FEEDGEN_PUBLISHER_DID

    if (!publisherDid) {
      console.error('Error: FEEDGEN_PUBLISHER_DID must be set in .env file')
      process.exit(1)
    }

    // Format the URL correctly
    let baseUrl = serviceUrl
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`
    }

    console.log(`Checking feed generator service at ${baseUrl}...`)

    // Check the describeFeedGenerator endpoint
    console.log('\nTesting describeFeedGenerator endpoint...')
    const describeResponse = await fetch(
      `${baseUrl}/xrpc/app.bsky.feed.describeFeedGenerator`,
    )

    if (!describeResponse.ok) {
      console.error(
        `Error: describeFeedGenerator endpoint returned ${describeResponse.status}`,
      )
      console.error(await describeResponse.text())
      process.exit(1)
    }

    const describeData = await describeResponse.json()
    console.log('describeFeedGenerator response:')
    console.log(JSON.stringify(describeData, null, 2))

    // Check if the feed URI is correct
    const feedUri = `at://${publisherDid}/app.bsky.feed.generator/swarm-community`
    const hasFeed = describeData.feeds.some((feed) => feed.uri === feedUri)

    if (!hasFeed) {
      console.warn(
        `Warning: Feed URI ${feedUri} not found in describeFeedGenerator response`,
      )
    } else {
      console.log(
        `✅ Feed URI ${feedUri} found in describeFeedGenerator response`,
      )
    }

    // Check the getFeedSkeleton endpoint
    console.log('\nTesting getFeedSkeleton endpoint...')
    const skeletonResponse = await fetch(
      `${baseUrl}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        feedUri,
      )}`,
    )

    if (!skeletonResponse.ok) {
      console.error(
        `Error: getFeedSkeleton endpoint returned ${skeletonResponse.status}`,
      )
      console.error(await skeletonResponse.text())
      process.exit(1)
    }

    const skeletonData = await skeletonResponse.json()
    console.log('getFeedSkeleton response:')
    console.log(JSON.stringify(skeletonData, null, 2))

    console.log('\n✅ Feed generator service is running correctly!')

    return {
      describeFeedGenerator: describeData,
      getFeedSkeleton: skeletonData,
    }
  } catch (error) {
    console.error('Error checking feed service:', error.message)
    throw error
  }
}

// Execute the function
checkFeedService()
  .then((result) => {
    console.log('\nProcess completed successfully.')

    // Check if there are any posts in the feed
    if (result.getFeedSkeleton.feed.length === 0) {
      console.log('\n⚠️ Warning: No posts found in the feed.')
      console.log('This could be because:')
      console.log('1. There are no posts from Swarm community members')
      console.log('2. The SWARM_COMMUNITY_MEMBERS array is empty')
      console.log(
        '3. The feed generator is not receiving posts from the firehose',
      )

      console.log('\nNext steps:')
      console.log(
        '1. Check the SWARM_COMMUNITY_MEMBERS array in src/swarm-community-members.ts',
      )
      console.log('2. Make sure the Bluesky access token is valid')
      console.log(
        '3. Check the logs for any errors related to the firehose subscription',
      )
    } else {
      console.log(
        `\n✅ Found ${result.getFeedSkeleton.feed.length} posts in the feed.`,
      )
    }
  })
  .catch((error) => {
    console.error('Process failed:', error)
    process.exit(1)
  })
