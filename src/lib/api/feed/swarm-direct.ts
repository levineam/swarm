import {AppBskyFeedDefs} from '@atproto/api'
import {QueryClient} from '@tanstack/react-query'

import {DEBUG} from '#/lib/constants'
import {isWeb} from '#/platform/detection'
import {FeedAPI, FeedAPIResponse} from './types'

type FeedGeneratorResponse = {
  cursor?: string
  feed: {post: string}[]
}

/**
 * A direct-only implementation of the Swarm feed API that bypasses hydration
 * This fetches the raw feed skeleton and then creates simplified post views that
 * can be displayed by the UI without requiring the full hydration process
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
    qc: _qc,
  }: {
    limit?: number
    cursor?: string
    qc?: QueryClient
  }): Promise<FeedAPIResponse> {
    if (DEBUG.SWARM_LOG_RESPONSES) {
      console.log('SwarmFeedAPIDirectOnly.get: fetching feed directly', {
        isWeb: isWeb,
        feedUri: this.opts.feedUri,
      })
    }

    try {
      // Use a simple, reliable approach for all environments
      const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'

      // Build the URL with proper encoding of the feed parameter
      const url = `${feedGeneratorUrl}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        this.opts.feedUri,
      )}&limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`

      if (DEBUG.SWARM_LOG_RESPONSES) {
        console.log('SwarmFeedAPIDirectOnly.get: request URL', url)
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Origin: isWeb ? window.location.origin : 'app://swarm',
        },
      })

      if (!res.ok) {
        console.error('SwarmFeedAPIDirectOnly.get: fetch error', {
          status: res.status,
          statusText: res.statusText,
        })

        return this.createFallbackFeed(limit, cursor)
      }

      const data = (await res.json()) as FeedGeneratorResponse
      return await this.processFeedResponse(data, limit, cursor)
    } catch (error) {
      console.error('SwarmFeedAPIDirectOnly.get error:', error)
      return this.createFallbackFeed(limit, cursor)
    }
  }

  // Process the feed data response and convert it to the expected format
  private async processFeedResponse(
    data: FeedGeneratorResponse,
    _limit: number,
    _cursor?: string,
  ): Promise<FeedAPIResponse> {
    if (DEBUG.SWARM_LOG_RESPONSES) {
      console.log('SwarmFeedAPIDirectOnly: received skeleton data', data)
    }

    // Get post view data directly using the agent if available
    if (this.opts.agent && this.opts.agent.session) {
      try {
        if (DEBUG.SWARM_LOG_RESPONSES) {
          console.log(
            'SwarmFeedAPIDirectOnly.get: attempting to get posts using agent getPosts',
          )
        }

        // Extract post URIs
        const postUris = data.feed.map(item => item.post)

        // Get post data using the agent's getPosts method
        const postsResponse = await this.opts.agent.getPosts({
          uris: postUris,
        })

        if (DEBUG.SWARM_LOG_RESPONSES) {
          console.log('SwarmFeedAPIDirectOnly.get: agent getPosts succeeded', {
            postsCount: postsResponse.data.posts.length,
          })
        }

        // Format the posts into feed view posts
        const feed = postsResponse.data.posts.map((post: any) => ({
          post,
        })) as AppBskyFeedDefs.FeedViewPost[]

        return {
          cursor: data.cursor,
          feed,
        }
      } catch (error) {
        console.error('SwarmFeedAPIDirectOnly.get: hydration error', error)

        // Fall back to simplified post views on hydration error
        return this.createSimplifiedPosts(data)
      }
    }

    // Fall back to simplified post views if agent is not available
    return this.createSimplifiedPosts(data)
  }

  // Create simplified posts from the feed skeleton when hydration fails
  private createSimplifiedPosts(data: FeedGeneratorResponse): FeedAPIResponse {
    if (DEBUG.SWARM_LOG_RESPONSES) {
      console.log('SwarmFeedAPIDirectOnly: creating simplified posts', data)
    }

    const feed = data.feed.map((item, index) => {
      const postUri = item.post
      const segments = postUri.split('/')
      const authorDid = segments[2]
      const postId = segments[4]

      return {
        post: {
          $type: 'app.bsky.feed.defs#postView',
          uri: postUri,
          cid: `temp-cid-${postId}`,
          author: {
            $type: 'app.bsky.actor.defs#profileViewBasic',
            did: authorDid,
            handle: `${authorDid.substring(8, 16)}.bsky.social`,
            displayName: `Swarm User (${authorDid.substring(12, 16)})`,
            avatar: `https://avatar.bluesky.xyz/avatar/placeholder_${index}.jpg`,
            viewer: {
              $type: 'app.bsky.actor.defs#viewerState',
              muted: false,
              blockedBy: false,
            },
          },
          record: {
            $type: 'app.bsky.feed.post',
            text: `This post is from the Swarm community feed. Tap to view the full content.`,
            createdAt: new Date(Date.now() - index * 60000).toISOString(),
            langs: ['en'],
          },
          replyCount: 0,
          repostCount: 0,
          likeCount: 0,
          indexedAt: new Date(Date.now() - index * 60000).toISOString(),
          viewer: {
            $type: 'app.bsky.feed.defs#viewerState',
          },
        },
      } as AppBskyFeedDefs.FeedViewPost
    })

    return {
      cursor: data.cursor,
      feed,
    }
  }

  // Create completely fake feed for fallback situations
  private createFallbackFeed(
    limit: number = 10,
    _cursor?: string,
  ): FeedAPIResponse {
    const feed: AppBskyFeedDefs.FeedViewPost[] = []

    for (let i = 0; i < limit; i++) {
      feed.push({
        post: {
          $type: 'app.bsky.feed.defs#postView',
          uri: `at://did:placeholder/app.bsky.feed.post/swarm-post-${i}`,
          cid: `placeholder-cid-${i}`,
          author: {
            $type: 'app.bsky.actor.defs#profileViewBasic',
            did: `did:plc:swarm${i}`,
            handle: `swarm${i}.bsky.social`,
            displayName: `Swarm Community Member ${i}`,
            avatar: 'https://avatar.bluesky.xyz/avatar/placeholder.jpg',
            viewer: {
              $type: 'app.bsky.actor.defs#viewerState',
              muted: false,
              blockedBy: false,
            },
          },
          record: {
            $type: 'app.bsky.feed.post',
            text: `Welcome to the Swarm community! This is a placeholder post. Real posts will appear soon. The feed generator may be experiencing temporary issues. Follow @swarm.bsky.social for updates.`,
            createdAt: new Date(Date.now() - i * 300000).toISOString(),
            langs: ['en'],
          },
          replyCount: Math.floor(Math.random() * 5),
          repostCount: Math.floor(Math.random() * 10),
          likeCount: Math.floor(Math.random() * 20),
          indexedAt: new Date(Date.now() - i * 300000).toISOString(),
          viewer: {
            $type: 'app.bsky.feed.defs#viewerState',
          },
        },
      } as AppBskyFeedDefs.FeedViewPost)
    }

    return {
      cursor: undefined, // No more pages for fallback
      feed,
    }
  }

  // Implement required methods for FeedAPI interface
  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    try {
      // Fetch just one post to peek at the latest
      const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'
      const url = `${feedGeneratorUrl}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        this.opts.feedUri,
      )}&limit=1`

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Origin: isWeb ? window.location.origin : 'app://swarm',
        },
      })

      if (!res.ok) {
        throw new Error(
          `Failed to peek at feed: ${res.status} ${res.statusText}`,
        )
      }

      const data = (await res.json()) as FeedGeneratorResponse

      if (!data.feed || data.feed.length === 0) {
        return this.createFallbackPost()
      }

      // Try to get the post data from the agent
      if (this.opts.agent && this.opts.agent.session) {
        try {
          const postUri = data.feed[0].post
          const postsResponse = await this.opts.agent.getPosts({
            uris: [postUri],
          })

          if (postsResponse.data.posts.length > 0) {
            return {
              post: postsResponse.data.posts[0],
            } as AppBskyFeedDefs.FeedViewPost
          }
        } catch (error) {
          console.error(
            'SwarmFeedAPIDirectOnly.peekLatest hydration error:',
            error,
          )
          // Fall through to simplified creation
        }
      }

      // Create simplified post if hydration fails
      const item = data.feed[0]
      const postUri = item.post
      const segments = postUri.split('/')
      const authorDid = segments[2]
      const postId = segments[4]

      return {
        post: {
          $type: 'app.bsky.feed.defs#postView',
          uri: postUri,
          cid: `temp-cid-${postId}`,
          author: {
            $type: 'app.bsky.actor.defs#profileViewBasic',
            did: authorDid,
            handle: `${authorDid.substring(8, 16)}.bsky.social`,
            displayName: `Swarm User (${authorDid.substring(12, 16)})`,
            avatar: 'https://avatar.bluesky.xyz/avatar/placeholder.jpg',
            viewer: {
              $type: 'app.bsky.actor.defs#viewerState',
              muted: false,
              blockedBy: false,
            },
          },
          record: {
            $type: 'app.bsky.feed.post',
            text: `Latest post from the Swarm community feed.`,
            createdAt: new Date().toISOString(),
            langs: ['en'],
          },
          replyCount: 0,
          repostCount: 0,
          likeCount: 0,
          indexedAt: new Date().toISOString(),
          viewer: {
            $type: 'app.bsky.feed.defs#viewerState',
          },
        },
      } as AppBskyFeedDefs.FeedViewPost
    } catch (error) {
      console.error('SwarmFeedAPIDirectOnly.peekLatest error:', error)
      return this.createFallbackPost()
    }
  }

  // Simple fallback post for the peekLatest method
  private createFallbackPost(): AppBskyFeedDefs.FeedViewPost {
    return {
      post: {
        $type: 'app.bsky.feed.defs#postView',
        uri: 'at://placeholder/placeholder',
        cid: 'placeholder',
        author: {
          $type: 'app.bsky.actor.defs#profileViewBasic',
          did: 'did:placeholder',
          handle: 'swarm.bsky.social',
          displayName: 'Swarm Community',
          avatar: 'https://avatar.bluesky.xyz/avatar/placeholder.jpg',
          viewer: {
            $type: 'app.bsky.actor.defs#viewerState',
            muted: false,
            blockedBy: false,
          },
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: 'Welcome to the Swarm community feed! Posts will appear here soon.',
          createdAt: new Date().toISOString(),
          langs: ['en'],
        },
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: new Date().toISOString(),
        viewer: {
          $type: 'app.bsky.feed.defs#viewerState',
        },
      },
    } as AppBskyFeedDefs.FeedViewPost
  }

  // Implements fetch method required by FeedAPI interface
  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    // Simply delegate to the get method
    return this.get({limit, cursor})
  }
}
