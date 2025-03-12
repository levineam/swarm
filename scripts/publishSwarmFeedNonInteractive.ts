import dotenv from 'dotenv'
import { AtpAgent, BlobRef } from '@atproto/api'
import fs from 'fs/promises'

const run = async () => {
  dotenv.config()

  // Check required environment variables
  const requiredVars = [
    'BLUESKY_USERNAME',
    'BLUESKY_PASSWORD',
    'FEEDGEN_SERVICE_DID',
    'FEEDGEN_HOSTNAME'
  ]
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`Missing required environment variable: ${varName}`)
      process.exit(1)
    }
  }

  const handle = process.env.BLUESKY_USERNAME!
  const password = process.env.BLUESKY_PASSWORD!
  const recordName = 'swarm-community'
  const displayName = 'Swarm Community'
  const description = 'A feed of posts from the Swarm community members'
  const avatar = process.env.FEED_AVATAR_PATH // Optional
  const service = 'https://bsky.social'
  const videoOnly = false

  const feedGenDid =
    process.env.FEEDGEN_SERVICE_DID ?? `did:web:${process.env.FEEDGEN_HOSTNAME}`

  console.log(`Using feed generator DID: ${feedGenDid}`)
  console.log(`Logging in as ${handle}...`)
  
  // Create agent and login
  const agent = new AtpAgent({ service })
  await agent.login({ identifier: handle, password })
  console.log(`Logged in successfully as ${handle}`)

  let avatarRef: BlobRef | undefined
  if (avatar) {
    let encoding: string
    if (avatar.endsWith('png')) {
      encoding = 'image/png'
    } else if (avatar.endsWith('jpg') || avatar.endsWith('jpeg')) {
      encoding = 'image/jpeg'
    } else {
      throw new Error('expected png or jpeg')
    }
    console.log(`Uploading avatar from ${avatar}...`)
    const img = await fs.readFile(avatar)
    const blobRes = await agent.api.com.atproto.repo.uploadBlob(img, {
      encoding,
    })
    avatarRef = blobRes.data.blob
    console.log('Avatar uploaded successfully')
  }

  console.log(`Creating feed generator record with name: ${displayName}...`)
  await agent.api.com.atproto.repo.putRecord({
    repo: agent.session?.did ?? '',
    collection: 'app.bsky.feed.generator',
    rkey: recordName,
    record: {
      did: feedGenDid,
      displayName: displayName,
      description: description,
      avatar: avatarRef,
      createdAt: new Date().toISOString(),
    },
  })

  console.log('Feed generator published successfully! 🎉')
  console.log(`Feed URI: at://${agent.session?.did}/app.bsky.feed.generator/${recordName}`)
}

run().catch(err => {
  console.error('Error publishing feed generator:', err)
  process.exit(1)
}) 