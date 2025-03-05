/**
 * Script to obtain a Bluesky access token
 *
 * Usage:
 * 1. Install dependencies: npm install @atproto/api
 * 2. Run: node get-bluesky-token.js <handle> <password>
 */

const {BskyAgent} = require('@atproto/api')

async function getAccessToken(handle, password) {
  try {
    const agent = new BskyAgent({service: 'https://bsky.social'})
    const result = await agent.login({identifier: handle, password: password})

    console.log('\nLogin successful! Here is your access token:')
    console.log('----------------------------------------')
    console.log(result.data.accessJwt)
    console.log('----------------------------------------')
    console.log(
      '\nIMPORTANT: Store this token securely. You will use it in your feed generator server.',
    )
    console.log(
      'This token will expire after some time, so you may need to generate a new one later.',
    )

    return result.data.accessJwt
  } catch (error) {
    console.error('Error logging in:', error.message)
    process.exit(1)
  }
}

// Get command line arguments
const args = process.argv.slice(2)
if (args.length !== 2) {
  console.log('Usage: node get-bluesky-token.js <handle> <password>')
  console.log(
    'Example: node get-bluesky-token.js yourhandle.bsky.social yourpassword',
  )
  process.exit(1)
}

const [handle, password] = args
getAccessToken(handle, password)
