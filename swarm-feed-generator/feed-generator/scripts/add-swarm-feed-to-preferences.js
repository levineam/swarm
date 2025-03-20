#!/usr/bin/env node

const { BskyAgent } = require('@atproto/api')
const fs = require('fs')
const readline = require('readline')

// Constants
const SWARM_FEED_URI =
  'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'
const LOG_FILE = 'add-swarm-feed.log'

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Initialize log file
fs.writeFileSync(
  LOG_FILE,
  `Add Swarm Feed to Preferences - ${new Date().toISOString()}\n\n`,
  { flag: 'w' },
)

// Helper to log to both console and file
function log(message) {
  console.log(message)
  fs.appendFileSync(LOG_FILE, message + '\n')
}

// Main function to add the Swarm feed to user preferences
async function addSwarmFeedToPreferences(username, password) {
  log(`Adding Swarm feed to preferences for user ${username}...`)

  const agent = new BskyAgent({ service: 'https://bsky.social' })

  try {
    // Login to Bluesky
    await agent.login({ identifier: username, password })
    log('Successfully authenticated with Bluesky')

    // Get current preferences
    const preferences = await agent.app.bsky.actor.getPreferences({})
    log('Retrieved current user preferences')

    // Check if the feeds array exists
    if (!preferences.data.feeds) {
      preferences.data.feeds = { saved: [] }
    }

    // Check if the saved array exists
    if (!preferences.data.feeds.saved) {
      preferences.data.feeds.saved = []
    }

    // Check if the Swarm feed is already in the saved feeds
    const savedFeeds = preferences.data.feeds.saved
    const swarmFeedExists = savedFeeds.some(
      (feed) => feed.value === SWARM_FEED_URI,
    )

    if (swarmFeedExists) {
      log('Swarm feed is already in user preferences')

      // Ensure it's pinned
      const swarmFeedIndex = savedFeeds.findIndex(
        (feed) => feed.value === SWARM_FEED_URI,
      )
      if (!savedFeeds[swarmFeedIndex].pinned) {
        log('Updating Swarm feed to be pinned')
        savedFeeds[swarmFeedIndex].pinned = true
      } else {
        log('Swarm feed is already pinned')
        return {
          success: true,
          message: 'Swarm feed already in preferences and pinned',
        }
      }
    } else {
      // Add the Swarm feed
      log('Adding Swarm feed to user preferences')
      savedFeeds.push({
        type: 'feed',
        value: SWARM_FEED_URI,
        pinned: true,
      })
    }

    // Update preferences
    const updatedPreferences = {
      ...preferences.data,
      feeds: {
        ...preferences.data.feeds,
        saved: savedFeeds,
      },
    }

    // Save the updated preferences
    await agent.app.bsky.actor.putPreferences({
      preferences: updatedPreferences,
    })

    log('✅ Successfully updated user preferences with Swarm feed pinned')
    return {
      success: true,
      message: 'Successfully added Swarm feed to preferences',
    }
  } catch (error) {
    log(`❌ Error updating preferences: ${error.message}`)
    if (error.response) {
      log(`Status: ${error.response.status}`)
      log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`)
    }
    return { success: false, message: error.message }
  } finally {
    agent.close()
  }
}

// Main execution
function main() {
  log('=== ADD SWARM FEED TO PREFERENCES TOOL ===')
  log(
    'This tool will add the Swarm feed to your Bluesky preferences and pin it.',
  )

  rl.question('Enter your Bluesky username (email or handle): ', (username) => {
    rl.question('Enter your Bluesky app password: ', async (password) => {
      try {
        const result = await addSwarmFeedToPreferences(username, password)

        if (result.success) {
          log('\n✅ SUCCESS!')
          log('The Swarm feed has been added to your preferences and pinned.')
          log(
            'You should now be able to see it in your feed list when you refresh the app.',
          )
          log(
            "If you still don't see posts, try clearing your browser cache or restarting the app.",
          )
        } else {
          log('\n❌ FAILED')
          log(`Error: ${result.message}`)
          log('Please try again or contact support for assistance.')
        }
      } catch (error) {
        log(`\n❌ Unexpected error: ${error.message}`)
      } finally {
        log('\nLog saved to: ' + LOG_FILE)
        rl.close()
      }
    })
  })
}

// Start the process
main()
