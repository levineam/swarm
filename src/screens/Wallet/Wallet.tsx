import {useCallback, useEffect, useMemo, useState} from 'react'
import {StyleSheet, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  hasWallet,
  linkBlueskyToKoinos,
  LinkedWalletInfo,
  loadWalletAddress,
  saveWalletInfo,
} from '#/lib/koinos'
import {CommonNavigatorParams} from '#/lib/routes/types'
import {useSession} from '#/state/session'
import {KoinosWalletDisplayNew} from '#/view/com/util/KoinosWalletDisplayNew'
import {KoinosWalletImport} from '#/view/com/util/KoinosWalletImport'
import {atoms as a} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Wallet'>

export function WalletScreen({}: Props) {
  const {_} = useLingui()
  const {currentAccount} = useSession()

  // Add wallet state
  const [walletInfo, setWalletInfo] = useState<LinkedWalletInfo | null>(null)
  const [isCheckingWallet, setIsCheckingWallet] = useState(true)
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
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Wallet</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={styles.container}>
          {isCheckingWallet ? (
            <View style={styles.loadingContainer}>
              <Text style={[a.text_lg, a.font_bold, a.mb_md]}>
                <Trans>Loading wallet...</Trans>
              </Text>
            </View>
          ) : (
            <>
              {walletInfo && (
                <View style={styles.walletContainer}>
                  <KoinosWalletDisplayNew walletInfo={walletInfo} />
                </View>
              )}

              {showImportUI && currentUser?.handle && (
                <View style={styles.importContainer}>
                  <KoinosWalletImport
                    blueskyUsername={currentUser.handle}
                    onImportSuccess={handleImportSuccess}
                    onCancel={() => setShowImportUI(false)}
                  />
                </View>
              )}

              {!walletInfo && !showImportUI && currentUser?.handle && (
                <View style={styles.actionsContainer}>
                  <Text style={[a.text_xl, a.font_bold, a.mb_lg]}>
                    <Trans>Koinos Wallet</Trans>
                  </Text>
                  <Text style={[a.text_md, a.mb_xl]}>
                    <Trans>
                      Connect your Bluesky account to a Koinos blockchain wallet
                      to participate in the Swarm ecosystem.
                    </Trans>
                  </Text>

                  <Button
                    variant="solid"
                    color="primary"
                    size="large"
                    label={_(msg`Create New Wallet`)}
                    onPress={() => initializeKoinosWallet(currentUser.handle)}
                    style={[a.mb_md]}>
                    <ButtonText>
                      <Trans>Create New Wallet</Trans>
                    </ButtonText>
                  </Button>

                  <Button
                    variant="outline"
                    color="primary"
                    size="large"
                    label={_(msg`Import Existing Wallet`)}
                    onPress={() => setShowImportUI(true)}>
                    <ButtonText>
                      <Trans>Import Existing Wallet</Trans>
                    </ButtonText>
                  </Button>
                </View>
              )}
            </>
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  importContainer: {
    marginTop: 20,
  },
  actionsContainer: {
    padding: 16,
    marginTop: 20,
  },
})
