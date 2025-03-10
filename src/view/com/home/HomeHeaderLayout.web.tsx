import React from 'react'
import {useEffect} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useKawaiiMode} from '#/state/preferences/kawaii'
import {useSession} from '#/state/session'
import {useShellLayout} from '#/state/shell/shell-layout'
import {HomeHeaderLayoutMobile} from '#/view/com/home/HomeHeaderLayoutMobile'
import {Logo} from '#/view/icons/Logo'
import {atoms as a, useBreakpoints, useGutters, useTheme} from '#/alf'
import {ButtonIcon} from '#/components/Button'
import {Hashtag_Stroke2_Corner0_Rounded as FeedsIcon} from '#/components/icons/Hashtag'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'

export function HomeHeaderLayout(props: {
  children: React.ReactNode
  tabBarAnchor: JSX.Element | null | undefined
}) {
  const {gtMobile} = useBreakpoints()
  if (!gtMobile) {
    return <HomeHeaderLayoutMobile {...props} />
  } else {
    return <HomeHeaderLayoutDesktopAndTablet {...props} />
  }
}

function HomeHeaderLayoutDesktopAndTablet({
  children,
  tabBarAnchor,
}: {
  children: React.ReactNode
  tabBarAnchor: JSX.Element | null | undefined
}) {
  const t = useTheme()
  const {headerHeight} = useShellLayout()
  const {hasSession} = useSession()
  const {_} = useLingui()
  const kawaii = useKawaiiMode()
  const gutters = useGutters([0, 'base'])

  // Add this style block to the head of the document
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      .koinos-wallet-container {
        scrollbar-width: thin;
        scrollbar-color: #4a5568 #2d3748;
        overflow-y: scroll !important; /* Force scrolling */
      }
      .koinos-wallet-container::-webkit-scrollbar {
        width: 8px;
      }
      .koinos-wallet-container::-webkit-scrollbar-track {
        background: #2d3748;
        border-radius: 4px;
      }
      .koinos-wallet-container::-webkit-scrollbar-thumb {
        background-color: #4a5568;
        border-radius: 4px;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <>
      {hasSession && (
        <Layout.Center>
          <View
            style={[a.flex_row, a.align_center, gutters, a.pt_md, t.atoms.bg]}>
            <View style={{width: 34}} />
            <View style={[a.flex_1, a.align_center, a.justify_center]}>
              <Logo width={kawaii ? 60 : 28} />
            </View>
            <Link
              to="/feeds"
              hitSlop={10}
              label={_(msg`View your feeds and explore more`)}
              size="small"
              variant="ghost"
              color="secondary"
              shape="square"
              style={[a.justify_center]}>
              <ButtonIcon icon={FeedsIcon} size="lg" />
            </Link>
          </View>
        </Layout.Center>
      )}
      {tabBarAnchor}
      <Layout.Center
        style={[a.sticky, a.z_10, a.align_center, t.atoms.bg, {top: 0}]}
        onLayout={e => {
          headerHeight.set(e.nativeEvent.layout.height)
        }}>
        {children}
      </Layout.Center>
    </>
  )
}
