import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, SqliteDialect } from 'kysely'

import { logger } from '../util/logger'
import { migrationProvider } from './migrations'
import {
  createPostgresDb,
  isPostgresConnectionString,
} from './postgres-adapter'
import { DatabaseSchema } from './schema'

/**
 * Creates a database connection based on the provided location or connection string.
 * Automatically detects if the connection string is for PostgreSQL or SQLite.
 *
 * @param locationOrConnectionString SQLite file path or PostgreSQL connection string
 * @returns A Kysely database instance
 */
export const createDb = (locationOrConnectionString: string): Database => {
  // Check if the connection string is for PostgreSQL
  if (isPostgresConnectionString(locationOrConnectionString)) {
    // Mask sensitive connection details for logging
    const connectionInfo = locationOrConnectionString.split('@')[1] || 'unknown'
    logger.info('Creating PostgreSQL database connection', {
      connection: connectionInfo,
    })
    return createPostgresDb(locationOrConnectionString)
  }

  // Default to SQLite
  logger.info('Creating SQLite database connection', {
    location: locationOrConnectionString,
  })
  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: new SqliteDb(locationOrConnectionString),
    }),
  })
}

/**
 * Migrates the database to the latest schema version.
 *
 * @param db The database instance to migrate
 */
export const migrateToLatest = async (db: Database) => {
  try {
    logger.info('Starting database migration to latest schema')
    const migrator = new Migrator({ db, provider: migrationProvider })
    const { error, results } = await migrator.migrateToLatest()

    if (error) {
      logger.error('Database migration failed', { error: error instanceof Error ? error.message : String(error) })
      throw error
    }

    logger.info('Database migration completed successfully', {
      appliedMigrations: results?.length || 0,
      migrations: results?.map((r) => r.migrationName) || [],
    })
  } catch (err) {
    logger.error('Unexpected error during database migration', { error: err instanceof Error ? err.message : String(err) })
    throw err
  }
}

export type Database = Kysely<DatabaseSchema>
