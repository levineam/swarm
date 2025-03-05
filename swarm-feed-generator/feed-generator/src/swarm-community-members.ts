/**
 * Swarm Community Members
 * 
 * This file contains the list of DIDs for users who are part of the Swarm community.
 * Posts from these users will be included in the Swarm community feed.
 */

// List of DIDs for users who are part of the Swarm community
export const SWARM_COMMUNITY_MEMBERS: string[] = [
  // Add your DID here as the first member
  // You can find your DID in the app settings or profile page
  // Example: "did:plc:abcdefghijklmnopqrstuvwxyz"
];

// Helper function to check if a user is part of the Swarm community
export function isSwarmCommunityMember(did: string): boolean {
  return SWARM_COMMUNITY_MEMBERS.includes(did);
} 