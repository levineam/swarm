#!/usr/bin/env node

/**
 * Manual Post Addition Script
 * 
 * This script manually adds a post to the database directly,
 * bypassing the firehose for testing purposes.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../swarm-feed.db');
const YOUR_DID = 'did:plc:ouadmsyvsfcpkxg3yyz4trqi';

// Your post data
const POST_DATA = {
  uri: `at://${YOUR_DID}/app.bsky.feed.post/test-post-${Date.now()}`,
  cid: `bafyrei${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
  creator: YOUR_DID,
  indexedAt: new Date().toISOString(),
};

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found at ${DB_PATH}`);
  process.exit(1);
}

// Connect to database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(`Error connecting to database: ${err.message}`);
    process.exit(1);
  }
  console.log(`Connected to database at ${DB_PATH}`);
});

// Insert the post
db.run(
  'INSERT INTO post (uri, cid, creator, indexedAt) VALUES (?, ?, ?, ?)',
  [POST_DATA.uri, POST_DATA.cid, POST_DATA.creator, POST_DATA.indexedAt],
  function (err) {
    if (err) {
      console.error(`Error inserting post: ${err.message}`);
      db.close();
      process.exit(1);
    }

    console.log(`✅ Successfully added post with ID: ${this.lastID}`);
    console.log(`Post URI: ${POST_DATA.uri}`);
    console.log(`CID: ${POST_DATA.cid}`);
    console.log(`Creator: ${POST_DATA.creator}`);
    console.log(`Indexed At: ${POST_DATA.indexedAt}`);

    // Check if community members table exists and add if needed
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='swarm_community_member'", (err, row) => {
      if (err) {
        console.error(`Error checking for community members table: ${err.message}`);
        db.close();
        return;
      }

      if (row) {
        console.log('Adding to community members table...');
        db.run(
          'INSERT OR IGNORE INTO swarm_community_member (did) VALUES (?)',
          [YOUR_DID],
          function (err) {
            if (err) {
              console.error(`Error adding to community members: ${err.message}`);
            } else {
              console.log('✅ Added to community members table');
            }
            db.close();
          }
        );
      } else {
        console.log('Community members table does not exist, skipping...');
        db.close();
      }
    });
  }
);

console.log('Post has been added to the database.');
console.log('Next steps:');
console.log('1. Verify the post appears in the feed:');
console.log('   curl -s "https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community&limit=10" | jq');
console.log('2. If the post does not appear, check server logs on Render.com'); 