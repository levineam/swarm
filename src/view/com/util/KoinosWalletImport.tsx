import React, {useState} from 'react'
import {View, Text, TextInput, Pressable, StyleSheet, Alert} from 'react-native'
import {Signer} from 'koilib'
import {saveWalletInfo} from '../../lib/koinos/wallet'

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
      Alert.alert('Error', 'Please enter a private key')
      return
    }
    
    setIsImporting(true)
    try {
      // Validate and import the private key
      const signer = new Signer({privateKey})
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
      Alert.alert('Error', 'Invalid private key. Please check and try again.')
    } finally {
      setIsImporting(false)
    }
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Import Existing Wallet</Text>
      
      <Text style={styles.description}>
        Enter your Koinos private key to import an existing wallet.
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter private key"
        value={privateKey}
        onChangeText={setPrivateKey}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.importButton, isImporting && styles.disabledButton]}
          onPress={handleImport}
          disabled={isImporting}
        >
          <Text style={styles.importButtonText}>
            {isImporting ? 'Importing...' : 'Import Wallet'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 12,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  importButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  importButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
  },
}) 