const { AtpAgent } = require('@atproto/api');
const dotenv = require('dotenv');

// Load environment variables from .env file
console.log('Starting feed generator publication script...');
dotenv.config({ path: '.env' });
console.log('Loaded environment variables');

const run = async () => {
  // Ensure required environment variables are set
  const requiredEnvVars = [
    'FEEDGEN_PUBLISHER_DID',
    'FEEDGEN_SERVICE_DID',
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }
  console.log('Required environment variables are set');

  // Get credentials from environment or prompt
  const publisherDid = process.env.FEEDGEN_PUBLISHER_DID;
  const serviceDid = process.env.FEEDGEN_SERVICE_DID;
  console.log(`Publisher DID: ${publisherDid}`);
  console.log(`Service DID: ${serviceDid}`);
  
  // Prompt for Bluesky credentials
  if (!process.env.BLUESKY_USERNAME || !process.env.BLUESKY_PASSWORD) {
    console.log('Please provide your Bluesky credentials:');
    console.log('Username: (set as BLUESKY_USERNAME in .env)');
    console.log('Password: (set as BLUESKY_PASSWORD in .env)');
    process.exit(1);
  }
  
  const username = process.env.BLUESKY_USERNAME;
  const password = process.env.BLUESKY_PASSWORD;
  console.log(`Using Bluesky account: ${username}`);

  // Create ATP agent and login
  console.log('Logging in to Bluesky...');
  const agent = new AtpAgent({ service: 'https://bsky.social' });
  try {
    await agent.login({ identifier: username, password: password });
    console.log('Logged in successfully');
  } catch (loginError) {
    console.error('Login failed:', loginError);
    process.exit(1);
  }

  // Publish the Swarm community feed generator
  try {
    console.log('Publishing Swarm community feed generator...');
    
    // Define the record
    const record = {
      did: serviceDid,
      displayName: 'Swarm Community',
      description: 'A feed of posts from the Swarm community members',
      avatar: undefined, // Add avatar image URI if available
      createdAt: new Date().toISOString(),
    };
    console.log('Record prepared:', record);

    // Create the record
    console.log(`Creating record in repo: ${publisherDid}`);
    const res = await agent.api.com.atproto.repo.putRecord({
      repo: publisherDid,
      collection: 'app.bsky.feed.generator',
      rkey: 'swarm-community',
      record,
    });

    console.log('Feed generator published successfully!');
    console.log(`Feed URI: at://${publisherDid}/app.bsky.feed.generator/swarm-community`);
    console.log(`Record CID: ${res.data.cid}`);
  } catch (error) {
    console.error('Error publishing feed generator:', error);
    process.exit(1);
  }
};

console.log('Script initialized, running main function...');
run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 