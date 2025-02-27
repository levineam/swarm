import {useCallback,useEffect, useState} from 'react'
import {StyleSheet, Text, TouchableOpacity,View} from 'react-native'
import * as Clipboard from 'expo-clipboard'

import {getKoinosBalance,LinkedWalletInfo} from '#/lib/koinos'

// Copy icon component using SVG
const CopyIcon = ({color = 'white', size = 16}) => (
  <View style={{width: size, height: size}}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 6.9V11.1C22 14.6 20.6 16 17.1 16H16V12.9C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2H17.1C20.6 2 22 3.4 22 6.9Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </View>
)

interface Props {
  walletInfo: LinkedWalletInfo
}

export function KoinosWalletDisplayNew({walletInfo}: Props) {
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [balance, setBalance] = useState<string>('0')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copyIconColor, setCopyIconColor] = useState('white')
  const [copyAddressButtonText, setCopyAddressButtonText] =
    useState('Copy Address')
  const [copyPrivateKeyText, setCopyPrivateKeyText] =
    useState('Copy Private Key')

  // Wrap fetchBalance in useCallback to prevent it from changing on every render
  const fetchBalance = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const bal = await getKoinosBalance(walletInfo.koinosAddress)
      setBalance(bal)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [walletInfo.koinosAddress]) // Add dependencies

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const copyToClipboard = async (
    text: string,
    type: 'icon' | 'button',
    setter: any,
    originalValue: any,
  ) => {
    await Clipboard.setStringAsync(text)

    if (type === 'icon') {
      // Flash the icon green to indicate success
      setter('#4ade80')
      setTimeout(() => setter('white'), 2000)
    } else {
      // Update button text
      setter('Copied!')
      setTimeout(() => setter(originalValue), 2000)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Koinos Wallet</Text>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Bluesky:</Text>
        <Text style={styles.value}>{walletInfo.blueskyUsername}</Text>
      </View>

      <View>
        <Text style={styles.label}>Koinos Address:</Text>
        <View style={styles.addressRow}>
          <Text style={styles.addressValue}>{walletInfo.koinosAddress}</Text>
          <TouchableOpacity accessibilityRole="button"
            style={styles.iconButton}
            onPress={() =>
              copyToClipboard(
                walletInfo.koinosAddress,
                'icon',
                setCopyIconColor,
                'white',
              )
            }>
            <CopyIcon color={copyIconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.infoRow, {marginTop: 15}]}>
        <Text style={styles.label}>Balance:</Text>
        <Text style={styles.value}>{balance} KOIN</Text>
        <TouchableOpacity accessibilityRole="button" onPress={fetchBalance} disabled={isRefreshing}>
          <Text style={styles.refreshButton}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠️ IMPORTANT: Save your private key securely. Anyone with access to
          this key will have full control of your wallet. It cannot be recovered
          if lost.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity accessibilityRole="button"
          style={styles.button}
          onPress={() => setShowPrivateKey(!showPrivateKey)}>
          <Text style={styles.buttonText}>
            {showPrivateKey ? 'Hide Private Key' : 'Show Private Key'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button"
          style={styles.button}
          onPress={() =>
            copyToClipboard(
              walletInfo.koinosAddress,
              'button',
              setCopyAddressButtonText,
              'Copy Address',
            )
          }>
          <Text style={styles.buttonText}>{copyAddressButtonText}</Text>
        </TouchableOpacity>
      </View>

      {showPrivateKey && (
        <>
          <View style={styles.privateKeyBox}>
            <Text style={styles.privateKeyText}>
              {walletInfo.privateKeyWif}
            </Text>
          </View>

          <TouchableOpacity accessibilityRole="button"
            style={styles.button}
            onPress={() =>
              copyToClipboard(
                walletInfo.privateKeyWif,
                'button',
                setCopyPrivateKeyText,
                'Copy Private Key',
              )
            }>
            <Text style={styles.buttonText}>{copyPrivateKeyText}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e2732',
    padding: 20,
    borderRadius: 10,
    width: 350,
    margin: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  header: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    width: 150,
    color: '#8899a6',
    marginBottom: 5,
  },
  value: {
    color: 'white',
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressValue: {
    color: 'white',
    fontFamily: 'monospace',
    backgroundColor: '#2d3741',
    padding: 5,
    borderRadius: 4,
    flex: 1,
    fontSize: 13,
  },
  iconButton: {
    backgroundColor: '#1d9bf0',
    padding: 8,
    borderRadius: 4,
    marginLeft: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    color: '#1d9bf0',
    fontSize: 16,
    marginLeft: 5,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 204, 0, 0.2)',
    padding: 10,
    borderRadius: 5,
    marginVertical: 15,
  },
  warningText: {
    color: '#ffcc00',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  button: {
    backgroundColor: '#1d9bf0',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  privateKeyBox: {
    backgroundColor: '#2d3741',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  privateKeyText: {
    color: '#dcdcdc',
    fontFamily: 'monospace',
  },
})
