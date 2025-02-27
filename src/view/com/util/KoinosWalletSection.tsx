import React from 'react'
import {Text} from 'react-native'
import {
  hasWallet,
  linkBlueskyToKoinos,
  LinkedWalletInfo,
  loadWalletAddress,
  saveWalletInfo,
} from '#/lib/koinos'
import {useCallback, useState, useEffect, useMemo} from 'react'
import {useSession} from '#/state/session'
import {KoinosWalletDisplay} from './KoinosWalletDisplay'
import {KoinosWalletImport} from './KoinosWalletImport'

export function KoinosWalletSection() {
  const {currentAccount} = useSession()
  
  // Add wallet state
  const [walletInfo, setWalletInfo] = useState<LinkedWalletInfo | null>(null)
  const [_isCheckingWallet, setIsCheckingWallet] = useState(true)
  const [showImportUI, setShowImportUI] = useState(false)

  // Get user info
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

  return (
    <div
      style={{
        marginTop: '20px',
        marginBottom: '20px',
        backgroundColor: '#1e2732',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
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
  )
} 