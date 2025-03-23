import {AppBskyFeedDefs} from '@atproto/api'
import {QueryClient} from '@tanstack/react-query'

import {DEBUG} from '#/lib/constants'
import {FeedAPI, FeedAPIResponse} from './types'

type FeedGeneratorResponse = {
  cursor?: string
  feed: {uri: string; cid: string}[]
}

/**
 * A direct-only implementation of the Swarm feed API that completely bypasses hydration
 * This is used for testing to determine if hydration is the source of the issue
 */
export class SwarmFeedAPIDirectOnly implements FeedAPI {
  constructor(public opts: {agent: any; feedUri: string}) {}

  queryKey({limit = 50, cursor}: {limit?: number; cursor?: string}) {
    return [
      'api',
      'swarm',
      'direct',
      'feed',
      this.opts.feedUri,
      {limit, cursor},
    ]
  }

  async get({
    limit = 50,
    cursor,
    qc: _qc, // Rename to _qc to ignore unused arg
  }: {
    limit?: number
    cursor?: string
    qc?: QueryClient
  }): Promise<FeedAPIResponse> {
    if (DEBUG.SWARM_LOG_RESPONSES) {
      console.log('SwarmFeedAPIDirectOnly.get: fetching feed directly')
    }

    // Direct access to feed generator
    const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'

    const params = new URLSearchParams()
    params.append('limit', String(limit))
    if (cursor) {
      params.append('cursor', cursor)
    }

    const url = `${feedGeneratorUrl}/xrpc/app.bsky.feed.getFeedSkeleton?${params.toString()}`

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch feed: ${res.status} ${res.statusText}`)
      }

      const data = (await res.json()) as FeedGeneratorResponse
      if (DEBUG.SWARM_LOG_RESPONSES) {
        console.log('SwarmFeedAPIDirectOnly.get: received response', data)
      }

      // Return empty array - bypassing hydration completely for testing
      return {
        cursor: data.cursor,
        feed: [], // Empty array - no hydration, pure direct test
      }
    } catch (error) {
      console.error('SwarmFeedAPIDirectOnly.get error:', error)
      throw error
    }
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    try {
      console.log(
        'SwarmFeedAPIDirectOnly: peekLatest - Attempting to fetch latest post',
      )

      // Use direct approach to fetch just 1 post to peek at the latest
      const response = await fetch(
        `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
          this.opts.feedUri,
        )}&limit=1`,
      )

      console.log(
        'SwarmFeedAPIDirectOnly: peekLatest response status',
        response.status,
      )

      if (!response.ok) {
        throw new Error(
          `Failed to peek at feed: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      console.log(
        'SwarmFeedAPIDirectOnly: peekLatest got skeleton with',
        data.feed?.length || 0,
        'posts',
      )

      // If there are no posts, create a fallback response with empty content
      if (!data.feed || data.feed.length === 0) {
        console.log(
          'SwarmFeedAPIDirectOnly: peekLatest - No posts in feed, returning fallback',
        )
        return this.createEmptyPost()
      }

      // Get the first post URI
      const postUri = data.feed[0].post
      console.log(
        'SwarmFeedAPIDirectOnly: peekLatest - Creating post from URI',
        postUri,
      )

      return this.createPostFromUri(postUri)
    } catch (error: any) {
      console.error('SwarmFeedAPIDirectOnly: peekLatest failed', error)
      return this.createEmptyPost()
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
      console.log('SwarmFeedAPIDirectOnly: fetch request', {
        feedUri: this.opts.feedUri,
        limit,
        cursor,
        timestamp: new Date().toISOString(),
      })

      // Try direct request to feed generator
      let url = `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        this.opts.feedUri,
      )}&limit=${limit}`
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`
      }

      console.log('SwarmFeedAPIDirectOnly: Requesting URL', url)

      // Fetch feed skeleton directly
      const response = await fetch(url)

      // Log response status
      console.log('SwarmFeedAPIDirectOnly: Skeleton response status', {
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString(),
      })

      if (!response.ok) {
        console.error('SwarmFeedAPIDirectOnly: Failed to fetch feed skeleton', {
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString(),
        })
        return {feed: []}
      }

      const skeletonData = await response.json()

      // Log detailed feed data for debugging
      console.log('SwarmFeedAPIDirectOnly: Got feed data', {
        feedLength: skeletonData.feed?.length || 0,
        cursor: skeletonData.cursor,
        firstPost: skeletonData.feed?.[0]
          ? JSON.stringify(skeletonData.feed[0])
          : 'none',
        timestamp: new Date().toISOString(),
      })

      // If there are no posts, return an empty feed
      if (!skeletonData.feed || skeletonData.feed.length === 0) {
        console.log(
          'SwarmFeedAPIDirectOnly: Feed skeleton is empty, returning empty feed',
        )
        return {feed: []}
      }

      // Create simplified posts from URIs - no hydration
      console.log('SwarmFeedAPIDirectOnly: Creating simplified posts')

      const feed = skeletonData.feed.map((item: any) => {
        const postUri = item.post
        return this.createPostFromUri(postUri)
      })

      console.log('SwarmFeedAPIDirectOnly: Created simplified feed', {
        generatedFeedLength: feed.length,
        timestamp: new Date().toISOString(),
      })

      return {
        cursor: skeletonData.cursor,
        feed,
      }
    } catch (error: any) {
      console.error('SwarmFeedAPIDirectOnly: Fetch failed', {
        error: error.message || String(error),
        stack: error.stack || 'No stack available',
        timestamp: new Date().toISOString(),
      })
      return {feed: []}
    }
  }

  // Helper to create a post object from a URI
  private createPostFromUri(postUri: string): AppBskyFeedDefs.FeedViewPost {
    const segments = postUri.split('/')
    const authorDid = segments[2]
    const postId = segments[4]

    return {
      $type: 'app.bsky.feed.defs#feedViewPost',
      post: {
        $type: 'app.bsky.feed.defs#postView',
        uri: postUri,
        cid: `direct-cid-${postId}`,
        author: {
          $type: 'app.bsky.actor.defs#profileViewBasic',
          did: authorDid,
          handle: `${authorDid.substring(8, 16)}.bsky.social`,
          displayName: `Swarm Member ${authorDid.substring(12, 16)}`,
          avatar: 'https://avatar.bluesky.xyz/avatar/placeholder.jpg',
          viewer: {
            $type: 'app.bsky.actor.defs#viewerState',
            muted: false,
            blockedBy: false,
          },
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: `[DIRECT] Swarm community post (ID: ${postId})`,
          createdAt: new Date().toISOString(),
          langs: ['en'],
        },
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: new Date().toISOString(),
        viewer: {
          $type: 'app.bsky.feed.defs#viewerState',
          repost: undefined,
          like: undefined,
        },
      },
      reason: undefined,
    }
  }

  // Helper to create an empty post fallback
  private createEmptyPost(): AppBskyFeedDefs.FeedViewPost {
    return {
      $type: 'app.bsky.feed.defs#feedViewPost',
      post: {
        $type: 'app.bsky.feed.defs#postView',
        uri: 'at://placeholder/placeholder',
        cid: 'placeholder',
        author: {
          $type: 'app.bsky.actor.defs#profileViewBasic',
          did: 'did:placeholder',
          handle: 'placeholder.bsky.social',
          viewer: {
            $type: 'app.bsky.actor.defs#viewerState',
            muted: false,
            blockedBy: false,
          },
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: 'No posts available in the Swarm feed at this time.',
          createdAt: new Date().toISOString(),
        },
        indexedAt: new Date().toISOString(),
        viewer: {
          $type: 'app.bsky.feed.defs#viewerState',
        },
      },
      reason: undefined,
    }
  }
}
