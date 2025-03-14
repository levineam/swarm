#!/usr/bin/env node

/**
 * Implement Admin Endpoint Script
 * 
 * This script creates a file that implements an admin endpoint for manually updating the feed.
 * You can add this file to your feed generator to enable manual feed updates.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Utility functions
const log = {
  info: (message) => console.log(`ℹ️ ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warning: (message) => console.log(`⚠️ ${message}`),
  error: (message) => console.log(`❌ ${message}`),
  section: (title) => console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`)
};

async function implementAdminEndpoint() {
  log.section('Implement Admin Endpoint');
  
  try {
    // Create the admin endpoint file
    const adminEndpointCode = `
/**
 * Admin Endpoints
 * 
 * This file implements admin endpoints for manually managing the feed generator.
 */

import { Database } from './db';
import express from 'express';

export const createAdminRouter = (db: Database) => {
  const router = express.Router();

  /**
   * Manually update a feed with specific posts
   * POST /admin/update-feed
   * Body: { feedUri: string, postUris: string[] }
   */
  router.post('/update-feed', async (req, res) => {
    try {
      const { feedUri, postUris } = req.body;

      if (!feedUri || !postUris || !Array.isArray(postUris)) {
        return res.status(400).json({ error: 'Invalid request. Required: feedUri (string) and postUris (array)' });
      }

      // Get feed ID from URI
      const feedId = feedUri.split('/').pop();
      
      if (!feedId) {
        return res.status(400).json({ error: 'Invalid feed URI' });
      }

      // Check if posts exist in the database
      const existingPosts = await db.db.all(
        'SELECT uri FROM posts WHERE uri IN (' + postUris.map(() => '?').join(',') + ')',
        postUris
      );

      const existingUris = new Set(existingPosts.map(p => p.uri));
      const missingUris = postUris.filter(uri => !existingUris.has(uri));

      if (missingUris.length > 0) {
        return res.status(404).json({ 
          error: 'Some posts not found in database', 
          missingUris,
          message: 'Please add these posts to the database first using SQL INSERT statements'
        });
      }

      // For swarm-community feed, check if authors are in the SWARM_COMMUNITY_MEMBERS list
      if (feedId === 'swarm-community') {
        // This would normally check against the SWARM_COMMUNITY_MEMBERS array
        // But for this admin endpoint, we'll skip that check
        console.log('Adding posts to swarm-community feed');
      }

      // Clear existing feed entries for these posts
      await db.db.run(
        \`DELETE FROM feed_posts WHERE feed = ? AND post IN (\${postUris.map(() => '?').join(',')});\`,
        [feedId, ...postUris]
      );

      // Add posts to feed
      for (const uri of postUris) {
        await db.db.run(
          'INSERT INTO feed_posts (feed, post) VALUES (?, ?);',
          [feedId, uri]
        );
      }

      return res.json({ 
        success: true, 
        message: \`Added \${postUris.length} posts to feed \${feedId}\`,
        feedUri,
        postCount: postUris.length
      });
    } catch (error) {
      console.error('Error updating feed:', error);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  /**
   * Get database stats
   * GET /admin/stats
   */
  router.get('/stats', async (req, res) => {
    try {
      const postCount = await db.db.get('SELECT COUNT(*) as count FROM posts');
      const feedPostCount = await db.db.get('SELECT COUNT(*) as count FROM feed_posts');
      const feedStats = await db.db.all('SELECT feed, COUNT(*) as count FROM feed_posts GROUP BY feed');

      return res.json({
        posts: postCount.count,
        feedPosts: feedPostCount.count,
        feeds: feedStats
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
};
`;

    // Create the implementation file
    const implementationCode = `
/**
 * How to Implement the Admin Endpoint
 * 
 * Follow these steps to add the admin endpoint to your feed generator:
 * 
 * 1. Create a new file in your feed generator's src directory called 'admin.ts'
 * 2. Copy the code from the 'adminEndpointCode' section below into that file
 * 3. Update your main server file (index.ts or server.ts) to use the admin router
 * 
 * Example server.ts update:
 * 
 * // Import the admin router
 * import { createAdminRouter } from './admin';
 * 
 * // In your server setup code, after creating the app:
 * const adminRouter = createAdminRouter(db);
 * app.use('/admin', adminRouter);
 * 
 * 4. Restart your feed generator service
 * 5. Test the endpoint with curl:
 * 
 * curl -X POST https://your-feed-generator.com/admin/update-feed \\
 *   -H "Content-Type: application/json" \\
 *   -d '{"feedUri": "at://did:plc:your-did/app.bsky.feed.generator/your-feed", "postUris": ["post-uri-1", "post-uri-2"]}'
 * 
 * 6. You can also check database stats with:
 * 
 * curl https://your-feed-generator.com/admin/stats
 */

// Admin Endpoint Code (copy this to admin.ts)
const adminEndpointCode = \`${adminEndpointCode}\`;

console.log(adminEndpointCode);
`;

    // Write the implementation file
    const implementationFilePath = path.join(process.cwd(), 'scripts', 'admin-endpoint-implementation.ts');
    fs.writeFileSync(implementationFilePath, implementationCode);
    
    // Write the admin endpoint file
    const adminEndpointFilePath = path.join(process.cwd(), 'scripts', 'admin.ts');
    fs.writeFileSync(adminEndpointFilePath, adminEndpointCode);
    
    log.success(`Created admin endpoint implementation at ${implementationFilePath}`);
    log.success(`Created admin endpoint file at ${adminEndpointFilePath}`);
    
    log.section('Next Steps');
    log.info('1. Copy the admin.ts file to your feed generator\'s src directory');
    log.info('2. Update your main server file to use the admin router');
    log.info('3. Restart your feed generator service');
    log.info('4. Test the endpoint with curl');
    
  } catch (error) {
    log.error(`Error implementing admin endpoint: ${error.message}`);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
implementAdminEndpoint().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  if (error.stack) {
    log.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}); 