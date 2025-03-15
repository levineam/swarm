import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, SqliteDialect } from 'kysely'

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
    console.log(
      `Creating PostgreSQL database connection to ${
        locationOrConnectionString.split('@')[1]
      }`,
    )
    return createPostgresDb(locationOrConnectionString)
  }

  // Default to SQLite
  console.log(
    `Creating SQLite database connection to ${locationOrConnectionString}`,
  )
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
  const migrator = new Migrator({ db, provider: migrationProvider })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

export type Database = Kysely<DatabaseSchema>
