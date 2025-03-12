# Swarm Feed Generator

A custom feed generator for the Swarm social app that integrates with the AT Protocol and Bluesky.

## Overview

This feed generator creates a "Swarm Community" feed that displays posts from members of the Swarm community. It connects to the Bluesky firehose to receive real-time updates and filters posts based on a list of DIDs defined in the `swarm-community-members.ts` file.

## Features

- Custom feed algorithm for Swarm community members
- Real-time updates via Bluesky firehose subscription
- Configurable via environment variables
- SQLite database for storing post data

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Bluesky account with a registered DID

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/swarm-social-app.git
   cd swarm-social-app/swarm-feed-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```
   PORT=3000
   FEEDGEN_HOSTNAME=localhost:3000
   FEEDGEN_PUBLISHER_DID=your-did
   FEEDGEN_LABELS_ENABLED=false
   FEEDGEN_SERVICE_DID=your-did
   FEEDGEN_SUBSCRIPTION_ENDPOINT=wss://bsky.network
   DATABASE_URL=sqlite:swarm-feed.db
   
   # Bluesky credentials
   BLUESKY_USERNAME=your-handle.bsky.social
   BLUESKY_PASSWORD=your-password
   ```

5. Generate a Bluesky access token:
   ```bash
   node get-bluesky-token.js
   ```

## Usage

### Starting the Feed Generator

```bash
npm start
```

The feed generator will be available at `http://localhost:3000`.

### Endpoints

- `GET /xrpc/app.bsky.feed.describeFeedGenerator`: Returns information about the available feeds
- `GET /xrpc/app.bsky.feed.getFeedSkeleton`: Returns a feed skeleton for the requested feed

### Adding Community Members

To add members to the Swarm community, edit the `src/swarm-community-members.ts` file:

```typescript
export const SWARM_COMMUNITY_MEMBERS: string[] = [
  "did:plc:ouadmsyvsfcpkxg3yyz4trqi",  // andrarchy.bsky.social
  // Add more DIDs here
];
```

## Deployment

### Deploying to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - Name: `swarm-social`
   - Environment: `Node`
   - Build Command: `cd swarm-feed-generator && npm install`
   - Start Command: `cd swarm-feed-generator && npm start`
   - Add environment variables from your `.env` file

4. Click "Create Web Service"

## Maintenance

### Updating the Bluesky Access Token

The Bluesky access token expires after a few hours. To generate a new token:

```bash
node get-bluesky-token.js
```

This will update the `.env` file with a new token. After updating, restart the feed generator service.

### Monitoring

Monitor the feed generator logs for any errors or issues. Common issues include:

- Expired access token
- Connection issues with the Bluesky firehose
- Database errors

## Troubleshooting

### Feed Not Showing Posts

1. Check that the DIDs in the `SWARM_COMMUNITY_MEMBERS` array are correct
2. Verify that the feed generator is connected to the Bluesky firehose
3. Check the logs for any errors

### 502 Bad Gateway Error

1. Ensure the feed generator service is running
2. Check that the service is accessible at the configured URL
3. Verify that the DID document has the correct service endpoint

### Invalid Feed Generator Service Details

1. Check the DID document at `https://plc.directory/your-did`
2. Ensure the service endpoint is correctly configured
3. Verify that the algorithm record exists

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 