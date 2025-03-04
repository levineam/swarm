import { Signer } from 'koilib'

export interface KoinosWallet {
  privateKeyWif: string
  address: string
}

export interface LinkedWalletInfo {
  blueskyUsername: string
  koinosAddress: string
  privateKeyWif: string
}

export function generateKoinosWallet(): KoinosWallet {
  // Generate a dummy private key for initialization
  const dummyPrivateKey = "0000000000000000000000000000000000000000000000000000000000000001";
  const signer = new Signer({
    privateKey: dummyPrivateKey,
    compressed: true
  });
  
  return {
    privateKeyWif: signer.getPrivateKey("wif"),
    address: signer.getAddress()
  }
}

export function linkBlueskyToKoinos(blueskyUsername: string): LinkedWalletInfo {
  // Remove the @[username].bsky.social part if needed
  const cleanUsername = blueskyUsername.replace(/^@/, '').split('.')[0]
  
  // Generate a wallet for this user
  const wallet = generateKoinosWallet()
  
  return {
    blueskyUsername: blueskyUsername,
    koinosAddress: wallet.address,
    privateKeyWif: wallet.privateKeyWif
  }
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

// Save wallet info to localStorage
export async function saveWalletInfo(walletInfo: LinkedWalletInfo): Promise<boolean> {
  try {
    const storageKey = `${WALLET_STORAGE_KEY}${walletInfo.blueskyUsername}`
    localStorage.setItem(storageKey, JSON.stringify({
      blueskyUsername: walletInfo.blueskyUsername,
      koinosAddress: walletInfo.koinosAddress,
      // Never store the private key in localStorage for security reasons
    }))
    return true
  } catch (error) {
    console.error('Failed to save wallet info:', error)
    return false
  }
}

// Load wallet address from localStorage
export async function loadWalletAddress(blueskyUsername: string): Promise<string | null> {
  try {
    const storageKey = `${WALLET_STORAGE_KEY}${blueskyUsername}`
    const walletData = localStorage.getItem(storageKey)
    
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