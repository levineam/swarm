// Feed generator constants for Swarm
export const SWARM_PLATFORM_DID = 'did:plc:y5tuxxovcztmqg3dkcpnms5d'
export const FEED_GENERATOR_TYPE = 'app.bsky.feed.generator'
export const FEED_RECORD_KEY = 'swarm-feed'
export const SWARM_FEED_URI = `at://${SWARM_PLATFORM_DID}/${FEED_GENERATOR_TYPE}/${FEED_RECORD_KEY}`

export const FEED_GENERATOR_URL = 'https://swarm-feed-generator.onrender.com'
export const FEED_PROXY_URL = 'https://swarm-cors-proxy.onrender.com'

export const SWARM_FEED_METADATA = {
  displayName: 'Swarm Community',
  description: 'Posts from members of the Swarm community',
  avatar: 'https://example.com/swarm-avatar.jpg', // Replace with actual avatar URL
} 