import React from 'react'
import {View, Text} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {KoinosWalletDisplay} from '../util/KoinosWalletDisplay'
import {KoinosWalletImport} from '../util/KoinosWalletImport'
import {
  linkBlueskyToKoinos,
  saveWalletInfo,
  hasWallet,
  loadWalletAddress,
  LinkedWalletInfo
} from '#/lib/koinos'
import {useCallback, useState, useEffect, useMemo} from 'react'

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
  const {hasSession, currentAccount} = useSession()
  const {_} = useLingui()
  const kawaii = useKawaiiMode()
  const gutters = useGutters([0, 'base'])

  // Add wallet state
  const [walletInfo, setWalletInfo] = useState<LinkedWalletInfo | null>(null)
  const [_isCheckingWallet, setIsCheckingWallet] = useState(true)
  const [showImportUI, setShowImportUI] = useState(false)
  
  // Get user info - adapt this to how user data is accessed in the web version
  const currentUser = useMemo(() => 
    currentAccount ? {handle: currentAccount.handle} : null
  , [currentAccount])
  
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
              privateKeyWif: '(Private key not stored for security)'
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
  const handleImportSuccess = useCallback((address: string) => {
    if (!currentUser?.handle) return
    
    setWalletInfo({
      blueskyUsername: currentUser.handle,
      koinosAddress: address,
      privateKeyWif: '(Private key not stored for security)'
    })
    setShowImportUI(false)
  }, [currentUser])

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
      
      {/* Wallet UI */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '300px',
        padding: '15px',
        backgroundColor: '#1e2732',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
      }}>
        {walletInfo && <KoinosWalletDisplay walletInfo={walletInfo} />}
        
        {showImportUI && currentUser?.handle && (
          <KoinosWalletImport
            blueskyUsername={currentUser.handle}
            onImportSuccess={handleImportSuccess}
            onCancel={() => setShowImportUI(false)}
          />
        )}
        
        {!walletInfo && !showImportUI && currentUser?.handle && (
          <div className="walletActions" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              color: 'white',
              fontSize: '16px'
            }}>
              <Text>Koinos Wallet</Text>
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
                fontWeight: 'bold'
              }}
            >
              <Text>Create New Wallet</Text>
            </button>
            
            <button 
              className="importButton"
              onClick={() => setShowImportUI(true)}
              style={{
                padding: '10px 15px',
                backgroundColor: 'transparent',
                color: '#0070ff',
                border: '1px solid #0070ff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              <Text>Import Existing Wallet</Text>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
