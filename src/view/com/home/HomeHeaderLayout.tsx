import {useCallback, useEffect,useState} from 'react'
import {Pressable, StyleSheet,Text, View} from 'react-native'

import {
  hasWallet,
  linkBlueskyToKoinos,
  loadWalletAddress,
  saveWalletInfo,
} from '../../lib/koinos/wallet'
import {useUserContext} from '../../lib/userContext'
import {KoinosWalletDisplayNew} from '../util/KoinosWalletDisplayNew'
import {KoinosWalletImport} from '../util/KoinosWalletImport'
import {HomeHeaderLayoutMobile} from './HomeHeaderLayoutMobile'

export function HomeHeaderLayout(props) {
  // Get the original component's implementation
  const OriginalHeaderLayout = HomeHeaderLayoutMobile

  // Get user from your context
  const {currentUser} = useUserContext()

  // Add state for wallet info
  const [walletInfo, setWalletInfo] = useState(null)
  const [isCheckingWallet, setIsCheckingWallet] = useState(true)

  // Add state for showing import UI
  const [showImportUI, setShowImportUI] = useState(false)

  // Check if user has a wallet when component mounts or user changes
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
            // We only have the address, not the private key
            // The user will need to re-enter their private key if they want to use it
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

  // Add function to initialize wallet
  const initializeKoinosWallet = useCallback(async username => {
    if (!username) return

    // Generate new wallet
    const info = linkBlueskyToKoinos(username)
    setWalletInfo(info)

    // Save wallet info (only address, not private key)
    await saveWalletInfo(info)
  }, [])

  // Handle successful wallet import
  const handleImportSuccess = useCallback(
    address => {
      setWalletInfo({
        blueskyUsername: currentUser.handle,
        koinosAddress: address,
        privateKeyWif: '(Private key not stored for security)',
      })
      setShowImportUI(false)
    },
    [currentUser],
  )

  if (isCheckingWallet) {
    return <OriginalHeaderLayout {...props} />
  }

  return (
    <View>
      {/* Render the original header layout */}
      <OriginalHeaderLayout {...props} />

      {/* Render wallet UI */}
      {walletInfo && <KoinosWalletDisplayNew walletInfo={walletInfo} />}

      {/* Render import UI */}
      {showImportUI && (
        <KoinosWalletImport
          blueskyUsername={currentUser.handle}
          onImportSuccess={handleImportSuccess}
          onCancel={() => setShowImportUI(false)}
        />
      )}

      {/* Render wallet actions */}
      {!walletInfo && !showImportUI && currentUser && (
        <View style={styles.walletActions}>
          <Pressable accessibilityRole="button"
            style={styles.initWalletButton}
            onPress={() => initializeKoinosWallet(currentUser.handle)}>
            <Text style={styles.initWalletButtonText}>Create New Wallet</Text>
          </Pressable>

          <Pressable accessibilityRole="button"
            style={[styles.initWalletButton, styles.importButton]}
            onPress={() => setShowImportUI(true)}>
            <Text style={styles.initWalletButtonText}>
              Import Existing Wallet
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

// Update styles
const styles = StyleSheet.create({
  walletActions: {
    margin: 16,
  },
  initWalletButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  importButton: {
    backgroundColor: '#4CAF50',
  },
  initWalletButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
})
