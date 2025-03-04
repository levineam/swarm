import React, {useState, useEffect} from 'react'
import {View, Text, Pressable, StyleSheet, ActivityIndicator} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {LinkedWalletInfo, getKoinosBalance} from '../../lib/koinos/wallet'

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
    await Clipboard.setStringAsync(text)
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

  // Button style for reuse
  const buttonStyle = {
    backgroundColor: '#1d9bf0',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
    marginBottom: '10px'
  };

  return (
    <div style={{
      backgroundColor: '#1e2732',
      color: 'white',
      padding: '20px',
      borderRadius: '10px',
      width: '450px',
      margin: '0 0 0 100px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      position: 'relative',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 1
    }}>
      <h2 style={{color: 'white', marginBottom: '20px', textAlign: 'center'}}>Your Koinos Wallet</h2>
      
      <div style={{marginBottom: '20px'}}>
        <div style={{display: 'flex', marginBottom: '10px', alignItems: 'center'}}>
          <span style={{fontWeight: 'bold', width: '150px', color: '#8899a6'}}>Bluesky:</span>
          <span style={{wordBreak: 'break-all', color: 'white'}}>{walletInfo.blueskyUsername}</span>
        </div>
        
        <div style={{display: 'flex', marginBottom: '10px', alignItems: 'center'}}>
          <span style={{fontWeight: 'bold', width: '150px', color: '#8899a6'}}>Koinos Address:</span>
          <span style={{
            wordBreak: 'break-all', 
            color: 'white', 
            fontFamily: 'monospace',
            background: '#2d3741',
            padding: '5px',
            borderRadius: '4px'
          }}>{walletInfo.koinosAddress}</span>
        </div>
        
        <div style={{display: 'flex', marginBottom: '10px', alignItems: 'center'}}>
          <span style={{fontWeight: 'bold', width: '150px', color: '#8899a6'}}>Balance:</span>
          <span style={{wordBreak: 'break-all', color: 'white'}}>{balance || '0'} KOIN</span>
          <button 
            style={{
              background: 'none',
              border: 'none',
              color: '#1d9bf0',
              cursor: 'pointer',
              fontSize: '16px',
              marginLeft: '5px'
            }} 
            onClick={refreshBalance}
          >⟳</button>
        </div>
      </div>
      
      <div style={{
        backgroundColor: 'rgba(255, 204, 0, 0.2)',
        color: '#ffcc00',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        ⚠️ IMPORTANT: Save your private key securely. Anyone with access to this key will have full control of your wallet. It cannot be recovered if lost.
      </div>
      
      <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
        <button 
          style={buttonStyle}
          onClick={() => setShowPrivateKey(!showPrivateKey)}
        >
          {showPrivateKey ? 'Hide Private Key' : 'Show Private Key'}
        </button>
        
        <button 
          style={buttonStyle}
          onClick={() => copyToClipboard(walletInfo.koinosAddress, setCopyAddressText)}
        >
          {copyAddressText}
        </button>
      </div>
      
      {showPrivateKey && (
        <div style={{
          marginTop: '20px',
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#2d3741',
          borderRadius: '5px',
          color: '#dcdcdc',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          {walletInfo.privateKeyWif}
        </div>
      )}
      
      {showPrivateKey && (
        <button 
          style={buttonStyle}
          onClick={() => copyToClipboard(walletInfo.privateKeyWif, setCopyPrivateKeyText)}
        >
          {copyPrivateKeyText}
        </button>
      )}
      
      <div style={{
        backgroundColor: '#2d3741',
        padding: '10px',
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h3 style={{color: 'white', marginTop: '0'}}>Security Tips:</h3>
        <ul style={{margin: '0', paddingLeft: '20px', color: '#dcdcdc'}}>
          <li style={{marginBottom: '8px', color: '#dcdcdc'}}>Never share your private key with anyone</li>
          <li style={{marginBottom: '8px', color: '#dcdcdc'}}>Store your private key in a secure password manager</li>
          <li style={{marginBottom: '8px', color: '#dcdcdc'}}>Consider using a hardware wallet for large amounts</li>
        </ul>
      </div>
    </div>
  )
} 