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
    try {
      console.log('SwarmFeedAPI: peekLatest - Attempting to fetch latest post')

      // Use direct approach to fetch just 1 post to peek at the latest
      const response = await fetch(
        `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
          this.feedUri,
        )}&limit=1`,
      )

      console.log('SwarmFeedAPI: peekLatest response status', response.status)

      if (!response.ok) {
        throw new Error(
          `Failed to peek at feed: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      console.log(
        'SwarmFeedAPI: peekLatest got skeleton with',
        data.feed?.length || 0,
        'posts',
      )

      // If there are no posts, create a fallback response with empty content
      // This prevents errors from bubbling up to the UI
      if (!data.feed || data.feed.length === 0) {
        console.log(
          'SwarmFeedAPI: peekLatest - No posts in feed, returning fallback',
        )
        return {
          post: {
            uri: 'at://placeholder/placeholder',
            cid: 'placeholder',
            author: {
              did: 'did:placeholder',
              handle: 'placeholder.bsky.social',
              viewer: {},
            },
            record: {text: ''},
            indexedAt: new Date().toISOString(),
            viewer: {},
          },
          reason: undefined,
        }
      }

      // Get the first post URI
      const postUri = data.feed[0].post
      console.log('SwarmFeedAPI: peekLatest - Hydrating post', postUri)

      try {
        // Get the post details
        const postsResponse = await this.agent.app.bsky.feed.getPosts({
          uris: [postUri],
        })

        console.log(
          'SwarmFeedAPI: peekLatest - Hydration response with',
          postsResponse.data.posts.length,
          'posts',
        )

        // If no posts returned from hydration, return fallback
        if (!postsResponse.data.posts.length) {
          console.log(
            'SwarmFeedAPI: peekLatest - No posts after hydration, returning fallback',
          )
          return {
            post: {
              uri: postUri,
              cid: 'placeholder',
              author: {
                did: 'did:placeholder',
                handle: 'placeholder.bsky.social',
                viewer: {},
              },
              record: {text: ''},
              indexedAt: new Date().toISOString(),
              viewer: {},
            },
            reason: undefined,
          }
        }

        // Create a feed view post from the response
        console.log(
          'SwarmFeedAPI: peekLatest - Successfully retrieved latest post',
        )
        return {
          post: postsResponse.data.posts[0],
          reason: undefined,
        }
      } catch (hydrationError) {
        console.error(
          'SwarmFeedAPI: peekLatest - Hydration failed',
          hydrationError,
        )

        // Return a fallback post to prevent UI errors
        return {
          post: {
            uri: postUri,
            cid: 'placeholder',
            author: {
              did: 'did:placeholder',
              handle: 'placeholder.bsky.social',
              viewer: {},
            },
            record: {text: ''},
            indexedAt: new Date().toISOString(),
            viewer: {},
          },
          reason: undefined,
        }
      }
    } catch (error) {
      console.error('SwarmFeedAPI: peekLatest failed', error)

      // Return a fallback post to prevent UI errors
      return {
        post: {
          uri: 'at://placeholder/placeholder',
          cid: 'placeholder',
          author: {
            did: 'did:placeholder',
            handle: 'placeholder.bsky.social',
            viewer: {},
          },
          record: {text: ''},
          indexedAt: new Date().toISOString(),
          viewer: {},
        },
        reason: undefined,
      }
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

      // Log authentication state at the start of the request
      console.log('SwarmFeedAPI: Authentication state at start', {
        hasSession: !!this.agent.session,
        sessionDid: this.agent.session?.did ?? 'none',
        accessJwtLength: this.agent.session?.accessJwt?.length ?? 0,
        refreshJwtLength: this.agent.session?.refreshJwt?.length ?? 0,
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
        // Log before hydration call
        console.log('SwarmFeedAPI: About to call getPosts with auth state', {
          hasSession: !!this.agent.session,
          sessionDid: this.agent.session?.did ?? 'none',
          accessJwtPresent: !!this.agent.session?.accessJwt,
        })

        // Fetch the full post data using the ATProto API
        console.log('SwarmFeedAPI: Calling agent.app.bsky.feed.getPosts')
        const postsResponse = await this.agent.app.bsky.feed.getPosts({
          uris: postUris,
        })

        console.log('SwarmFeedAPI: Hydration response', {
          success: postsResponse.success,
          postsCount: postsResponse.data.posts.length,
          firstPostType:
            postsResponse.data.posts.length > 0
              ? typeof postsResponse.data.posts[0]
              : 'none',
          firstPostFields:
            postsResponse.data.posts.length > 0
              ? Object.keys(postsResponse.data.posts[0])
              : [],
        })

        // Check if we got fewer posts than we requested
        if (postsResponse.data.posts.length < postUris.length) {
          console.warn('SwarmFeedAPI: Some posts not found during hydration', {
            requestedCount: postUris.length,
            receivedCount: postsResponse.data.posts.length,
            missingUris: postUris
              .filter(
                (uri: string) =>
                  !postsResponse.data.posts.some(post => post.uri === uri),
              )
              .slice(0, 3), // First 3 missing URIs
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
          firstPostContent:
            feed.length > 0
              ? typeof feed[0].post.record === 'object' &&
                'text' in feed[0].post.record
                ? (feed[0].post.record.text as string).substring(0, 50)
                : 'No text content'
              : 'No posts',
        })

        // Log authentication state
        console.log('SwarmFeedAPI: Authentication state at end', {
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
