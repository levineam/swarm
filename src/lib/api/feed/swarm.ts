import {AppBskyFeedDefs, BskyAgent} from '@atproto/api'

import {FeedAPI, FeedAPIResponse} from './types'

/**
 * A custom feed API implementation that uses the CORS proxy for Swarm feed
 */
export class SwarmFeedAPI implements FeedAPI {
  agent: BskyAgent
  feedUri: string

  constructor({agent, feedUri}: {agent: BskyAgent; feedUri: string}) {
    this.agent = agent
    this.feedUri = feedUri
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    // Use direct approach to fetch just 1 post to peek at the latest
    const response = await fetch(
      `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        this.feedUri,
      )}&limit=1`,
    )

    if (!response.ok) {
      throw new Error(
        `Failed to peek at feed: ${response.status} ${response.statusText}`,
      )
    }

    const data = await response.json()

    // If there are no posts, return an empty feed
    if (!data.feed || data.feed.length === 0) {
      throw new Error('No posts in feed')
    }

    // Get the first post details
    const postUri = data.feed[0].post
    const postsResponse = await this.agent.app.bsky.feed.getPosts({
      uris: [postUri],
    })

    // Create a feed view post from the response
    return {
      post: postsResponse.data.posts[0],
      reason: undefined,
    }
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    try {
      console.log('SwarmFeedAPI: Fetching feed', {
        feedUri: this.feedUri,
        limit,
        cursor,
      })

      // Try direct request to feed generator first (bypassing the proxy)
      let url = `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        this.feedUri,
      )}&limit=${limit}`
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`
      }

      console.log('SwarmFeedAPI: Requesting URL', url)

      // Fetch feed skeleton directly
      const response = await fetch(url)

      // Log response status
      console.log('SwarmFeedAPI: Skeleton response status', response.status)

      if (!response.ok) {
        console.error('SwarmFeedAPI: Failed to fetch feed skeleton', {
          status: response.status,
          statusText: response.statusText,
        })
        return {feed: []}
      }

      const skeletonData = await response.json()
      console.log('SwarmFeedAPI: Got feed skeleton', {
        feedLength: skeletonData.feed?.length || 0,
        cursor: skeletonData.cursor,
        skeleton: JSON.stringify(skeletonData).substring(0, 200), // Show start of the data
      })

      // If there are no posts, return an empty feed
      if (!skeletonData.feed || skeletonData.feed.length === 0) {
        console.log(
          'SwarmFeedAPI: Feed skeleton is empty, returning empty feed',
        )
        return {feed: []}
      }

      // Extract post URIs from the skeleton
      const postUris = skeletonData.feed.map((item: any) => item.post)
      console.log('SwarmFeedAPI: Hydrating posts', {
        uris: postUris.slice(0, 3), // Log first 3 URIs for debugging
        count: postUris.length,
      })

      try {
        // Fetch the full post data using the ATProto API
        console.log('SwarmFeedAPI: Calling agent.app.bsky.feed.getPosts')
        const postsResponse = await this.agent.app.bsky.feed.getPosts({
          uris: postUris,
        })

        console.log('SwarmFeedAPI: Hydration response', {
          success: postsResponse.success,
          postsCount: postsResponse.data.posts.length,
        })

        // Check if we got fewer posts than we requested
        if (postsResponse.data.posts.length < postUris.length) {
          console.warn('SwarmFeedAPI: Some posts not found during hydration', {
            requestedCount: postUris.length,
            receivedCount: postsResponse.data.posts.length,
          })
        }

        // Build a properly formatted feed response
        const feed = skeletonData.feed
          .map((item: any) => {
            const post = postsResponse.data.posts.find(p => p.uri === item.post)
            if (!post) {
              console.log('SwarmFeedAPI: Missing post data for URI', item.post)
              return null
            }
            return {
              post: post,
              reason: undefined,
            }
          })
          .filter((item: any) => item && item.post) // Filter out any undefined posts

        console.log('SwarmFeedAPI: Final feed response', {
          feedLength: feed.length,
          cursor: skeletonData.cursor,
        })

        // Log authentication state
        console.log('SwarmFeedAPI: Authentication state', {
          hasSession: !!this.agent.session,
          sessionDid: this.agent.session?.did ?? 'none',
        })

        return {
          cursor: skeletonData.cursor,
          feed,
        }
      } catch (hydrationError) {
        console.error('SwarmFeedAPI: Post hydration failed', hydrationError)
        // Log auth state on error
        console.log('SwarmFeedAPI: Auth state during error', {
          hasSession: !!this.agent.session,
          sessionDid: this.agent.session?.did ?? 'none',
        })
        return {feed: []}
      }
    } catch (error) {
      console.error('SwarmFeedAPI: Error fetching feed', error)
      return {feed: []}
    }
  }
}
