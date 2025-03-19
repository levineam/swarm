import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function initialize() {
  console.log('Initializing database...');
  
  try {
    // Remove the 'sqlite:' prefix for the SQLite package
    const dbPath = 'swarm-feed.db';
    
    // Open the database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('Database opened, creating tables...');
    
    // Create the post table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS post (
        uri TEXT PRIMARY KEY,
        cid TEXT NOT NULL,
        indexedAt TEXT NOT NULL,
        creator TEXT NOT NULL
      )
    `);
    
    // Create the sub_state table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sub_state (
        service TEXT PRIMARY KEY,
        cursor INTEGER NOT NULL
      )
    `);
    
    // Create indexes for better performance
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_creator ON post(creator)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_indexedAt ON post(indexedAt)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_creator_indexedAt ON post(creator, indexedAt)`);
    
    console.log('Tables created successfully!');
    
    // Close the database connection
    await db.close();
    
    console.log('Database initialization completed!');
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

initialize().then(() => process.exit(0));
