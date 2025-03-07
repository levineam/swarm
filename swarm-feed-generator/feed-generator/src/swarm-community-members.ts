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
  'did:plc:ouadmsyvsfcpkxg3yyz4trqi', // andrarchy.bsky.social
]

// Helper function to check if a user is part of the Swarm community
export function isSwarmCommunityMember(did: string): boolean {
  return SWARM_COMMUNITY_MEMBERS.includes(did)
}
