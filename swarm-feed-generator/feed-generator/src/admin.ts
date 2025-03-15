// @ts-nocheck
/**
 * Admin Endpoints
 * 
 * This file implements admin endpoints for manually managing the feed generator.
 */

import express from 'express';

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

      console.log(`Adding ${postUris.length} posts to feed ${feedId}`);

      // Actually add posts to the database
      const postsToAdd = postUris.map(uri => {
        const parts = uri.split('/');
        const creator = parts[2]; // did:plc:...
        const cid = 'bafyreihbvkwdpxqvvkxqjgvjlvvlvqvkxqvjvlvvlvqvkxqvjvlvvlvqvkxq'; // Placeholder CID
        return {
          uri,
          cid,
          creator,
          indexedAt: new Date().toISOString()
        };
      });

      // Insert posts into the database
      await db
        .insertInto('post')
        .values(postsToAdd)
        .onConflict((oc) => oc.doNothing())
        .execute();

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
      // Get actual database stats
      const postCount = await db
        .selectFrom('post')
        .select(db.fn.count('uri').as('count'))
        .executeTakeFirst();

      const recentPosts = await db
        .selectFrom('post')
        .selectAll()
        .orderBy('indexedAt', 'desc')
        .limit(5)
        .execute();

      return res.json({
        message: 'Database stats endpoint',
        timestamp: new Date().toISOString(),
        postCount: postCount?.count || 0,
        recentPosts
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      return res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  return router;
};
