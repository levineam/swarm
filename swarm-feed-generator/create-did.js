const {BskyAgent} = require('@atproto/api')
const fs = require('fs')
const path = require('path')

async function createDidPlc() {
  try {
    console.log('Creating a new DID using the AT Protocol...')

    // Create a new Bluesky agent
    const agent = new BskyAgent({
      service: 'https://bsky.social',
    })

    // For creating a DID, we need to create an account
    // Note: In a production environment, you would use a dedicated account for your feed generator
    // For this example, we'll simulate the process and provide information about how to do it

    console.log(
      '\nTo create a DID for your feed generator, you have two options:',
    )
    console.log(
      '1. Create a new Bluesky account specifically for your feed generator',
    )
    console.log(
      '2. Use an existing account and its DID for your feed generator\n',
    )

    console.log('For option 1, you would use:')
    console.log('  agent.createAccount({')
    console.log('    email: "your-email@example.com",')
    console.log('    handle: "swarm-community.bsky.social",')
    console.log('    password: "your-secure-password"')
    console.log('  });\n')

    console.log('For option 2, you would use:')
    console.log('  agent.login({')
    console.log('    identifier: "your-handle.bsky.social",')
    console.log('    password: "your-password"')
    console.log('  });\n')

    console.log('After authentication, you can access the DID with:')
    console.log('  const did = agent.session.did;\n')

    // For demonstration purposes, we'll create a placeholder DID info file
    // In a real implementation, you would use the actual DID from account creation or login
    const didInfo = {
      did: 'did:plc:example-placeholder-did',
      note: 'This is a placeholder. Replace with your actual DID after account creation or login.',
      createdAt: new Date().toISOString(),
      instructions: [
        'Create a Bluesky account for your feed generator',
        'Login with the account credentials',
        'Use the DID from the session for your feed generator',
        'Update this file with the actual DID information',
      ],
    }

    fs.writeFileSync(
      path.join(__dirname, 'did-info.json'),
      JSON.stringify(didInfo, null, 2),
    )

    console.log('Placeholder DID information saved to did-info.json')
    console.log(
      'Please update this file with your actual DID after account creation or login.',
    )

    return didInfo.did
  } catch (error) {
    console.error('Error in DID creation process:', error)
    throw error
  }
}

// Execute the function
createDidPlc()
  .then(did => {
    console.log('Process completed. Placeholder DID:', did)
    console.log('Remember to replace this with your actual DID.')
  })
  .catch(error => {
    console.error('Process failed:', error)
    process.exit(1)
  })
