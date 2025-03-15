/**
 * Database Analysis Script
 *
 * This script analyzes the current SQLite database usage and creates indexes
 * to optimize query performance. It also provides recommendations for
 * potential migration to PostgreSQL if needed.
 */

const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const path = require('path')

// Configuration
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, '../sqlite:swarm-feed.db')
const REPORT_PATH = path.join(__dirname, '../database-analysis-report.md')

// Connect to the database
console.log(`Connecting to database at ${DB_PATH}`)
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(`Error connecting to database: ${err.message}`)
    process.exit(1)
  }
  console.log('Connected to the database.')
})

// Helper function to run queries and return promises
function runQuery(query) {
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

// Helper function to run exec statements
function execSQL(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

// Main analysis function
async function analyzeDatabase() {
  const report = []
  report.push('# Database Analysis Report')
  report.push(`\nGenerated on: ${new Date().toISOString()}\n`)

  try {
    // Get database size
    const stats = fs.statSync(DB_PATH)
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
    report.push(`## Database Size`)
    report.push(`Current size: ${sizeInMB} MB\n`)

    // Get table counts
    report.push(`## Table Counts`)

    const postCount = await runQuery('SELECT COUNT(*) as count FROM post')
    report.push(`- Posts: ${postCount[0].count}`)

    const subStateCount = await runQuery(
      'SELECT COUNT(*) as count FROM sub_state',
    )
    report.push(`- Subscription States: ${subStateCount[0].count}\n`)

    // Get post distribution by creator
    report.push(`## Post Distribution by Creator`)
    const creatorDistribution = await runQuery(
      'SELECT creator, COUNT(*) as count FROM post GROUP BY creator ORDER BY count DESC LIMIT 10',
    )

    report.push('Top 10 creators by post count:')
    creatorDistribution.forEach((row, index) => {
      report.push(`${index + 1}. ${row.creator}: ${row.count} posts`)
    })
    report.push('')

    // Get post growth over time
    report.push(`## Post Growth Over Time`)
    const postGrowth = await runQuery(
      'SELECT substr(indexedAt, 1, 10) as date, COUNT(*) as count FROM post GROUP BY date ORDER BY date',
    )

    report.push('Posts indexed by date:')
    postGrowth.forEach((row) => {
      report.push(`- ${row.date}: ${row.count} posts`)
    })
    report.push('')

    // Check existing indexes
    report.push(`## Existing Indexes`)
    const indexes = await runQuery(
      "SELECT name FROM sqlite_master WHERE type='index'",
    )

    if (indexes.length === 0) {
      report.push('No custom indexes found.')
    } else {
      report.push('Current indexes:')
      indexes.forEach((idx) => {
        report.push(`- ${idx.name}`)
      })
    }
    report.push('')

    // Create recommended indexes if they don't exist
    report.push(`## Index Optimization`)

    // Check if creator index exists
    const creatorIndexExists = indexes.some((idx) => idx.name === 'idx_creator')
    if (!creatorIndexExists) {
      report.push('Creating index on creator column...')
      await execSQL('CREATE INDEX idx_creator ON post(creator)')
      report.push('✅ Created index on creator column.')
    } else {
      report.push('✅ Index on creator column already exists.')
    }

    // Check if indexedAt index exists
    const indexedAtIndexExists = indexes.some(
      (idx) => idx.name === 'idx_indexedAt',
    )
    if (!indexedAtIndexExists) {
      report.push('Creating index on indexedAt column...')
      await execSQL('CREATE INDEX idx_indexedAt ON post(indexedAt)')
      report.push('✅ Created index on indexedAt column.')
    } else {
      report.push('✅ Index on indexedAt column already exists.')
    }

    // Check if combined index exists
    const combinedIndexExists = indexes.some(
      (idx) => idx.name === 'idx_creator_indexedAt',
    )
    if (!combinedIndexExists) {
      report.push('Creating combined index on creator and indexedAt columns...')
      await execSQL(
        'CREATE INDEX idx_creator_indexedAt ON post(creator, indexedAt)',
      )
      report.push('✅ Created combined index on creator and indexedAt columns.')
    } else {
      report.push(
        '✅ Combined index on creator and indexedAt columns already exists.',
      )
    }
    report.push('')

    // Analyze query performance
    report.push(`## Query Performance`)

    console.log('Testing query performance...')
    const startTime = Date.now()
    await runQuery(
      'SELECT * FROM post WHERE creator = ? ORDER BY indexedAt DESC LIMIT 10',
      [creatorDistribution[0]?.creator || 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'],
    )
    const endTime = Date.now()
    const queryTime = endTime - startTime

    report.push(
      `Query execution time: ${queryTime}ms for fetching 10 most recent posts from a single creator.\n`,
    )

    // Provide recommendations
    report.push(`## Recommendations`)

    if (sizeInMB > 100) {
      report.push(
        '⚠️ **Database size exceeds 100MB.** Consider migrating to PostgreSQL for better performance and scalability.',
      )
    } else if (postCount[0].count > 10000) {
      report.push(
        '⚠️ **Post count exceeds 10,000.** Consider planning for a PostgreSQL migration as the database continues to grow.',
      )
    } else {
      report.push(
        '✅ **Current SQLite database is sufficient** for the current workload. The database size and post count are within reasonable limits for SQLite.',
      )
    }

    if (queryTime > 100) {
      report.push(
        '⚠️ **Query performance is slow.** Consider additional optimizations or migration to PostgreSQL.',
      )
    } else {
      report.push(
        '✅ **Query performance is acceptable** with the current indexes.',
      )
    }

    // Growth projection
    const avgPostsPerDay =
      postGrowth.length > 0 ? postCount[0].count / postGrowth.length : 0

    report.push(
      `\nBased on current data, the estimated growth is approximately ${Math.round(
        avgPostsPerDay,
      )} posts per day.`,
    )

    if (avgPostsPerDay > 100) {
      report.push(
        '⚠️ **High growth rate detected.** Recommend planning for PostgreSQL migration within 3 months.',
      )
    } else if (avgPostsPerDay > 50) {
      report.push(
        '⚠️ **Moderate growth rate detected.** Recommend planning for PostgreSQL migration within 6 months.',
      )
    } else {
      report.push(
        '✅ **Low growth rate detected.** SQLite should be sufficient for the near future, but monitor growth regularly.',
      )
    }

    // Write report to file
    fs.writeFileSync(REPORT_PATH, report.join('\n'))
    console.log(`Analysis complete. Report saved to ${REPORT_PATH}`)
  } catch (error) {
    console.error('Error during database analysis:', error)
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error(`Error closing database: ${err.message}`)
      } else {
        console.log('Database connection closed.')
      }
    })
  }
}

// Run the analysis
analyzeDatabase()
