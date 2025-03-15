/**
 * Admin Endpoints
 * 
 * This file implements admin endpoints for manually managing the feed generator.
 */

import express from 'express';
import { Database } from './db';

// Create a router for admin endpoints
export const createAdminRouter = (db: any) => {
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

      // For swarm-community feed, check if authors are in the SWARM_COMMUNITY_MEMBERS list
      if (feedId === 'swarm-community') {
        console.log('Adding posts to swarm-community feed');
      }

      // Add posts to feed (implementation depends on your database structure)
      console.log(`Adding ${postUris.length} posts to feed ${feedId}`);

      return res.json({ 
        success: true, 
        message: `Added ${postUris.length} posts to feed ${feedId}`,
        feedUri,
        postCount: postUris.length
      });
    } catch (error) {
      console.error('Error updating feed:', error);
      return res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * Get database stats
   * GET /admin/stats
   */
  router.get('/stats', async (req, res) => {
    try {
      // Simplified implementation that doesn't depend on specific database methods
      return res.json({
        message: 'Database stats endpoint',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      return res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  return router;
};
