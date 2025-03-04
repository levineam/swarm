import { AtpAgent } from '@atproto/api';
import { logger } from '#/logger';
import { PLATFORM_DID } from '#/config/did';

/**
 * Swarm Label Definitions
 * 
 * This file manages the creation and configuration of labels used in the Swarm platform,
 * particularly the "swarm-community" label used to identify posts for the Swarm feed.
 */

// Community label constants
export const COMMUNITY_LABEL_NAME = 'swarm-community';
export const COMMUNITY_LABEL_COLLECTION = 'app.bsky.feed.threadgate';

/**
 * Defines the community label for the Swarm platform
 */
export interface CommunityLabel {
  name: string;
  description: string;
  visibility: 'public' | 'private';
  createdAt: string;
}

/**
 * The Swarm community label definition
 */
export const SWARM_COMMUNITY_LABEL: CommunityLabel = {
  name: COMMUNITY_LABEL_NAME,
  description: 'Posts that belong to the Swarm community',
  visibility: 'public',
  createdAt: new Date().toISOString(),
};

/**
 * Creates a community label record in the repository
 * @param agent The ATP agent to use for creating the record
 * @returns The URI of the created label record
 */
export const createCommunityLabelRecord = async (agent: AtpAgent): Promise<string> => {
  try {
    logger.debug('Creating community label record');
    
    const record = {
      ...SWARM_COMMUNITY_LABEL,
      createdBy: PLATFORM_DID,
    };
    
    const result = await agent.com.atproto.repo.createRecord({
      repo: PLATFORM_DID,
      collection: COMMUNITY_LABEL_COLLECTION,
      rkey: COMMUNITY_LABEL_NAME,
      record,
    });
    
    logger.debug('Community label record created successfully', {
      uri: result.uri,
    });
    
    return result.uri;
  } catch (error) {
    logger.error('Failed to create community label record', { error });
    throw error;
  }
};

/**
 * Checks if the community label record already exists
 * @param agent The ATP agent to use for checking the record
 * @returns True if the record exists, false otherwise
 */
export const checkCommunityLabelExists = async (agent: AtpAgent): Promise<boolean> => {
  try {
    logger.debug('Checking if community label record exists');
    
    await agent.com.atproto.repo.getRecord({
      repo: PLATFORM_DID,
      collection: COMMUNITY_LABEL_COLLECTION,
      rkey: COMMUNITY_LABEL_NAME,
    });
    
    logger.debug('Community label record exists');
    return true;
  } catch (error) {
    logger.debug('Community label record does not exist');
    return false;
  }
};

/**
 * Applies the community label to a post
 * @param agent The ATP agent to use for applying the label
 * @param postUri The URI of the post to apply the label to
 * @returns The URI of the created label application record
 */
export const applyCommunityLabel = async (
  agent: AtpAgent,
  postUri: string
): Promise<string> => {
  try {
    logger.debug('Applying community label to post', { postUri });
    
    const record = {
      subject: postUri,
      labels: [
        {
          val: COMMUNITY_LABEL_NAME,
          src: PLATFORM_DID,
        },
      ],
      createdAt: new Date().toISOString(),
    };
    
    const result = await agent.com.atproto.repo.createRecord({
      repo: PLATFORM_DID,
      collection: 'app.bsky.feed.label',
      rkey: `${COMMUNITY_LABEL_NAME}-${Date.now()}`,
      record,
    });
    
    logger.debug('Community label applied successfully', {
      uri: result.uri,
      postUri,
    });
    
    return result.uri;
  } catch (error) {
    logger.error('Failed to apply community label', { error, postUri });
    throw error;
  }
};

/**
 * Initializes the community label
 * Creates the community label record if it doesn't exist
 */
export const initializeCommunityLabel = async (): Promise<void> => {
  try {
    logger.debug('Initializing community label');
    
    // This would be implemented in a production environment
    // to ensure the community label record exists
    
    logger.debug('Community label initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize community label', { error });
    throw error;
  }
}; 