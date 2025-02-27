import React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {Text, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {
  hasWallet,
  linkBlueskyToKoinos,
  LinkedWalletInfo,
  loadWalletAddress,
  saveWalletInfo,
} from '#/lib/koinos'
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
import {KoinosWalletDisplayNew} from '../util/KoinosWalletDisplayNew'
import {KoinosWalletImport} from '../util/KoinosWalletImport'
// import {KoinosWalletSection} from '../util/KoinosWalletSection'

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
  const {hasSession, currentAccount} = useSession()
  const {_} = useLingui()
  const kawaii = useKawaiiMode()
  const gutters = useGutters([0, 'base'])

  // Add wallet state
  const [walletInfo, setWalletInfo] = useState<LinkedWalletInfo | null>(null)
  const [_isCheckingWallet, setIsCheckingWallet] = useState(true)
  const [showImportUI, setShowImportUI] = useState(false)

  // Get user info - adapt this to how user data is accessed in the web version
  const currentUser = useMemo(
    () => (currentAccount ? {handle: currentAccount.handle} : null),
    [currentAccount],
  )

  // Check for existing wallet
  useEffect(() => {
    const checkWallet = async () => {
      if (!currentUser?.handle) {
        setIsCheckingWallet(false)
        return
      }

      setIsCheckingWallet(true)
      try {
        const hasExistingWallet = await hasWallet(currentUser.handle)

        if (hasExistingWallet) {
          const address = await loadWalletAddress(currentUser.handle)
          if (address) {
            setWalletInfo({
              blueskyUsername: currentUser.handle,
              koinosAddress: address,
              privateKeyWif: '(Private key not stored for security)',
            })
          }
        }
      } catch (error) {
        console.error('Error checking wallet:', error)
      } finally {
        setIsCheckingWallet(false)
      }
    }

    checkWallet()
  }, [currentUser])

  // Initialize wallet function
  const initializeKoinosWallet = useCallback(async (username: string) => {
    if (!username) return

    const info = linkBlueskyToKoinos(username)
    setWalletInfo(info)

    await saveWalletInfo(info)
  }, [])

  // Handle import success
  const handleImportSuccess = useCallback(
    (address: string) => {
      if (!currentUser?.handle) return

      setWalletInfo({
        blueskyUsername: currentUser.handle,
        koinosAddress: address,
        privateKeyWif: '(Private key not stored for security)',
      })
      setShowImportUI(false)
    },
    [currentUser],
  )

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

      <div style={{position: 'relative'}}>
        <div
          className="koinos-wallet-container"
          style={{
            position: 'fixed',
            top: '380px',
            right: '70px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '350px',
            height: 'calc(100vh - 450px)',
            overflowY: 'auto',
            padding: '0',
            paddingBottom: '20px',
            backgroundColor: 'transparent',
            borderRadius: '8px',
            boxShadow: 'none',
          }}>
          {walletInfo && <KoinosWalletDisplayNew walletInfo={walletInfo} />}

          {showImportUI && currentUser?.handle && (
            <KoinosWalletImport
              blueskyUsername={currentUser.handle}
              onImportSuccess={handleImportSuccess}
              onCancel={() => setShowImportUI(false)}
            />
          )}

          {!walletInfo && !showImportUI && currentUser?.handle && (
            <div
              className="walletActions"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
              <h3
                style={{
                  margin: '0 0 10px 0',
                  color: 'white',
                  fontSize: '16px',
                }}>
                <Text style={{color: 'white'}}>Koinos Wallet</Text>
              </h3>

              <button
                className="initWalletButton"
                onClick={() => initializeKoinosWallet(currentUser.handle)}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#0070ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}>
                <Text style={{color: 'white'}}>Create New Wallet</Text>
              </button>

              <button
                className="importButton"
                onClick={() => setShowImportUI(true)}
                style={{
                  padding: '10px 15px',
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '1px solid white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}>
                <Text style={{color: 'white'}}>Import Existing Wallet</Text>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
