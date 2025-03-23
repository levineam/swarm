import {useState} from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {AppBskyFeedDefs} from '@atproto/api'

import {DEBUG, SWARM_FEED_URI, SWARM_API_PROXY} from '#/lib/constants'
import {SwarmFeedAPI} from '#/lib/api/feed/swarm'
import {SwarmFeedAPIDirectOnly} from '#/lib/api/feed/swarm-direct'
import {useAgent} from '#/state/session'
import {colors} from '#/lib/styles'

/**
 * Debug component for testing different approaches to displaying Swarm feed posts
 */
export function SwarmFeedDebug() {
  const agent = useAgent()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<AppBskyFeedDefs.FeedViewPost[]>([])
  const [diagnostics, setDiagnostics] = useState<Record<string, any>>({})

  const runTest = async (type: 'standard' | 'direct' | 'agent') => {
    try {
      setLoading(true)
      setError(null)
      setPosts([])
      setDiagnostics({})

      const startTime = Date.now()
      const testData: Record<string, any> = {
        testType: type,
        startTime: new Date().toISOString(),
      }

      // Initialize the appropriate API implementation
      let api
      if (type === 'direct') {
        testData.apiImplementation = 'SwarmFeedAPIDirectOnly'
        api = new SwarmFeedAPIDirectOnly({
          agent,
          feedUri: SWARM_FEED_URI,
        })
      } else if (type === 'agent') {
        testData.apiImplementation = 'Direct agent.getTimeline'
        testData.agentSession = {
          hasSession: !!agent.session,
          sessionDid: agent.session?.did ?? 'none',
        }

        // Use agent directly
        const timelineResponse = await agent.getTimeline({
          algorithm: SWARM_FEED_URI,
          limit: 25,
        })
        
        testData.responseTime = Date.now() - startTime
        testData.responseStatus = 'success'
        testData.feedLength = timelineResponse.data.feed.length
        
        setDiagnostics(testData)
        setPosts(timelineResponse.data.feed)
        setLoading(false)
        return
      } else {
        testData.apiImplementation = 'SwarmFeedAPI'
        api = new SwarmFeedAPI({
          agent,
          feedUri: SWARM_FEED_URI,
        })
      }

      // Fetch the feed - pass cursor as undefined to match the interface
      testData.fetchStartTime = new Date().toISOString()
      const response = await api.fetch({cursor: undefined, limit: 25})
      testData.fetchEndTime = new Date().toISOString()

      // Record diagnostics
      testData.responseTime = Date.now() - startTime
      testData.responseStatus = 'success'
      testData.feedLength = response.feed.length
      testData.hasCursor = !!response.cursor
      
      if (response.feed.length > 0) {
        testData.firstPostUri = response.feed[0].post.uri
      }

      setDiagnostics(testData)
      setPosts(response.feed)
    } catch (e: any) {
      console.error('SwarmFeedDebug test error:', e)
      setError(e.message || String(e))
      setDiagnostics({
        error: e.message || String(e),
        stack: e.stack,
        endTime: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const testDirectNetworkRequest = async () => {
    try {
      setLoading(true)
      setError(null)
      setPosts([])
      setDiagnostics({})

      const startTime = Date.now()
      const testData: Record<string, any> = {
        testType: 'network',
        startTime: new Date().toISOString(),
      }

      // Try with different auth approaches
      const feedGeneratorUrl = 'https://swarm-feed-generator.onrender.com'
      const endpoint = '/xrpc/app.bsky.feed.getFeedSkeleton'
      const params = new URLSearchParams()
      params.append('feed', SWARM_FEED_URI)
      params.append('limit', '25')
      
      // Log auth state
      testData.authState = {
        hasSession: !!agent.session,
        sessionType: agent.session ? typeof agent.session : 'none',
        accessJwtExists: !!agent.session?.accessJwt,
        accessJwtLength: agent.session?.accessJwt?.length ?? 0,
      }

      // Test 1: No auth header
      try {
        const noAuthResponse = await fetch(`${feedGeneratorUrl}${endpoint}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        })
        
        testData.noAuthTest = {
          status: noAuthResponse.status,
          statusText: noAuthResponse.statusText,
          ok: noAuthResponse.ok,
          headers: Object.fromEntries(noAuthResponse.headers.entries()),
        }
        
        if (noAuthResponse.ok) {
          const noAuthData = await noAuthResponse.json()
          testData.noAuthTest.dataSize = noAuthData.feed?.length ?? 0
        }
      } catch (e: any) {
        testData.noAuthTest = {
          error: e.message || String(e),
          stack: e.stack,
        }
      }

      // Test 2: With auth header
      try {
        const authResponse = await fetch(`${feedGeneratorUrl}${endpoint}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${agent.session?.accessJwt || ''}`,
          }
        })
        
        testData.authTest = {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok,
          headers: Object.fromEntries(authResponse.headers.entries()),
        }
        
        if (authResponse.ok) {
          const authData = await authResponse.json()
          testData.authTest.dataSize = authData.feed?.length ?? 0
          
          // If we got data, try to display some posts
          if (authData.feed && authData.feed.length > 0) {
            // Try to get full post data
            try {
              const postUris = authData.feed.map((item: any) => item.uri)
              const postsResponse = await agent.getPosts({
                uris: postUris,
              })
              
              testData.postsResponse = {
                success: true,
                count: postsResponse.data.posts.length,
              }
              
              setPosts(postsResponse.data.posts.map((post: any) => ({
                post,
              })))
            } catch (postsError: any) {
              testData.postsResponse = {
                error: postsError.message || String(postsError),
              }
            }
          }
        }
      } catch (e: any) {
        testData.authTest = {
          error: e.message || String(e),
          stack: e.stack,
        }
      }
      
      // Test 3: Use proxy
      try {
        const proxyUrl = SWARM_API_PROXY
        const proxyResponse = await fetch(`${proxyUrl}${endpoint}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${agent.session?.accessJwt || ''}`,
          }
        })
        
        testData.proxyTest = {
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          ok: proxyResponse.ok,
          headers: Object.fromEntries(proxyResponse.headers.entries()),
        }
        
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json()
          testData.proxyTest.dataSize = proxyData.feed?.length ?? 0
        }
      } catch (e: any) {
        testData.proxyTest = {
          error: e.message || String(e),
          stack: e.stack,
        }
      }

      // Record timing
      testData.responseTime = Date.now() - startTime
      
      setDiagnostics(testData)
    } catch (e: any) {
      console.error('SwarmFeedDebug network test error:', e)
      setError(e.message || String(e))
      setDiagnostics({
        error: e.message || String(e),
        stack: e.stack,
        endTime: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Swarm Feed Debug</Text>
        <Text style={styles.subtitle}>
          DEBUG.SWARM_BYPASS_HYDRATION: {DEBUG.SWARM_BYPASS_HYDRATION ? 'ON' : 'OFF'}
        </Text>
      </View>

      <View style={styles.buttonsSection}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => runTest('standard')}
            disabled={loading}>
            <Text style={styles.buttonText}>Test Standard API</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => runTest('direct')}
            disabled={loading}>
            <Text style={styles.buttonText}>Test Direct API</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => runTest('agent')}
            disabled={loading}>
            <Text style={styles.buttonText}>Test Agent API</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.networkButton, loading && styles.buttonDisabled]}
          onPress={testDirectNetworkRequest}
          disabled={loading}>
          <Text style={styles.buttonText}>Test Network Requests</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue3} />
          <Text style={styles.loadingText}>Loading feed data...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && Object.keys(diagnostics).length > 0 && (
        <View style={styles.diagnosticsContainer}>
          <Text style={styles.sectionTitle}>Diagnostics</Text>
          {Object.entries(diagnostics).map(([key, value]) => (
            <Text key={key} style={styles.diagnosticItem}>
              <Text style={styles.diagnosticKey}>{key}: </Text>
              <Text>
                {typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value)}
              </Text>
            </Text>
          ))}
        </View>
      )}

      {!loading && posts.length > 0 && (
        <View style={styles.postsContainer}>
          <Text style={styles.sectionTitle}>
            Posts ({posts.length} items)
          </Text>
          {posts.map((item, index) => (
            <View key={item.post.uri} style={styles.postItem}>
              <Text style={styles.postHeader}>
                Post #{index + 1}: {item.post.author?.handle || 'Unknown'}
              </Text>
              <Text style={styles.postUri}>{item.post.uri}</Text>
              <Text style={styles.postText}>
                {typeof item.post.record === 'object' &&
                item.post.record !== null &&
                'text' in item.post.record
                  ? String(item.post.record.text)
                  : '[No text content]'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!loading && posts.length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts found</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.black,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray5,
    marginBottom: 4,
  },
  buttonsSection: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.blue3,
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.gray4,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.gray5,
  },
  errorContainer: {
    backgroundColor: colors.red1,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorTitle: {
    fontWeight: 'bold',
    color: colors.red3,
    marginBottom: 8,
  },
  errorText: {
    color: colors.red3,
  },
  diagnosticsContainer: {
    backgroundColor: colors.gray1,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  postsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.black,
  },
  diagnosticItem: {
    marginBottom: 4,
    fontSize: 12,
  },
  diagnosticKey: {
    fontWeight: 'bold',
  },
  postItem: {
    backgroundColor: colors.gray1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  postHeader: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.black,
  },
  postUri: {
    fontSize: 10,
    color: colors.gray4,
    marginBottom: 8,
  },
  postText: {
    color: colors.black,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.gray5,
    fontStyle: 'italic',
  },
  networkButton: {
    backgroundColor: colors.purple3,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
}) 