import {useState, useEffect} from 'react'
import {LinkedWalletInfo, getKoinosBalance} from '#/lib/koinos'
import {Text} from 'react-native'

interface Props {
  walletInfo: LinkedWalletInfo
}

export function KoinosWalletDisplay({walletInfo}: Props) {
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [copyAddressText, setCopyAddressText] = useState('Copy Address')
  const [copyPrivateKeyText, setCopyPrivateKeyText] = useState('Copy Private Key')
  const [balance, setBalance] = useState<string | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  // Fetch balance when component mounts
  useEffect(() => {
    const fetchBalance = async () => {
      setIsLoadingBalance(true)
      try {
        const balanceValue = await getKoinosBalance(walletInfo.koinosAddress)
        setBalance(balanceValue)
      } catch (error) {
        console.error('Failed to fetch balance:', error)
      } finally {
        setIsLoadingBalance(false)
      }
    }

    fetchBalance()
  }, [walletInfo.koinosAddress])

  const copyToClipboard = async (text: string, setCopyText: (text: string) => void) => {
    navigator.clipboard.writeText(text)
    setCopyText('Copied!')
    setTimeout(() => setCopyText(text === walletInfo.koinosAddress ? 'Copy Address' : 'Copy Private Key'), 2000)
  }

  const refreshBalance = async () => {
    setIsLoadingBalance(true)
    try {
      const balanceValue = await getKoinosBalance(walletInfo.koinosAddress)
      setBalance(balanceValue)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  return (
    <div className="wallet-container">
      <h2 className="wallet-header"><Text>Your Koinos Wallet</Text></h2>
      
      <p className="wallet-text">
        <strong><Text>Bluesky: </Text></strong>
        {walletInfo.blueskyUsername}
      </p>
      
      <p className="wallet-text">
        <strong><Text>Koinos Address: </Text></strong>
        {walletInfo.koinosAddress}
      </p>

      <div className="balance-container">
        <strong><Text>Balance: </Text></strong>
        {isLoadingBalance ? (
          <span className="loading-spinner"><Text>Loading...</Text></span>
        ) : (
          <>
            <span className="balance-text"><Text>{balance || '0'} KOIN</Text></span>
            <button 
              className="refresh-button"
              onClick={refreshBalance}
            >
              <Text>↻</Text>
            </button>
          </>
        )}
      </div>

      <div className="private-key-container">
        <p className="warning-text">
          <Text>⚠️ IMPORTANT: Save your private key securely. Anyone with access to this key will have full control of your wallet. It cannot be recovered if lost.</Text>
        </p>

        <button 
          className="button"
          onClick={() => setShowPrivateKey(!showPrivateKey)}
        >
          <Text>{showPrivateKey ? 'Hide Private Key' : 'Show Private Key'}</Text>
        </button>

        {showPrivateKey && (
          <code className="private-key">{walletInfo.privateKeyWif}</code>
        )}
      </div>

      <div className="button-container">
        <button 
          className="button"
          onClick={() => copyToClipboard(walletInfo.koinosAddress, setCopyAddressText)}
        >
          <Text>{copyAddressText}</Text>
        </button>

        <button 
          className="button"
          onClick={() => copyToClipboard(walletInfo.privateKeyWif, setCopyPrivateKeyText)}
        >
          <Text>{copyPrivateKeyText}</Text>
        </button>
      </div>

      <div className="security-info">
        <h3><Text>Security Tips:</Text></h3>
        <ul className="bullet-list">
          <li><Text>Never share your private key with anyone</Text></li>
          <li><Text>Store it securely in a password manager or write it down and keep it in a safe place</Text></li>
          <li><Text>Consider using a hardware wallet for significant amounts</Text></li>
          <li><Text>Back up your private key immediately</Text></li>
        </ul>
      </div>
    </div>
  )
} 