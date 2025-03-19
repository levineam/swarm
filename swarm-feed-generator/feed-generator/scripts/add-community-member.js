#!/usr/bin/env node

/**
 * Add Community Member Script
 *
 * This script adds a new DID to the SWARM_COMMUNITY_MEMBERS array
 * in the swarm-community-members.ts file.
 */

const fs = require('fs')
const path = require('path')

// Get the DID from command line arguments
const newDid = process.argv[2]
const memberDescription = process.argv[3] || '' // Optional description

if (!newDid) {
  console.error('Error: No DID provided')
  console.log('Usage: node add-community-member.js <did> [description]')
  console.log(
    'Example: node add-community-member.js did:plc:abcdefg123456 username.bsky.social',
  )
  process.exit(1)
}

// Validate the DID format (basic validation)
if (!newDid.startsWith('did:')) {
  console.error('Error: Invalid DID format. DIDs should start with "did:"')
  console.log('Example valid DID: did:plc:abcdefg123456')
  process.exit(1)
}

// Path to the community members file
const communityMembersPath = path.join(
  __dirname,
  '../src/swarm-community-members.ts',
)

// Read the current file
try {
  let content = fs.readFileSync(communityMembersPath, 'utf8')

  // Check if the DID is already in the file
  if (content.includes(newDid)) {
    console.log(`The DID ${newDid} is already in the community members list.`)
    process.exit(0)
  }

  // Find the array in the file
  const arrayMatch = content.match(
    /export const SWARM_COMMUNITY_MEMBERS: string\[\] = \[([\s\S]*?)\]/,
  )

  if (!arrayMatch) {
    console.error(
      'Error: Could not find the SWARM_COMMUNITY_MEMBERS array in the file.',
    )
    process.exit(1)
  }

  const arrayContent = arrayMatch[1]

  // Create the new member entry
  const newMemberEntry = `  '${newDid}', // ${memberDescription}`

  // Add the new member to the array
  const newArrayContent = arrayContent + '\n' + newMemberEntry

  // Replace the old array content with the new one
  const updatedContent = content.replace(
    arrayMatch[0],
    `export const SWARM_COMMUNITY_MEMBERS: string[] = [${newArrayContent}\n]`,
  )

  // Write the updated content back to the file
  fs.writeFileSync(communityMembersPath, updatedContent)

  console.log(`Successfully added ${newDid} to the community members list.`)

  // Instructions for deployment
  console.log('\nTo apply this change:')
  console.log('1. Commit the changes:')
  console.log('   git add ../src/swarm-community-members.ts')
  console.log('   git commit -m "Add new community member: ' + newDid + '"')
  console.log('2. Push the changes to the remote repository:')
  console.log('   git push')
  console.log('3. Deploy the updated code to Render.com')
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
