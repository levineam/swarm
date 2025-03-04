// Add necessary polyfills
if (typeof window !== 'undefined') {
  // Ensure Buffer is available in browser
  if (typeof window.Buffer === 'undefined') {
    window.Buffer = require('buffer/').Buffer;
  }
  
  // Ensure crypto is available
  if (!window.crypto) {
    console.warn('window.crypto not available, using polyfill');
    // @ts-ignore
    window.crypto = require('crypto').webcrypto;
  }
}

import { Signer, utils } from 'koilib'

// Determine if we're in a web environment
const isWeb = typeof window !== 'undefined' && typeof localStorage !== 'undefined'

// Import AsyncStorage only in React Native environment
let AsyncStorage: any = null
if (!isWeb) {
  // This import will only happen in React Native
  AsyncStorage = require('@react-native-async-storage/async-storage').default
}

export interface KoinosWallet {
  privateKeyWif: string
  address: string
}

export interface LinkedWalletInfo {
  blueskyUsername: string
  koinosAddress: string
  privateKeyWif: string
}

// Generate a random hex string
function generateRandomHex(length: number): string {
  const characters = '0123456789abcdef';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Mock wallet generation
export function generateKoinosWallet(): KoinosWallet {
  try {
    console.log("Starting wallet generation");
    
    // Generate a private key as a hex string
    const privateKeyBytes = new Uint8Array(32);
    window.crypto.getRandomValues(privateKeyBytes);
    const privateKeyHex = Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log("Generated private key");
    
    // Create a properly initialized Signer
    // This ensures the constructor receives the required parameters
    const signer = new Signer({
      privateKey: privateKeyHex,
      compressed: true // Explicitly set compressed
    });
    
    console.log("Signer created");
    
    // Get the address
    const address = signer.getAddress();
    console.log("Address generated:", address);
    
    // Convert to WIF format for storage
    const wif = signer.getPrivateKey("wif");
    console.log("WIF generated");
    
    return {
      privateKeyWif: wif,
      address: address
    };
  } catch (error) {
    console.error('Error in generateKoinosWallet:', error);
    throw new Error('Failed to generate Koinos wallet: ' + error.message);
  }
}

export function linkBlueskyToKoinos(blueskyUsername: string): LinkedWalletInfo {
  // Generate a wallet for this user
  const wallet = generateKoinosWallet();
  
  return {
    blueskyUsername: blueskyUsername,
    koinosAddress: wallet.address,
    privateKeyWif: wallet.privateKeyWif
  };
}

export async function getKoinosBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://api.koinos.io/accounts/${address}/balance`)
    const data = await response.json()
    return data.balance || '0'
  } catch (error) {
    console.error('Error fetching Koinos balance:', error)
    return '0'
  }
}

// Storage key prefix for wallet info
const WALLET_STORAGE_KEY = 'koinos_wallet_'

// Save wallet info to storage (localStorage in web, AsyncStorage in React Native)
export async function saveWalletInfo(walletInfo: LinkedWalletInfo): Promise<boolean> {
  try {
    const storageKey = `${WALLET_STORAGE_KEY}${walletInfo.blueskyUsername}`
    const dataToStore = JSON.stringify({
      blueskyUsername: walletInfo.blueskyUsername,
      koinosAddress: walletInfo.koinosAddress,
      // Never store the private key for security reasons
    })
    
    if (isWeb) {
      // Web environment - use localStorage
      localStorage.setItem(storageKey, dataToStore)
    } else {
      // React Native environment - use AsyncStorage
      await AsyncStorage.setItem(storageKey, dataToStore)
    }
    
    return true
  } catch (error) {
    console.error('Failed to save wallet info:', error)
    return false
  }
}

// Load wallet address from storage
export async function loadWalletAddress(blueskyUsername: string): Promise<string | null> {
  try {
    const storageKey = `${WALLET_STORAGE_KEY}${blueskyUsername}`
    let walletData: string | null = null
    
    if (isWeb) {
      // Web environment - use localStorage
      walletData = localStorage.getItem(storageKey)
    } else {
      // React Native environment - use AsyncStorage
      walletData = await AsyncStorage.getItem(storageKey)
    }
    
    if (walletData) {
      const parsedData = JSON.parse(walletData)
      return parsedData.koinosAddress
    }
    
    return null
  } catch (error) {
    console.error('Failed to load wallet address:', error)
    return null
  }
}

// Check if a wallet exists for a user
export async function hasWallet(blueskyUsername: string): Promise<boolean> {
  const address = await loadWalletAddress(blueskyUsername)
  return address !== null
} 