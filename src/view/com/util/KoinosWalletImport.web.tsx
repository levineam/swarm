import {useState} from 'react'
import {saveWalletInfo} from '#/lib/koinos'
import {Text} from 'react-native'
import { Signer } from 'koilib'

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
      console.log("Importing wallet with key");
      
      // Create a properly initialized Signer
      // If the key is in WIF format, use fromWif
      // Otherwise, treat it as a hex string
      let signer;
      try {
        // Try to use it as a WIF key
        signer = Signer.fromWif(privateKey.trim());
      } catch (e) {
        // If that fails, try as a hex string
        signer = new Signer({
          privateKey: privateKey.trim(),
          compressed: true // Explicitly set compressed
        });
      }
      
      const address = signer.getAddress();
      console.log("Address generated:", address);
      
      // Save wallet info
      await saveWalletInfo({
        blueskyUsername,
        koinosAddress: address,
        privateKeyWif: privateKey
      });
      
      onImportSuccess(address);
    } catch (error) {
      console.error('Error importing wallet:', error);
      alert('Invalid private key. Please check and try again.');
    } finally {
      setIsImporting(false);
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