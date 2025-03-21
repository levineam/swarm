import React from 'react'
import {StyleSheet, View} from 'react-native'
import {AppBskyActorDefs, RichText} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect} from '@react-navigation/native'

import {usePalette} from '#/lib/hooks/usePalette'
import {CommonNavigatorParams, NativeStackScreenProps} from '#/lib/routes/types'
import {SavedFeedSourceInfo} from '#/state/queries/feed'
import {FeedDescriptor} from '#/state/queries/post-feed'
import {useSetMinimalShellMode} from '#/state/shell'
import {FeedPage} from '#/view/com/feeds/FeedPage'
import {Button} from '#/view/com/util/forms/Button'
import {Text} from '#/view/com/util/text/Text'
import {SwarmFeedTest} from '#/view/debug/SwarmFeedTest'
import {Swarm_Stroke2_Corner0_Rounded} from '#/components/icons/Swarm'
import {Header} from '#/components/Layout'
import {PLATFORM_DID} from '#/config/did'
import {FEED_URI} from '#/server/feed_generator'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SwarmFeed'>

export function SwarmFeedScreen({navigation}: Props) {
  const pal = usePalette('default')
  const {_} = useLingui()
  const setMinimalShellMode = useSetMinimalShellMode()
  const [showTest, setShowTest] = React.useState(false)

  // Reset minimal shell mode when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setMinimalShellMode(false)
      return () => {}
    }, [setMinimalShellMode]),
  )

  // The feed descriptor for the Swarm feed
  const feedDescriptor: FeedDescriptor = `feedgen|${FEED_URI}`

  // Feed info for the Swarm feed
  const feedInfo = React.useMemo<SavedFeedSourceInfo>(
    () => ({
      type: 'feed',
      uri: FEED_URI,
      feedDescriptor,
      route: {
        href: '/swarm',
        name: 'SwarmFeed',
        params: {},
      },
      cid: '',
      avatar: 'https://swarm.com/avatar.png',
      displayName: 'Swarm',
      description: new RichText({
        text: 'The main community feed of the Swarm platform',
      }),
      creatorDid: PLATFORM_DID,
      creatorHandle: 'swarm.bsky.social',
      likeCount: 0,
      likeUri: undefined,
      contentMode: 'posts',
      savedFeed: {
        id: 'swarm-feed',
        type: 'feed',
        value: FEED_URI,
        pinned: true,
      } as AppBskyActorDefs.SavedFeed,
    }),
    [feedDescriptor],
  )

  // Render empty state when there are no posts
  const renderEmptyState = React.useCallback(() => {
    return (
      <View style={[styles.emptyContainer, pal.view]}>
        <Swarm_Stroke2_Corner0_Rounded
          size="xl"
          style={[pal.text, styles.emptyIcon]}
        />
        <Text style={[pal.text, styles.emptyTitle]}>
          {_(msg`Welcome to the Swarm Community`)}
        </Text>
        <Text style={[pal.textLight, styles.emptyDesc]}>
          {_(
            msg`This is where you'll see posts from the Swarm community. Add the Swarm community label to your posts to have them appear here.`,
          )}
        </Text>
      </View>
    )
  }, [_, pal])

  // Render end of feed message
  const renderEndOfFeed = React.useCallback(() => {
    return (
      <View style={styles.endOfFeedContainer}>
        <Text style={[pal.textLight, styles.endOfFeedText]}>
          {_(msg`You've reached the end of the Swarm feed`)}
        </Text>
      </View>
    )
  }, [_, pal])

  const handleSettingsPress = () => {
    navigation.navigate('SwarmCommunitySettings')
  }

  return (
    <View style={[styles.container, pal.view]}>
      <Header.Outer>
        <Header.BackButton onPress={() => navigation.goBack()} />
        <Header.Content>
          <Header.TitleText>{_(msg`Swarm Community`)}</Header.TitleText>
          <Button
            type="default"
            label="Settings"
            onPress={handleSettingsPress}
            style={styles.settingsButton}
          />
        </Header.Content>
      </Header.Outer>

      <View style={styles.toggleContainer}>
        <Button
          type="default"
          label={showTest ? 'Show Regular Feed' : 'Test Feed API'}
          onPress={() => setShowTest(!showTest)}
        />
      </View>

      {showTest ? (
        <SwarmFeedTest />
      ) : (
        <FeedPage
          testID="swarmFeedPage"
          isPageFocused={true}
          isPageAdjacent={false}
          feed={feedDescriptor}
          feedInfo={feedInfo}
          renderEmptyState={renderEmptyState}
          renderEndOfFeed={renderEndOfFeed}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleContainer: {
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingsButton: {
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  endOfFeedContainer: {
    padding: 20,
    alignItems: 'center',
  },
  endOfFeedText: {
    fontSize: 16,
    textAlign: 'center',
  },
})
