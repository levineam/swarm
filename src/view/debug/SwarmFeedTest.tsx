import React from 'react'
import {Button, ScrollView, StyleSheet,Text, View} from 'react-native'

import {
  describeFeedGenerator,
  getFeedSkeleton,
} from '../../lib/api/feed-generator'
import {usePalette} from '../../lib/hooks/usePalette'

// The Swarm Feed URI
const SWARM_FEED_URI =
  'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community'

export function SwarmFeedTest() {
  const pal = usePalette('default')
  const [feedData, setFeedData] = React.useState(null)
  const [describeData, setDescribeData] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  const testDescribe = async () => {
    setLoading(true)
    setError(null)
    try {
      // Test describe generator
      const describe = await describeFeedGenerator()
      console.log('Describe result:', describe)
      setDescribeData(describe)
    } catch (err: any) {
      console.error('Describe test failed:', err)
      setError(`Describe failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testFeed = async () => {
    setLoading(true)
    setError(null)
    try {
      // Test get feed skeleton
      const feed = await getFeedSkeleton(SWARM_FEED_URI)
      console.log('Feed result:', feed)
      setFeedData(feed)
    } catch (err: any) {
      console.error('Feed test failed:', err)
      setError(`Feed failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.container, pal.view]}>
      <Text style={[styles.title, pal.text]}>Swarm Feed Proxy Test</Text>

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? 'Testing...' : 'Test Describe Generator'}
          onPress={testDescribe}
          disabled={loading}
          color="#0070ff"
        />

        <Button
          title={loading ? 'Testing...' : 'Test Feed Skeleton'}
          onPress={testFeed}
          disabled={loading}
          color="#0070ff"
        />
      </View>

      {error && (
        <View
          style={[styles.errorContainer, {backgroundColor: pal.colors.error}]}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {describeData && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultTitle, pal.text]}>
            Feed Generator Description:
          </Text>
          <ScrollView
            style={[
              styles.scrollView,
              {backgroundColor: pal.colors.backgroundLight},
            ]}>
            <Text style={pal.text}>
              {JSON.stringify(describeData, null, 2)}
            </Text>
          </ScrollView>
        </View>
      )}

      {feedData && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultTitle, pal.text]}>
            Feed Data Retrieved:
          </Text>
          <Text style={[pal.text]}>
            Found {feedData.feed?.length || 0} posts
          </Text>
          <ScrollView
            style={[
              styles.scrollView,
              {backgroundColor: pal.colors.backgroundLight},
            ]}>
            <Text style={pal.text}>{JSON.stringify(feedData, null, 2)}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: {
    color: 'white',
  },
  resultContainer: {
    marginTop: 16,
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scrollView: {
    padding: 8,
    borderRadius: 8,
    flex: 1,
  },
})
