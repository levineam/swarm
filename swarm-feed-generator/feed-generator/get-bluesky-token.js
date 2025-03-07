require('dotenv').config()
const { BskyAgent } = require('@atproto/api')
const fs = require('fs')
const path = require('path')

/**
 * Get Bluesky Access Token
 *
 * This script generates a new Bluesky access token for the feed generator.
 * The token is used to connect to the Bluesky firehose subscription.
 *
 * The token will expire after a few hours, so you'll need to run this script
 * periodically to generate a new token.
 */
async function getBlueskyToken() {
  try {
    // Get credentials from .env file
    const handle = process.env.BLUESKY_USERNAME
    const password = process.env.BLUESKY_PASSWORD

    if (!handle || !password) {
      console.error(
        'Error: BLUESKY_USERNAME and BLUESKY_PASSWORD must be set in .env file',
      )
      process.exit(1)
    }

    console.log(`Logging in as ${handle}...`)
    const agent = new BskyAgent({ service: 'https://bsky.social' })
    await agent.login({ identifier: handle, password: password })

    // Get the access token
    const accessToken = agent.session.accessJwt

    console.log('Access token generated successfully.')
    console.log('Token:', accessToken)

    // Update the .env file with the new token
    const envPath = path.join(__dirname, '..', '.env')
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8')

      // Replace the existing token or add a new one
      if (envContent.includes('BLUESKY_ACCESS_TOKEN=')) {
        envContent = envContent.replace(
          /BLUESKY_ACCESS_TOKEN=.*/,
          `BLUESKY_ACCESS_TOKEN=${accessToken}`,
        )
      } else {
        envContent += `\nBLUESKY_ACCESS_TOKEN=${accessToken}\n`
      }

      fs.writeFileSync(envPath, envContent)
      console.log('Updated .env file with new access token.')
    } else {
      console.warn(
        'Warning: .env file not found. Could not update token automatically.',
      )
      console.log('Please manually add the following to your .env file:')
      console.log(`BLUESKY_ACCESS_TOKEN=${accessToken}`)
    }

    return accessToken
  } catch (error) {
    console.error('Error generating access token:', error.message)
    throw error
  }
}

// Execute the function
getBlueskyToken()
  .then((token) => {
    console.log('\nProcess completed successfully.')
    console.log('\nNext steps:')
    console.log('1. Restart your feed generator service to use the new token')
    console.log('2. Set a reminder to generate a new token in a few hours')
  })
  .catch((error) => {
    console.error('Process failed:', error)
    process.exit(1)
  })
