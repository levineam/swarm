# Swarm Community Feed Generator

A custom feed generator for the Swarm community on the AT Protocol. This feed generator filters posts from Swarm community members and makes them available via a custom feed URI.

## Overview

The Swarm Community Feed Generator is built on top of the Bluesky feed generator template. It provides a specialized feed that shows posts from members of the Swarm community, making it easier for users to stay connected with community content.

## Features

- **Community-focused**: Shows posts only from Swarm community members
- **Real-time updates**: Subscribes to the AT Protocol firehose to get real-time post updates
- **Customizable**: Easy to update the list of community members
- **AT Protocol compliant**: Follows all standards for feed generators

## Directory Structure

- `feed-generator/`: The main feed generator code
  - `src/`: Source code
    - `algos/`: Feed algorithms
      - `swarm-community.ts`: The Swarm community feed algorithm
    - `swarm-community-members.ts`: List of Swarm community member DIDs
  - `scripts/`: Utility scripts
    - `publishSwarmFeed.ts`: Script to publish the feed generator to Bluesky

## Setup and Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/swarm-feed-generator.git
   cd swarm-feed-generator/feed-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your configuration

4. **Start the feed generator**
   ```bash
   npm start
   ```

## Publishing the Feed Generator

To publish the feed generator to Bluesky:

1. **Update your `.env` file**
   - Set `FEEDGEN_PUBLISHER_DID` to your Bluesky DID
   - Set `FEEDGEN_SERVICE_DID` to your service DID
   - Add your Bluesky credentials:
     ```
     BLUESKY_USERNAME=your-username.bsky.social
     BLUESKY_PASSWORD=your-app-password
     ```

2. **Run the publish script**
   ```bash
   npx ts-node scripts/publishSwarmFeed.ts
   ```

3. **Verify the feed**
   - The feed URI will be: `at://{YOUR_DID}/app.bsky.feed.generator/swarm-community`
   - You can view it in the Bluesky app by navigating to the custom feeds section

## Adding Community Members

To add or update the list of Swarm community members:

1. Open `src/swarm-community-members.ts`
2. Update the `SWARM_COMMUNITY_MEMBERS` array with the DIDs of community members
3. Restart the feed generator

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 