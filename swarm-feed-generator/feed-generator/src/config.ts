import { DidResolver } from '@atproto/identity'

import { Database } from './db'

export type AppContext = {
  db: Database
  didResolver: DidResolver
  cfg: Config
}

export type Config = {
  port: number
  listenhost: string
  hostname: string
  sqliteLocation: string
  databaseUrl?: string // PostgreSQL connection string (optional)
  subscriptionEndpoint: string
  serviceDid: string
  publisherDid: string
  subscriptionReconnectDelay: number
}

/**
 * Gets the database connection string or location based on configuration.
 * Prioritizes PostgreSQL connection string if available, falls back to SQLite.
 *
 * @param cfg The application configuration
 * @returns The database connection string or SQLite file path
 */
export const getDatabaseLocation = (cfg: Config): string => {
  // Use PostgreSQL if a connection string is provided
  if (cfg.databaseUrl) {
    return cfg.databaseUrl
  }

  // Fall back to SQLite
  return cfg.sqliteLocation
}
