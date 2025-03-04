export const LOG_DEBUG = process.env.EXPO_PUBLIC_LOG_DEBUG || ''
export const LOG_LEVEL = (process.env.EXPO_PUBLIC_LOG_LEVEL || 'info') as
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'

// AT Protocol configuration
export const PDS_URL = process.env.EXPO_PUBLIC_PDS_URL || 'https://bsky.social'
export const ATP_HOST = process.env.EXPO_PUBLIC_ATP_HOST || 'https://api.bsky.app'
export const ATP_IDENTIFIER = process.env.EXPO_PUBLIC_ATP_IDENTIFIER || ''
export const ATP_PASSWORD = process.env.EXPO_PUBLIC_ATP_PASSWORD || ''
