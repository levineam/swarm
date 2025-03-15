import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

import { createChildLogger, logError } from '../util/logger'
import { DatabaseSchema } from './schema'

// Create a child logger for PostgreSQL operations
const pgLogger = createChildLogger('postgres')

/**
 * Creates a PostgreSQL database connection using Kysely.
 * This adapter can be used as an alternative to SQLite for better scalability.
 *
 * @param connectionString The PostgreSQL connection string
 * @returns A Kysely database instance connected to PostgreSQL
 */
export const createPostgresDb = (connectionString: string) => {
  // Create a connection pool
  const pool = new Pool({
    connectionString,
    // Optional: Configure pool settings
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  })

  // Log connection events for debugging
  pool.on('connect', () => {
    pgLogger.debug('New client connected to the pool')
  })

  pool.on('error', (err) => {
    logError('Unexpected error on idle client', err)
  })

  // Create and return the Kysely instance with PostgreSQL dialect
  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool,
    }),
  })
}

/**
 * Helper function to determine if a connection string is for PostgreSQL
 *
 * @param connectionString The database connection string
 * @returns True if the connection string is for PostgreSQL
 */
export const isPostgresConnectionString = (
  connectionString: string,
): boolean => {
  return (
    connectionString.startsWith('postgres://') ||
    connectionString.startsWith('postgresql://')
  )
}
