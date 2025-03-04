import { AtpAgent, BskyAgent } from '@atproto/api';
import { logger } from '#/logger';
import { PLATFORM_DID } from '#/config/did';
import { COMMUNITY_LABEL_NAME } from '../labels/label_defs';

/**
 * Swarm Feed Generator
 * 
 * This file manages the creation and configuration of the "Swarm" feed,
 * which serves as the platform's main community feed.
 */

// Feed generator constants
export const FEED_GENERATOR_TYPE = 'app.bsky.feed.generator';
export const FEED_RECORD_KEY = 'main-swarm';
export const FEED_URI = `at://${PLATFORM_DID}/${FEED_GENERATOR_TYPE}/${FEED_RECORD_KEY}`;

// Feed metadata
export const SWARM_FEED_METADATA = {
  did: PLATFORM_DID,
  displayName: 'Swarm',
  description: 'The main community feed of the Swarm platform',
  avatar: 'https://swarm.com/avatar.png', // Placeholder URL
};

// Feed pagination defaults
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

/**
 * Create the Swarm feed generator record
 * This registers the feed with the AT Protocol so it can be discovered and used
 */
export const createFeedGeneratorRecord = async (agent: AtpAgent): Promise<string> => {
  try {
    logger.debug('Creating feed generator record for Swarm feed');
    
    const record = {
      did: PLATFORM_DID,
      displayName: SWARM_FEED_METADATA.displayName,
      description: SWARM_FEED_METADATA.description,
      avatar: SWARM_FEED_METADATA.avatar,
      createdAt: new Date().toISOString(),
    };
    
    const result = await agent.com.atproto.repo.createRecord({
      repo: PLATFORM_DID,
      collection: FEED_GENERATOR_TYPE,
      rkey: FEED_RECORD_KEY,
      record,
    });
    
    logger.debug('Feed generator record created successfully', {
      uri: result.uri,
      cid: result.cid,
    });
    
    return result.uri;
  } catch (error) {
    logger.error('Failed to create feed generator record', { error });
    throw error;
  }
};

/**
 * Check if the feed generator record already exists
 */
export const checkFeedGeneratorExists = async (agent: AtpAgent): Promise<boolean> => {
  try {
    logger.debug('Checking if feed generator record exists');
    
    await agent.com.atproto.repo.getRecord({
      repo: PLATFORM_DID,
      collection: FEED_GENERATOR_TYPE,
      rkey: FEED_RECORD_KEY,
    });
    
    logger.debug('Feed generator record exists');
    return true;
  } catch (error) {
    logger.debug('Feed generator record does not exist');
    return false;
  }
};

/**
 * Interface for feed query parameters
 */
export interface FeedParams {
  cursor?: string;
  limit?: number;
  sortBy?: 'recent' | 'popular';
}

/**
 * Interface for a feed post item
 */
export interface FeedPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
    [key: string]: any;
  };
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  indexedAt: string;
  labels?: Array<{
    val: string;
    src: string;
  }>;
}

/**
 * Interface for feed response
 */
export interface FeedResponse {
  cursor?: string;
  feed: FeedPost[];
}

/**
 * Get posts for the Swarm feed
 * This fetches posts with the swarm-community label and applies sorting and pagination
 */
export const getSwarmFeed = async (
  agent: BskyAgent,
  params: FeedParams = {}
): Promise<FeedResponse> => {
  try {
    logger.debug('Getting Swarm feed', { params });
    
    const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
    
    // Search for posts with the swarm-community label
    const searchParams: { q: string; limit: number; cursor?: string } = {
      q: `label:${COMMUNITY_LABEL_NAME}`,
      limit,
    };
    
    if (params.cursor) {
      searchParams.cursor = params.cursor;
    }
    
    const searchResult = await agent.app.bsky.feed.searchPosts(searchParams);
    
    // Transform the search results into feed posts
    const feed: FeedPost[] = searchResult.data.posts.map(post => ({
      uri: post.uri,
      cid: post.cid,
      author: {
        did: post.author.did,
        handle: post.author.handle,
        displayName: post.author.displayName,
        avatar: post.author.avatar,
      },
      record: {
        text: post.record.text || '',
        createdAt: post.record.createdAt || new Date().toISOString(),
        ...post.record,
      },
      replyCount: post.replyCount,
      repostCount: post.repostCount,
      likeCount: post.likeCount,
      indexedAt: post.indexedAt,
      labels: post.labels,
    }));
    
    // Sort the feed based on the sortBy parameter
    if (params.sortBy === 'popular') {
      feed.sort((a, b) => {
        // Calculate engagement score (likes + reposts + replies)
        const scoreA = (a.likeCount || 0) + (a.repostCount || 0) + (a.replyCount || 0);
        const scoreB = (b.likeCount || 0) + (b.repostCount || 0) + (b.replyCount || 0);
        return scoreB - scoreA;
      });
    }
    
    logger.debug('Swarm feed retrieved successfully', {
      count: feed.length,
      cursor: searchResult.data.cursor,
    });
    
    return {
      cursor: searchResult.data.cursor,
      feed,
    };
  } catch (error) {
    logger.error('Failed to get Swarm feed', { error });
    throw error;
  }
};

/**
 * Initialize the Swarm feed generator
 * This is the main function to call when setting up the feed
 */
export const initializeSwarmFeed = async (): Promise<void> => {
  try {
    logger.debug('Initializing Swarm feed');
    
    // This would be implemented in a production environment
    // to ensure the feed generator record exists
    
    logger.debug('Swarm feed initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Swarm feed', { error });
    throw error;
  }
}; 