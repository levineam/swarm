#!/usr/bin/env node

/**
 * Database Initialization Script for Swarm Feed Generator
 *
 * This script initializes the SQLite database with the required tables
 * and indexes for the Swarm Feed Generator to function properly.
 */

const sqlite3 = require('sqlite3').verbose()
const path = require('path')

// Set up the database path
const dbPath =
  process.env.DATABASE_URL || path.join(process.cwd(), 'swarm-feed.db')
const sqlitePath = dbPath.replace('sqlite:', '')

console.log(`Initializing database at: ${sqlitePath}`)

// Open the database
const db = new sqlite3.Database(sqlitePath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message)
    process.exit(1)
  }
  console.log('Database opened successfully')
})

// Create the necessary tables
db.serialize(() => {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON')

  // Create the post table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS post (
      uri TEXT PRIMARY KEY,
      cid TEXT NOT NULL,
      indexedAt TEXT NOT NULL,
      creator TEXT NOT NULL
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating post table:', err.message)
      } else {
        console.log('Post table created or already exists')
      }
    },
  )

  // Create the sub_state table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS sub_state (
      service TEXT PRIMARY KEY,
      cursor INTEGER NOT NULL
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating sub_state table:', err.message)
      } else {
        console.log('Sub state table created or already exists')
      }
    },
  )

  // Create necessary indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_creator ON post(creator)`, (err) => {
    if (err) {
      console.error('Error creating creator index:', err.message)
    } else {
      console.log('Creator index created or already exists')
    }
  })

  db.run(
    `CREATE INDEX IF NOT EXISTS idx_indexedAt ON post(indexedAt)`,
    (err) => {
      if (err) {
        console.error('Error creating indexedAt index:', err.message)
      } else {
        console.log('IndexedAt index created or already exists')
      }
    },
  )

  db.run(
    `CREATE INDEX IF NOT EXISTS idx_creator_indexedAt ON post(creator, indexedAt)`,
    (err) => {
      if (err) {
        console.error('Error creating combined index:', err.message)
      } else {
        console.log('Combined index created or already exists')
      }
    },
  )

  console.log('Database initialization completed successfully')
})

// Close the database when done
db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message)
    process.exit(1)
  }
  console.log('Database closed')
})
