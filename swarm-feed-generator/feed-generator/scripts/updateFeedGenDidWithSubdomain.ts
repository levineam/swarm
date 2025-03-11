import { AtpAgent } from '@atproto/api'
import dotenv from 'dotenv'

import { ids } from '../src/lexicon/lexicons'

/**
 * This script updates an existing feed generator record with the correct production DID.
 * It's specifically designed to update the DID from swarm-social.onrender.com to swarm-feed-generator.onrender.com
 *
 * This is a non-interactive version that takes parameters from environment variables:
 * - BLUESKY_HANDLE or BLUESKY_USERNAME: Your Bluesky handle
 * - BLUESKY_PASSWORD: Your Bluesky password (preferably an App Password)
 * - BLUESKY_PDS_URL: (Optional) Custom PDS service URL, defaults to https://bsky.social
 * - FEED_RECORD_NAME: (Optional) Record name of the feed to update, defaults to swarm-community
 */
const run = async () => {
  dotenv.config()

  // Get parameters from environment variables
  const handle = process.env.BLUESKY_HANDLE || process.env.BLUESKY_USERNAME
  const password = process.env.BLUESKY_PASSWORD
  const service = process.env.BLUESKY_PDS_URL || 'https://bsky.social'
  const recordName = process.env.FEED_RECORD_NAME || 'swarm-community'

  // Validate required parameters
  if (!handle || !password) {
    console.error(
      'Error: BLUESKY_HANDLE/BLUESKY_USERNAME and BLUESKY_PASSWORD environment variables are required',
    )
    console.error('Example usage:')
    console.error(
      'BLUESKY_HANDLE=your.handle BLUESKY_PASSWORD=your_password npx ts-node scripts/updateFeedGenDidWithSubdomain.ts',
    )
    process.exit(1)
  }

  // Use the new subdomain for the feed generator
  const feedGenDid = 'did:web:swarm-feed-generator.onrender.com'

  console.log(`Using feed generator DID: ${feedGenDid}`)
  console.log(`Bluesky handle: ${handle}`)
  console.log(`PDS service: ${service}`)
  console.log(`Feed record name: ${recordName}`)

  // Connect to the Bluesky API
  console.log('Connecting to Bluesky API...')
  const agent = new AtpAgent({ service })

  try {
    await agent.login({ identifier: handle, password })
    console.log(`Logged in as ${handle}`)
  } catch (error) {
    console.error('Error logging in to Bluesky:', error)
    process.exit(1)
  }

  // Get the current record to preserve other fields
  console.log(`Fetching current record for ${recordName}...`)
  let currentRecord
  try {
    currentRecord = await agent.api.com.atproto.repo.getRecord({
      repo: agent.session?.did ?? '',
      collection: ids.AppBskyFeedGenerator,
      rkey: recordName,
    })
  } catch (error) {
    console.error(`Error fetching record ${recordName}:`, error)
    process.exit(1)
  }

  // Type the record properly to avoid linter errors
  const record = currentRecord.data.value as {
    did: string
    displayName: string
    description?: string
    avatar?: any
    createdAt: string
    [key: string]: any
  }

  const oldDid = record.did

  // Update only the DID field
  record.did = feedGenDid

  // Put the updated record
  console.log(`Updating record from DID ${oldDid} to ${feedGenDid}...`)
  try {
    await agent.api.com.atproto.repo.putRecord({
      repo: agent.session?.did ?? '',
      collection: ids.AppBskyFeedGenerator,
      rkey: recordName,
      record: record,
    })

    console.log('✅ Feed generator record updated successfully!')
    console.log(
      `The feed generator DID has been updated from ${oldDid} to ${feedGenDid}`,
    )
    console.log(
      'Please allow a few minutes for the changes to propagate through the network.',
    )
  } catch (error) {
    console.error('Error updating feed generator record:', error)
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Error updating feed generator record:', err)
  process.exit(1)
})
