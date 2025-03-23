// Add a fully custom Swarm feed implementation that bypasses the feed generator
import {SwarmFeedAPI} from './swarm'
import {SwarmFeedAPIDirectOnly} from './swarm-direct'

export * from './custom'
export * from './types'

// Export the Swarm feed implementations
export {SwarmFeedAPI, SwarmFeedAPIDirectOnly}
