import React from 'react'
import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect} from '@react-navigation/native'
import {AppBskyActorDefs, RichText} from '@atproto/api'

import {usePalette} from '#/lib/hooks/usePalette'
import {CommonNavigatorParams, NativeStackScreenProps} from '#/lib/routes/types'
import {PLATFORM_DID} from '#/config/did'
import {FEED_URI} from '#/server/feed_generator'
import {useSession} from '#/state/session'
import {useSetMinimalShellMode} from '#/state/shell'
import {FeedPage} from '#/view/com/feeds/FeedPage'
import {SavedFeedSourceInfo} from '#/state/queries/feed'
import {FeedDescriptor} from '#/state/queries/post-feed'
import {Text} from '#/view/com/util/text/Text'
import {Header} from '#/components/Layout'
import {Swarm_Stroke2_Corner0_Rounded} from '#/components/icons/Swarm'
import { Link } from '#/view/com/util/Link'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SwarmFeed'>

export function SwarmFeedScreen({navigation}: Props) {
  const pal = usePalette('default')
  const {_} = useLingui()
  const {hasSession} = useSession()
  const setMinimalShellMode = useSetMinimalShellMode()

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
      description: new RichText({text: 'The main community feed of the Swarm platform'}),
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
        <Swarm_Stroke2_Corner0_Rounded size="xl" style={[pal.text, styles.emptyIcon]} />
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

  return (
    <View style={[styles.container, pal.view]}>
      <Header.Outer>
        <Header.BackButton onPress={() => navigation.goBack()} />
        <Header.Content>
          <Header.TitleText>{_(msg`Swarm Community`)}</Header.TitleText>
          <Link to="SwarmCommunitySettings" label="Settings">
            <Text style={{ color: pal.palette.primary }}>Settings</Text>
          </Link>
        </Header.Content>
      </Header.Outer>
      <FeedPage
        testID="swarmFeedPage"
        isPageFocused={true}
        isPageAdjacent={false}
        feed={feedDescriptor}
        feedInfo={feedInfo}
        renderEmptyState={renderEmptyState}
        renderEndOfFeed={renderEndOfFeed}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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