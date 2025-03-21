import {useState} from 'react'
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {AppBskyFeedDefs} from '@atproto/api'

import {SwarmFeedAPI} from '#/lib/api/feed/swarm'
import {SWARM_FEED_URI} from '#/lib/constants'
import {usePalette} from '#/lib/hooks/usePalette'
import {useAgent} from '#/state/session'

export function SwarmFeedTest() {
  const pal = usePalette('default')
  const agent = useAgent()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedSkeleton, setFeedSkeleton] = useState<any | null>(null)
  const [hydratedPosts, setHydratedPosts] = useState<
    AppBskyFeedDefs.FeedViewPost[] | null
  >(null)

  const testFeedSkeletonDirect = async () => {
    setLoading(true)
    setError(null)
    setFeedSkeleton(null)
    setHydratedPosts(null)

    try {
      // Direct fetch of feed skeleton
      const url = `https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(
        SWARM_FEED_URI,
      )}&limit=10`

      console.log('Testing direct feed skeleton fetch:', url)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(
          `Feed skeleton request failed: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      console.log('Feed skeleton data:', data)
      setFeedSkeleton(data)

      // Now try to hydrate the posts
      if (data.feed && data.feed.length > 0) {
        const postUris = data.feed.map((item: any) => item.post)

        console.log('Hydrating posts with uris:', postUris)
        const postsResponse = await agent.app.bsky.feed.getPosts({
          uris: postUris,
        })

        console.log('Posts hydration response:', postsResponse)

        // Create feed view posts
        const feedViewPosts = data.feed
          .map((item: any) => {
            const post = postsResponse.data.posts.find(p => p.uri === item.post)
            return post
              ? {
                  post,
                  reason: undefined,
                }
              : null
          })
          .filter(Boolean)

        console.log('Hydrated feed posts:', feedViewPosts)
        setHydratedPosts(feedViewPosts as AppBskyFeedDefs.FeedViewPost[])
      }
    } catch (err) {
      console.error('Test failed:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const testSwarmFeedAPI = async () => {
    setLoading(true)
    setError(null)
    setFeedSkeleton(null)
    setHydratedPosts(null)

    try {
      // Test the SwarmFeedAPI implementation
      console.log('Testing SwarmFeedAPI implementation')

      // Create the API instance
      const api = new SwarmFeedAPI({
        agent,
        feedUri: SWARM_FEED_URI,
      })

      // Log auth state
      console.log('Auth state:', {
        hasSession: !!agent.session,
        sessionDid: agent.session?.did ?? 'none',
      })

      // Fetch the feed
      const feedResponse = await api.fetch({
        cursor: undefined,
        limit: 10,
      })

      console.log('SwarmFeedAPI response:', feedResponse)

      // Set the hydrated posts
      setHydratedPosts(feedResponse.feed)
    } catch (err) {
      console.error('SwarmFeedAPI test failed:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.container, {backgroundColor: pal.colors.background}]}>
      <Text style={[styles.title, {color: pal.colors.text}]}>
        Swarm Feed Debug Test
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Test Direct Fetch + Hydration"
          onPress={testFeedSkeletonDirect}
          disabled={loading}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="Test SwarmFeedAPI"
          onPress={testSwarmFeedAPI}
          disabled={loading}
        />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={pal.colors.link} />
          <Text style={{color: pal.colors.text, marginTop: 10}}>
            Loading...
          </Text>
        </View>
      )}

      {error && (
        <View
          style={[
            styles.errorContainer,
            {backgroundColor: pal.colors.backgroundError},
          ]}>
          <Text style={{color: pal.colors.textError}}>Error: {error}</Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        {feedSkeleton && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: pal.colors.text}]}>
              Feed Skeleton Response:
            </Text>
            <Text
              style={[styles.codeText, {color: pal.colors.textLight}]}
              selectable>
              {JSON.stringify(feedSkeleton, null, 2)}
            </Text>
          </View>
        )}

        {hydratedPosts && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: pal.colors.text}]}>
              Hydrated Posts ({hydratedPosts.length}):
            </Text>
            {hydratedPosts.map((post, i) => (
              <View
                key={i}
                style={[
                  styles.postContainer,
                  {borderColor: pal.colors.border},
                ]}>
                <Text style={{color: pal.colors.text, fontWeight: 'bold'}}>
                  {post.post.author.displayName || post.post.author.handle}
                </Text>
                <Text style={{color: pal.colors.text}}>
                  {typeof post.post.record === 'object' &&
                  'text' in post.post.record
                    ? (post.post.record.text as string)
                    : 'No text content'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  buttonSpacer: {
    width: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  postContainer: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
})
