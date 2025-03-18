require('dotenv').config();
const { BskyAgent } = require('@atproto/api');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Utility logging functions
const log = {
  info: (message) => console.log(`ℹ️ ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warning: (message) => console.log(`⚠️ ${message}`),
  error: (message) => console.log(`❌ ${message}`),
  section: (title) => {
    console.log(`\n🔍 ${title}`);
    console.log('='.repeat(title.length + 2));
  }
};

// Configuration
const config = {
  dbPaths: [
    './swarm-feed.db',
    '../swarm-feed.db', 
    '../../swarm-feed.db',
    './feed-generator/swarm-feed.db',
    '../feed-generator/swarm-feed.db'
  ],
  feedUri: process.env.FEED_URI || 'at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community',
  testPostUri: process.env.TEST_POST_URI,
  authorDid: process.env.AUTHOR_DID
};

async function checkTestPost() {
  log.section('Check Test Post in Feed Database');
  log.info('This script verifies if a specific post exists in the swarm-community feed database');

  if (!config.testPostUri) {
    log.warning('No test post URI provided. Set TEST_POST_URI in your environment variables.');
    log.info('Example usage:');
    log.info('TEST_POST_URI=at://did:plc:xyz/app.bsky.feed.post/123 node check-test-post.js');
    return;
  }

  log.info(`Will check for test post: ${config.testPostUri}`);

  // First, connect to the database
  log.section('Checking Database Connection');

  let db = null;
  let dbPath = null;

  for (const path of config.dbPaths) {
    if (fs.existsSync(path)) {
      log.info(`Found database at: ${path}`);
      dbPath = path;
      break;
    }
  }

  if (!dbPath) {
    log.error('Could not find the database file in any of the expected locations.');
    log.info('Available files in current directory:');
    const files = fs.readdirSync('.');
    files.forEach(file => log.info(`- ${file}`));
    return;
  }

  try {
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    log.success('Successfully connected to database');
  } catch (error) {
    log.error(`Failed to connect to database: ${error.message}`);
    return;
  }

  // Check database schema
  log.section('Checking Database Schema');
  
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      log.error(`Error querying tables: ${err.message}`);
      db.close();
      return;
    }
    
    log.info(`Found ${tables.length} tables in the database:`);
    tables.forEach(table => log.info(`- ${table.name}`));
    
    // Now check the post table schema
    const postTable = tables.find(t => t.name === 'post');
    if (postTable) {
      db.all(`PRAGMA table_info(post)`, [], (err, columns) => {
        if (err) {
          log.error(`Error querying post table schema: ${err.message}`);
          db.close();
          return;
        }
        
        log.info(`Post table has ${columns.length} columns:`);
        columns.forEach(col => log.info(`- ${col.name} (${col.type})`));
        
        // Check if our test post is in the database
        checkForTestPost(db);
      });
    } else {
      log.error('No "post" table found. This is a critical issue with the database schema.');
      log.info('Available tables:');
      tables.forEach(t => log.info(`- ${t.name}`));
      db.close();
    }
  });
}

function checkForTestPost(db) {
  log.section('Checking for Test Post in Database');

  db.get(`SELECT * FROM post WHERE uri = ?`, [config.testPostUri], (err, row) => {
    if (err) {
      log.error(`Error querying post: ${err.message}`);
      db.close();
      return;
    }
    
    if (row) {
      log.success('Found test post in database!');
      log.info(`Post details:`);
      log.info(`- URI: ${row.uri}`);
      log.info(`- CID: ${row.cid}`);
      log.info(`- Creator: ${row.creator}`);
      log.info(`- Indexed at: ${row.indexedAt}`);
      
      log.section('Next Steps');
      log.info('1. The post exists in the database.');
      log.info('2. Try testing the feed API to see if it shows up in the feed.');
      log.info('3. You can do this with: curl https://swarm-feed-generator.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:swarm-feed-generator.onrender.com/app.bsky.feed.generator/swarm-community');
    } else {
      log.warning(`Test post not found in database: ${config.testPostUri}`);
      
      // If author DID is provided, check if any posts from this author are in the db
      if (config.authorDid) {
        log.info(`Checking for any posts from author: ${config.authorDid}`);
        
        db.all(`SELECT * FROM post WHERE creator = ? LIMIT 5`, [config.authorDid], (err, rows) => {
          if (err) {
            log.error(`Error querying author posts: ${err.message}`);
            db.close();
            return;
          }
          
          if (rows && rows.length > 0) {
            log.success(`Found ${rows.length} posts from the author`);
            rows.forEach((post, i) => {
              log.info(`${i+1}. ${post.uri} (indexed at: ${post.indexedAt})`);
            });
            
            log.section('Next Steps');
            log.info('1. While your test post is not in the database, other posts by you are.');
            log.info('2. Try creating a new post with the #swarmtest hashtag and check again.');
            log.info('3. If new posts also don\'t appear, there might be an issue with the firehose subscription.');
          } else {
            log.warning(`No posts from author ${config.authorDid} found in database`);
            
            // Check overall database stats
            db.get(`SELECT COUNT(*) as count FROM post`, [], (err, row) => {
              if (err) {
                log.error(`Error counting posts: ${err.message}`);
                db.close();
                return;
              }
              
              log.info(`Database contains ${row.count} posts total`);
              
              if (row.count === 0) {
                log.error('Database contains zero posts! This indicates a serious issue with feed indexing.');
                log.section('Next Steps');
                log.info('1. Run the add-test-post.js script to manually add a post to the database.');
                log.info('2. Check the logs for firehose subscription issues.');
                log.info('3. Verify that SWARM_COMMUNITY_MEMBERS includes your DID.');
              } else {
                log.warning('Database contains posts, but none from you or your test post.');
                log.section('Next Steps');
                log.info('1. Verify that your DID is in the SWARM_COMMUNITY_MEMBERS list in src/swarm-community-members.ts');
                log.info('2. Run the add-test-post.js script to manually add your post to the database.');
              }
              
              db.close();
            });
          }
        });
      } else {
        log.warning('No author DID provided, can\'t check for author-specific posts.');
        log.info('Set AUTHOR_DID environment variable to check for all posts by a specific author.');
        
        db.get(`SELECT COUNT(*) as count FROM post`, [], (err, row) => {
          if (err) {
            log.error(`Error counting posts: ${err.message}`);
            db.close();
            return;
          }
          
          log.info(`Database contains ${row.count} posts total`);
          db.close();
          
          log.section('Next Steps');
          log.info('1. Run the add-test-post.js script to manually add your post to the database.');
        });
      }
    }
  });
}

// Run the script
checkTestPost().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 