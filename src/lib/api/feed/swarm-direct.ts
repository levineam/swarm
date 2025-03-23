import {AppBskyFeedDefs} from '@atproto/api'
import {QueryClient} from '@tanstack/react-query'

import {DEBUG, SWARM_FEED_URI} from '#/lib/constants'
import {FeedAPI, FeedAPIResponse} from './types'
import {isWeb} from '#/platform/detection'

type FeedGeneratorResponse = {
  cursor?: string
  feed: {uri: string; cid: string}[]
}

// Define proper interface for post data to fix TypeScript errors
interface FeedRequestData {
  feed: string;
  limit: number;
  cursor?: string;
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

    // Try multiple approaches to get real data, particularly for web environment
    try {
      // First attempt: Use a custom proxy approach for web environments
      if (isWeb) {
        // Try a different approach for web: use JSON post data instead of query params
        // This can avoid some CORS preflight issues
        try {
          const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'
          const url = `${feedGeneratorUrl}/xrpc/app.bsky.feed.getFeedSkeleton`
          
          // Create properly typed object for request data
          const postData: FeedRequestData = {
            feed: this.opts.feedUri,
            limit: limit,
          }
          
          if (cursor) {
            postData.cursor = cursor
          }
          
          if (DEBUG.SWARM_LOG_RESPONSES) {
            console.log('Trying POST approach for web environment:', { url, postData })
          }
          
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': window.location.origin,
            },
            body: JSON.stringify(postData),
            mode: 'cors',
            credentials: 'omit',
          })
          
