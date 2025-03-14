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
      const placeholders = postUris.map(() => '?').join(',');
      await db.db.run(
        `DELETE FROM feed_posts WHERE feed = ? AND post IN (${placeholders});`,
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
        message: `Added ${postUris.length} posts to feed ${feedId}`,
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
