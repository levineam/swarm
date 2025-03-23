import React, { useState } from 'react'
import {StyleSheet, View, Text, Pressable} from 'react-native'
import {AppBskyActorDefs, RichText} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {NativeStackScreenProps} from '@react-navigation/native-stack'
import {useQueryClient} from '@tanstack/react-query'

import {CommonNavigatorParams} from '#/lib/routes/types'
import {PLATFORM_DID} from '#/config/did'
import {FEED_URI} from '#/server/feed_generator'
import {DEBUG} from '#/lib/constants'
import {isWeb} from '#/platform/detection'
import {SwarmFeedTest} from '../debug/SwarmFeedTest'
import {FeedPage} from '#/view/com/feeds/FeedPage'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SwarmFeed'>

export function SwarmFeedScreen({
  navigation,
  route,
}: Props) {
  const {_} = useLingui()
  const [showTest, setShowTest] = React.useState(false)
  const queryClient = useQueryClient()
  const [showDebug, setShowDebug] = useState(false)
  const [useDirect, setUseDirect] = useState(true)

  // Reset minimal shell mode when screen is focused
  React.useEffect(() => {
    const resetMinimal = () => {
      navigation.setOptions({presentation: 'card'})
    }
    const unsubscribe = navigation.addListener('focus', resetMinimal)
    return unsubscribe
  }, [navigation])

  React.useEffect(() => {
    // Set debug option based on the toggle
    DEBUG.SWARM_BYPASS_HYDRATION = useDirect
    if (DEBUG.SWARM_LOG_RESPONSES) {
      console.log('SwarmFeed: Setting bypass hydration to', useDirect)
    }
  }, [useDirect])

  const toggleDebug = () => {
    setShowDebug(!showDebug)
  }

  const toggleDirect = () => {
    setUseDirect(!useDirect)
  }

  // Rendering utilities for feed states
  const feedDescriptor = React.useMemo(
    () => ({
      isEmptyList: msg`No posts found. Check back soon!`,
      endOfList: msg`You've reached the end of the Swarm Feed`,
    }),
    [feedDescriptor],
  )

  const renderEmptyState = React.useCallback(() => {
    return (
      <View>
        <Text style={{textAlign: 'center', margin: 10, fontStyle: 'italic'}}>
          {_(msg`No posts found. Check back soon!`)}
        </Text>
      </View>
    )
  }, [_])

  const renderEndOfFeed = React.useCallback(() => {
    return (
      <View style={styles.endOfFeed}>
        <Text style={styles.endOfFeedText}>
          {_(msg`You've reached the end of the Swarm Feed`)}
        </Text>
      </View>
    )
  }, [_])

  // Show debug button for web environment
  const renderFeedHeader = React.useCallback(() => {
    return isWeb ? (
      <View style={styles.debugRow}>
        <Pressable 
          onPress={toggleDebug} 
          style={styles.debugButton} 
          testID="swarmFeedDebugButton"
        >
          <Text style={styles.debugButtonText}>
            {showDebug ? 'Hide Debug' : 'Debug Feed'}
          </Text>
        </Pressable>
        
        {showDebug && (
          <View style={styles.debugControls}>
            <Text style={styles.debugInfo}>
              Mode: {useDirect ? 'Direct' : 'Standard'}
            </Text>
            <Pressable 
              onPress={toggleDirect} 
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>
                Switch
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    ) : null
  }, [showDebug, useDirect, toggleDebug, toggleDirect])

  return (
    <View style={styles.container}>
      {showTest ? (
        <SwarmFeedTest onClose={() => setShowTest(false)} />
      ) : (
        <>
          {renderFeedHeader()}
          <FeedPage
            testID="swarmFeedPage"
            isPageFocused={true}
            isPageAdjacent={false}
            feed="swarm"
            feedInfo={{
              isDEV: true,
              PINNED: true,
              value: 'swarm',
            }}
            renderEmptyState={renderEmptyState}
            renderEndOfFeed={renderEndOfFeed}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  endOfFeed: {
    marginTop: 30,
    marginBottom: 40,
    alignItems: 'center',
  },
  endOfFeedText: {
    fontWeight: 'bold',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  debugRow: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#333',
  },
  debugButton: {
    backgroundColor: '#3a3a3a',
    padding: 6,
    borderRadius: 4,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
  },
  debugControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  debugInfo: {
    color: '#ccc',
    fontSize: 12,
    marginRight: 10,
  },
  actionButton: {
    backgroundColor: '#444',
    padding: 6,
    borderRadius: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
  },
})
