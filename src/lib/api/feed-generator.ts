import {SWARM_API_PROXY} from '../constants'

/**
 * Utility functions for making API calls to the Swarm Feed Generator
 * through the CORS proxy to avoid cross-origin issues.
 */

/**
 * Makes a request to the feed generator through the CORS proxy
 */
export async function fetchFeedGenerator(
  endpoint: string,
  options: RequestInit = {},
) {
  const url = `${SWARM_API_PROXY}${endpoint}`

  // Ensure proper headers are set
  const headers = new Headers(options.headers || {})
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(
      `Feed generator request failed: ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Gets the feed generator description (metadata about available feeds)
 */
export async function describeFeedGenerator() {
  return fetchFeedGenerator('/xrpc/app.bsky.feed.describeFeedGenerator')
}

/**
 * Gets a feed skeleton (list of posts) for a specific feed
 */
export async function getFeedSkeleton(
  feedUri: string,
  limit: number = 50,
  cursor?: string,
) {
  let endpoint = `/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
    feedUri,
  )}&limit=${limit}`
  if (cursor) {
    endpoint += `&cursor=${encodeURIComponent(cursor)}`
  }
  return fetchFeedGenerator(endpoint)
}
