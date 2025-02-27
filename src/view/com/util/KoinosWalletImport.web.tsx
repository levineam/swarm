import {useState} from 'react'
import {Signer} from 'koilib'
import {saveWalletInfo} from '#/lib/koinos'
import {Text} from 'react-native'

interface Props {
  blueskyUsername: string
  onImportSuccess: (address: string) => void
  onCancel: () => void
}

export function KoinosWalletImport({blueskyUsername, onImportSuccess, onCancel}: Props) {
  const [privateKey, setPrivateKey] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  
  const handleImport = async () => {
    if (!privateKey.trim()) {
      alert('Please enter a private key') // TODO: Replace with proper UI feedback
      return
    }
    
    setIsImporting(true)
    try {
      // Validate and import the private key with compressed option
      const signer = new Signer({
        privateKey,
        compressed: true
      })
      const address = signer.getAddress()
      
      // Save wallet info (only address, not private key)
      await saveWalletInfo({
        blueskyUsername,
        koinosAddress: address,
        privateKeyWif: privateKey // This won't actually be saved
      })
      
      // Notify parent component
      onImportSuccess(address)
    } catch (error) {
      console.error('Error importing wallet:', error)
      alert('Invalid private key. Please check and try again.') // TODO: Replace with proper UI feedback
    } finally {
      setIsImporting(false)
    }
  }
  
  return (
    <div className="wallet-import-container">
      <h2 className="wallet-header"><Text>Import Existing Wallet</Text></h2>
      
      <p className="wallet-description">
        <Text>Enter your Koinos private key to import an existing wallet.</Text>
      </p>
      
      <input
        className="wallet-input"
        type="password"
        placeholder="Enter private key"
        value={privateKey}
        onChange={(e) => setPrivateKey(e.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
      />
      
      <div className="wallet-button-container">
        <button 
          className="wallet-button cancel-button"
          onClick={onCancel}
        >
          <Text>Cancel</Text>
        </button>
        
        <button 
          className="wallet-button import-button"
          onClick={handleImport}
          disabled={isImporting}
        >
          <Text>{isImporting ? 'Importing...' : 'Import Wallet'}</Text>
        </button>
      </div>
    </div>
  )
} 