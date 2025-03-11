import { AtpAgent } from '@atproto/api'
import dotenv from 'dotenv'
import inquirer from 'inquirer'

import { ids } from '../src/lexicon/lexicons'

/**
 * This script updates an existing feed generator record with the correct production DID.
 * It's specifically designed to fix the "could not resolve identity" error by updating
 * the DID from a local development DID to the production DID.
 */
const run = async () => {
  dotenv.config()

  // Ensure we have the correct production DID
  if (!process.env.FEEDGEN_SERVICE_DID && !process.env.FEEDGEN_HOSTNAME) {
    throw new Error(
      'Please provide FEEDGEN_SERVICE_DID or FEEDGEN_HOSTNAME in the .env file',
    )
  }

  const feedGenDid =
    process.env.FEEDGEN_SERVICE_DID ?? `did:web:${process.env.FEEDGEN_HOSTNAME}`
  console.log(`Using feed generator DID: ${feedGenDid}`)

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'handle',
      message: 'Enter your Bluesky handle:',
      required: true,
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter your Bluesky password (preferably an App Password):',
    },
    {
      type: 'input',
      name: 'service',
      message: 'Optionally, enter a custom PDS service to sign in with:',
      default: 'https://bsky.social',
      required: false,
    },
    {
      type: 'input',
      name: 'recordName',
      message: 'Enter the record name of the feed to update:',
      default: 'swarm-community',
      required: true,
    },
  ])

  const { handle, password, recordName, service } = answers

  // Connect to the Bluesky API
  const agent = new AtpAgent({
    service: service ? service : 'https://bsky.social',
  })
  await agent.login({ identifier: handle, password })
  console.log(`Logged in as ${handle}`)

  // Get the current record to preserve other fields
  console.log(`Fetching current record for ${recordName}...`)
  const currentRecord = await agent.api.com.atproto.repo.getRecord({
    repo: agent.session?.did ?? '',
    collection: ids.AppBskyFeedGenerator,
    rkey: recordName,
  })

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
}

run().catch((err) => {
  console.error('Error updating feed generator record:', err)
  process.exit(1)
})
