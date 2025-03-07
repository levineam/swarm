require('dotenv').config()

/**
 * Check Deployed Feed Generator Service
 *
 * This script checks if the deployed feed generator service is running correctly
 * by making requests to the describeFeedGenerator and getFeedSkeleton endpoints.
 */
async function checkDeployedService() {
  try {
    // Dynamically import node-fetch
    const fetch = (await import('node-fetch')).default

    // Use the deployed service URL
    const serviceUrl = 'https://swarm-social.onrender.com'
    const publisherDid =
      process.env.FEEDGEN_PUBLISHER_DID || 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'

    console.log(`Checking deployed feed generator service at ${serviceUrl}...`)

    // Check the describeFeedGenerator endpoint with a timeout
    console.log('\nTesting describeFeedGenerator endpoint...')

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const describeResponse = await fetch(
        `${serviceUrl}/xrpc/app.bsky.feed.describeFeedGenerator`,
        { signal: controller.signal },
      )

      clearTimeout(timeout)

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

      const skeletonController = new AbortController()
      const skeletonTimeout = setTimeout(
        () => skeletonController.abort(),
        30000,
      ) // 30 second timeout

      const skeletonResponse = await fetch(
        `${serviceUrl}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
          feedUri,
        )}`,
        { signal: skeletonController.signal },
      )

      clearTimeout(skeletonTimeout)

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

      console.log('\n✅ Deployed feed generator service is running correctly!')

      return {
        describeFeedGenerator: describeData,
        getFeedSkeleton: skeletonData,
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(
          'Request timed out after 30 seconds. The service might be starting up or under heavy load.',
        )
      } else {
        console.error(`Error checking endpoint: ${error.message}`)
      }
      throw error
    }
  } catch (error) {
    console.error('Error checking deployed service:', error.message)
    throw error
  }
}

// Execute the function
checkDeployedService()
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
