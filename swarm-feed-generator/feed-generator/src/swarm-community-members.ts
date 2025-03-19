/**
 * Swarm Community Members
 *
 * This file contains the list of DIDs for users who are part of the Swarm community.
 * Posts from these users will be included in the Swarm community feed.
 */

import { logger } from './util/logger'

// List of DIDs for users who are part of the Swarm community
export const SWARM_COMMUNITY_MEMBERS: string[] = [
  // Add your DID here as the first member
  // You can find your DID in the app settings or profile page
  'did:plc:ouadmsyvsfcpkxg3yyz4trqi', // andrarchy.bsky.social
]

// Helper function to check if a user is part of the Swarm community
export function isSwarmCommunityMember(did: string): boolean {
  // Log the DID being checked and normalize it for comparison
  const normalizedDid = did.trim().toLowerCase();
  
  // Check for exact match in the community members array
  const matchIndex = SWARM_COMMUNITY_MEMBERS.findIndex(
    member => member.toLowerCase() === normalizedDid
  );
  
  const isMember = matchIndex !== -1;

  // Log detailed information about the comparison
  logger.debug('Checking community membership', {
    checkedDid: did,
    normalizedDid,
    isMember,
    matchIndex: matchIndex !== -1 ? matchIndex : 'not found',
    membersCount: SWARM_COMMUNITY_MEMBERS.length
  });

  return isMember;
}