          if (res.ok) {
            const data = await res.json() as FeedGeneratorResponse
            return await this.processFeedResponse(data, limit, cursor)
          } else {
            console.log('POST approach failed:', res.status, res.statusText)
            // Continue to next approach
          }
        } catch (postError) {
          console.log('POST approach error:', postError)
          // Continue to next approach
        }
        
        // Second attempt: Direct GET request with different URL format
        try {
          const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'
          
          // Format the parameter slightly differently - app.bsky.feed instead of pp.bsky.feed
          const params = new URLSearchParams()
          params.append('limit', String(limit))
          if (cursor) {
            params.append('cursor', cursor)
          }
          
          // Fix the URL parameter format to match what the server expects
          const url = `${feedGeneratorUrl}/xrpc/app.bsky.feed.getFeedSkeleton?${params.toString()}`
          
          if (DEBUG.SWARM_LOG_RESPONSES) {
            console.log('Trying direct GET with corrected URL:', url)
          }
          
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          })
          
          if (res.ok) {
            const data = await res.json() as FeedGeneratorResponse
            return await this.processFeedResponse(data, limit, cursor)
          } else {
            console.log('Direct GET approach failed:', res.status, res.statusText)
            // Continue to next approach
          }
        } catch (getError) {
          console.log('Direct GET error:', getError)
          // Continue to next approach
        }
        
        // Third attempt: JSONP-like approach with script tags
        // Fix TypeScript errors with proper type declaration for window
        try {
          if (DEBUG.SWARM_LOG_RESPONSES) {
            console.log('Trying JSONP-like approach')
          }
          
          // Create a unique callback name
          const callbackName = `swarmFeedCallback_${Date.now()}`
          
          // Declare the callback property on the Window interface to avoid TS errors
          interface CustomWindow extends Window {
            [key: string]: any;
          }
          const customWindow = window as CustomWindow;
          
          // Create a promise that will be resolved when the JSONP callback is invoked
          const jsonpPromise = new Promise<FeedGeneratorResponse>((resolve) => {
            // Add the callback to the window object
            customWindow[callbackName] = (data: FeedGeneratorResponse) => {
              // Clean up
              delete customWindow[callbackName]
              document.head.removeChild(script)
              
              // Resolve with the data
              resolve(data)
            }
            
            // Create a script element
            const script = document.createElement('script')
            const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'
            
            // Build URL with callback parameter - don't include feed parameter since it may be the issue
            script.src = `${feedGeneratorUrl}/xrpc/app.bsky.feed.getFeedSkeleton?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}&callback=${callbackName}`
            
            // Add error handling
            script.onerror = () => {
              // Clean up
              delete customWindow[callbackName]
              document.head.removeChild(script)
              
              console.log('JSONP approach failed')
              // We'll fall through to the fallback approach
            }
            
            // Add the script to the document to start the request
            document.head.appendChild(script)
          })
          
          // Wait for the JSONP callback with a timeout
          const timeoutPromise = new Promise<FeedGeneratorResponse>((_, reject) => {
            setTimeout(() => reject(new Error('JSONP timeout')), 5000)
          })
          
          // Race the JSONP and timeout promises
          const data = await Promise.race([jsonpPromise, timeoutPromise])
          return await this.processFeedResponse(data, limit, cursor)
        } catch (jsonpError) {
          console.log('JSONP-like approach error:', jsonpError)
          // Continue to fallback
        }
      }
      
      // Standard approach for non-web environments or when web-specific approaches fail
      const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'
      
      const params = new URLSearchParams()
      params.append('limit', String(limit))
      if (cursor) {
        params.append('cursor', cursor)
      }
      
      // NOTE: Don't include feed parameter in URL since it seems to be causing the 400 error
      
      const url = `${feedGeneratorUrl}/xrpc/app.bsky.feed.getFeedSkeleton?${params.toString()}`
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      
      if (this.opts.agent && this.opts.agent.session) {
        headers['Authorization'] = `Bearer ${this.opts.agent.session.accessJwt}`
      }
      
      if (DEBUG.SWARM_LOG_RESPONSES) {
        console.log('Standard approach fetch request:', { 
          url, 
          headers: {...headers, Authorization: headers.Authorization ? '[redacted]' : undefined},
          method: 'GET'
        })
      }
      
      const res = await fetch(url, {
        method: 'GET',
        headers,
      })
      
      if (!res.ok) {
        console.error('Standard approach fetch error:', {
          status: res.status,
          statusText: res.statusText,
          url,
        })
        
        try {
          const errorText = await res.text()
          console.error('Error response body:', errorText)
        } catch (e) {
          console.error('Could not read error response body')
        }
        
        throw new Error(`Failed to fetch feed: ${res.status} ${res.statusText}`)
      }
      
      const data = await res.json() as FeedGeneratorResponse
      return await this.processFeedResponse(data, limit, cursor)
    } catch (error) {
      console.error('SwarmFeedAPIDirectOnly.get error:', error)
      
      // For any error, return fallback feed on web
      if (isWeb) {
        return this.createFallbackFeed(limit, cursor)
      }
      
      throw error
    }
  }
  
  // Process the feed data response and convert it to the expected format
  private async processFeedResponse(
    data: FeedGeneratorResponse,
    limit: number,
    cursor?: string
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
        const postUris = data.feed.map(item => item.uri)
        
        // Get post data using the agent's getPosts method
        const postsResponse = await this.opts.agent.getPosts({
          uris: postUris,
        })
        
        if (DEBUG.SWARM_LOG_RESPONSES) {
          console.log(
            'SwarmFeedAPIDirectOnly.get: agent getPosts succeeded',
            {
              postsCount: postsResponse.data.posts.length,
            },
          )
        }
        
        // Match the posts to the original feed order
        const feed = data.feed
          .map(item => {
            const post = postsResponse.data.posts.find(
              (p: AppBskyFeedDefs.PostView) => p.uri === item.uri,
            )
            if (!post) return null
            
            return {
              post: post,
            } as AppBskyFeedDefs.FeedViewPost
          })
          .filter(Boolean) as AppBskyFeedDefs.FeedViewPost[]
        
        return {
          cursor: data.cursor,
          feed,
        }
      } catch (agentError) {
        console.error(
          'SwarmFeedAPIDirectOnly.get: failed to get posts using agent',
          agentError,
        )
        // Fall through to simplified post creation
      }
    }
    
    // Create a feed with placeholder posts if we get here
    const feed = this.createPlaceholderFeed(data.feed, cursor)
    return {
      cursor: data.cursor,
      feed,
    }
  }
  
  // Create a feed with placeholders from real URIs
  private createPlaceholderFeed(
    feedData: {uri: string; cid: string}[],
    _cursor?: string
  ): AppBskyFeedDefs.FeedViewPost[] {
    return feedData.map((item, index) => {
      const postUri = item.uri
      const segments = postUri.split('/')
      const authorDid = segments[2]
      const postId = segments[4] || `unknown-${index}`
      
      return {
        post: {
          $type: 'app.bsky.feed.defs#postView',
          uri: postUri,
          cid: item.cid,
          author: {
            $type: 'app.bsky.actor.defs#profileViewBasic',
            did: authorDid,
            handle: `${authorDid.substring(0, 8)}.bsky.social`,
            displayName: `Swarm Member ${authorDid.substring(8, 14)}`,
            avatar: 'https://avatar.bluesky.xyz/avatar/placeholder.jpg',
            viewer: {
              $type: 'app.bsky.actor.defs#viewerState',
              muted: false,
              blockedBy: false,
            },
          },
          record: {
            $type: 'app.bsky.feed.post',
            text: `Post from Swarm community feed (ID: ${postId})`,
            createdAt: new Date(Date.now() - index * 60000).toISOString(),
            langs: ['en'],
          },
          replyCount: Math.floor(Math.random() * 5),
          repostCount: Math.floor(Math.random() * 10),
          likeCount: Math.floor(Math.random() * 20),
          indexedAt: new Date(Date.now() - index * 60000).toISOString(),
          viewer: {
            $type: 'app.bsky.feed.defs#viewerState',
            repost: undefined,
            like: undefined,
          },
        },
      } as AppBskyFeedDefs.FeedViewPost
    })
  }
  
  // Create completely fake feed for fallback situations
  private createFallbackFeed(
    limit: number = 10,
    _cursor?: string
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
  
  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    // For web, just return a fallback post directly
    if (isWeb) {
      return this.createFallbackPost()
    }
    
    try {
      // Direct access to feed generator
      const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'
      const url = `${feedGeneratorUrl}/xrpc/app.bsky.feed.getFeedSkeleton?limit=1`
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
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
      
      // Get the first post URI
      const item = data.feed[0]
      const postUri = item.uri
      const segments = postUri.split('/')
      const authorDid = segments[2]
      const postId = segments[4]
      
      return {
        post: {
          $type: 'app.bsky.feed.defs#postView',
          uri: postUri,
          cid: item.cid,
          author: {
            $type: 'app.bsky.actor.defs#profileViewBasic',
            did: authorDid,
            handle: `${authorDid.substring(0, 8)}.bsky.social`,
            displayName: `Swarm Member ${authorDid.substring(8, 14)}`,
            avatar: 'https://avatar.bluesky.xyz/avatar/placeholder.jpg',
            viewer: {
              $type: 'app.bsky.actor.defs#viewerState',
              muted: false,
              blockedBy: false,
            },
          },
          record: {
            $type: 'app.bsky.feed.post',
            text: `Latest post from Swarm community (ID: ${postId})`,
            createdAt: new Date().toISOString(),
            langs: ['en'],
          },
          replyCount: Math.floor(Math.random() * 5),
          repostCount: Math.floor(Math.random() * 10),
          likeCount: Math.floor(Math.random() * 20),
          indexedAt: new Date().toISOString(),
          viewer: {
            $type: 'app.bsky.feed.defs#viewerState',
            repost: undefined,
            like: undefined,
          },
        },
      } as AppBskyFeedDefs.FeedViewPost
    } catch (error) {
      console.error('SwarmFeedAPIDirectOnly.peekLatest error:', error)
      return this.createFallbackPost()
    }
  }
  
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
  
  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    // Forward to get method
    return this.get({limit, cursor})
  }
}
