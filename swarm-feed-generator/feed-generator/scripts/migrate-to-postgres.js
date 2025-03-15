/**
 * SQLite to PostgreSQL Migration Script
 *
 * This script migrates data from SQLite to PostgreSQL.
 * It creates the necessary tables in PostgreSQL and transfers all data.
 *
 * Prerequisites:
 * - PostgreSQL database already created
 * - Connection details set in environment variables or .env file
 */

require('dotenv').config()
const sqlite3 = require('sqlite3').verbose()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Configuration
const SQLITE_DB_PATH =
  process.env.SQLITE_DB_PATH || path.join(__dirname, '../sqlite:swarm-feed.db')
const PG_CONNECTION_STRING =
  process.env.DATABASE_URL ||
  'postgres://user:password@localhost:5432/swarm_feed'
const BATCH_SIZE = 1000 // Number of records to migrate in each batch

// Connect to SQLite database
console.log(`Connecting to SQLite database at ${SQLITE_DB_PATH}`)
const sqliteDb = new sqlite3.Database(
  SQLITE_DB_PATH,
  sqlite3.OPEN_READONLY,
  (err) => {
    if (err) {
      console.error(`Error connecting to SQLite database: ${err.message}`)
      process.exit(1)
    }
    console.log('Connected to SQLite database.')
  },
)

// Connect to PostgreSQL
console.log(
  `Connecting to PostgreSQL database at ${PG_CONNECTION_STRING.split('@')[1]}`,
)
const pgPool = new Pool({
  connectionString: PG_CONNECTION_STRING,
})

// Helper function to run SQLite queries
function runSqliteQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, params, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

// Main migration function
async function migrateToPostgres() {
  console.log('Starting migration from SQLite to PostgreSQL...')

  try {
    // Create PostgreSQL tables
    console.log('Creating tables in PostgreSQL...')
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS post (
        uri VARCHAR PRIMARY KEY,
        cid VARCHAR NOT NULL,
        "indexedAt" VARCHAR NOT NULL,
        creator VARCHAR NOT NULL
      );
    `)

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS sub_state (
        service VARCHAR PRIMARY KEY,
        cursor INTEGER NOT NULL
      );
    `)

    // Create indexes
    console.log('Creating indexes in PostgreSQL...')
    await pgPool.query(
      'CREATE INDEX IF NOT EXISTS idx_creator ON post(creator);',
    )
    await pgPool.query(
      'CREATE INDEX IF NOT EXISTS idx_indexedAt ON post("indexedAt");',
    )
    await pgPool.query(
      'CREATE INDEX IF NOT EXISTS idx_creator_indexedAt ON post(creator, "indexedAt");',
    )

    // Count records in SQLite
    const postCount = await runSqliteQuery('SELECT COUNT(*) as count FROM post')
    const subStateCount = await runSqliteQuery(
      'SELECT COUNT(*) as count FROM sub_state',
    )

    console.log(
      `Found ${postCount[0].count} posts and ${subStateCount[0].count} subscription states to migrate.`,
    )

    // Migrate posts in batches
    const totalPosts = postCount[0].count
    const batches = Math.ceil(totalPosts / BATCH_SIZE)

    console.log(`Migrating posts in ${batches} batches of ${BATCH_SIZE}...`)

    for (let i = 0; i < batches; i++) {
      const offset = i * BATCH_SIZE
      console.log(`Migrating batch ${i + 1}/${batches} (offset: ${offset})...`)

      const posts = await runSqliteQuery(
        `SELECT * FROM post LIMIT ${BATCH_SIZE} OFFSET ${offset}`,
      )

      if (posts.length === 0) {
        console.log('No more posts to migrate.')
        break
      }

      // Use a transaction for each batch
      const pgClient = await pgPool.connect()
      try {
        await pgClient.query('BEGIN')

        for (const post of posts) {
          await pgClient.query(
            'INSERT INTO post(uri, cid, "indexedAt", creator) VALUES($1, $2, $3, $4) ON CONFLICT (uri) DO NOTHING',
            [post.uri, post.cid, post.indexedAt, post.creator],
          )
        }

        await pgClient.query('COMMIT')
        console.log(`Successfully migrated ${posts.length} posts.`)
      } catch (error) {
        await pgClient.query('ROLLBACK')
        console.error(`Error migrating batch ${i + 1}:`, error)
        throw error
      } finally {
        pgClient.release()
      }
    }

    // Migrate subscription states
    console.log('Migrating subscription states...')
    const subStates = await runSqliteQuery('SELECT * FROM sub_state')

    if (subStates.length > 0) {
      for (const state of subStates) {
        await pgPool.query(
          'INSERT INTO sub_state(service, cursor) VALUES($1, $2) ON CONFLICT (service) DO UPDATE SET cursor = $2',
          [state.service, state.cursor],
        )
      }
      console.log(
        `Successfully migrated ${subStates.length} subscription states.`,
      )
    } else {
      console.log('No subscription states to migrate.')
    }

    // Verify migration
    console.log('Verifying migration...')

    const pgPostCount = await pgPool.query('SELECT COUNT(*) as count FROM post')
    const pgSubStateCount = await pgPool.query(
      'SELECT COUNT(*) as count FROM sub_state',
    )

    console.log('Migration summary:')
    console.log(
      `- Posts: ${postCount[0].count} in SQLite, ${pgPostCount.rows[0].count} in PostgreSQL`,
    )
    console.log(
      `- Subscription states: ${subStateCount[0].count} in SQLite, ${pgSubStateCount.rows[0].count} in PostgreSQL`,
    )

    if (
      parseInt(pgPostCount.rows[0].count) === postCount[0].count &&
      parseInt(pgSubStateCount.rows[0].count) === subStateCount[0].count
    ) {
      console.log(
        '✅ Migration completed successfully! All records were transferred.',
      )
    } else {
      console.log(
        '⚠️ Migration completed with discrepancies. Some records may not have been transferred.',
      )
    }

    // Generate configuration update instructions
    console.log('\nTo use PostgreSQL in your application:')
    console.log('1. Update your .env file with:')
    console.log(`   DATABASE_URL=${PG_CONNECTION_STRING}`)
    console.log(
      '2. Update your config.ts file to use PostgreSQL instead of SQLite',
    )
    console.log('3. Restart your application')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    // Close connections
    sqliteDb.close((err) => {
      if (err) {
        console.error(`Error closing SQLite database: ${err.message}`)
      } else {
        console.log('SQLite database connection closed.')
      }
    })

    await pgPool.end()
    console.log('PostgreSQL connection closed.')
  }
}

// Run the migration
migrateToPostgres()
