# ATProto Feed Generator

This is a starter kit for creating ATProto Feed Generators. It's not feature complete, but should give you a good starting ground off of which to build and deploy a feed.

## Overview

Feed Generators are services that provide custom algorithms to users through the AT Protocol.

They work very simply: the server receives a request from a user's server and returns a list of [post URIs](https://atproto.com/specs/at-uri-scheme) with some optional metadata attached. Those posts are then hydrated into full views by the requesting server and sent back to the client. This route is described in the [`app.bsky.feed.getFeedSkeleton` lexicon](https://docs.bsky.app/docs/api/app-bsky-feed-get-feed-skeleton).

A Feed Generator service can host one or more algorithms. The service itself is identified by DID, while each algorithm that it hosts is declared by a record in the repo of the account that created it. For instance, feeds offered by Bluesky will likely be declared in `@bsky.app`'s repo. Therefore, a given algorithm is identified by the at-uri of the declaration record. This declaration record includes a pointer to the service's DID along with some profile information for the feed.

The general flow of providing a custom algorithm to a user is as follows:
- A user requests a feed from their server (PDS) using the at-uri of the declared feed
- The PDS resolves the at-uri and finds the DID doc of the Feed Generator
- The PDS sends a `getFeedSkeleton` request to the service endpoint declared in the Feed Generator's DID doc
  - This request is authenticated by a JWT signed by the user's repo signing key
- The Feed Generator returns a skeleton of the feed to the user's PDS
- The PDS hydrates the feed (user info, post contents, aggregates, etc.)
  - In the future, the PDS will hydrate the feed with the help of an App View, but for now, the PDS handles hydration itself
- The PDS returns the hydrated feed to the user

For users, this should feel like visiting a page in the app. Once they subscribe to a custom algorithm, it will appear in their home interface as one of their available feeds.

## Getting Started

We've set up this simple server with SQLite to store and query data. Feel free to switch this out for whichever database you prefer.

Next, you will need to do two things:

1. Implement indexing logic in `src/subscription.ts`. 
   
   This will subscribe to the repo subscription stream on startup, parse events and index them according to your provided logic.

2. Implement feed generation logic in `src/algos`

   For inspiration, we've provided a very simple feed algorithm (`whats-alf`) that returns all posts related to the titular character of the TV show ALF. 

   You can either edit it or add another algorithm alongside it. The types are in place, and you will just need to return something that satisfies the `SkeletonFeedPost[]` type.

We've taken care of setting this server up with a did:web. However, you're free to switch this out for did:plc if you like - you may want to if you expect this Feed Generator to be long-standing and possibly migrating domains.

### Deploying your feed
Your feed will need to be accessible at the value supplied to the `FEEDGEN_HOSTNAME` environment variable.

The service must be set up to respond to HTTPS queries over port 443.

### Publishing your feed

To publish your feed, go to the script at `scripts/publishFeedGen.ts` and fill in the variables at the top. Examples are included, and some are optional. To publish your feed generator, simply run `yarn publishFeed`.

## Swarm Feed Generator Improvements

The Swarm Feed Generator has been enhanced with several improvements to make it more robust, reliable, and maintainable:

### 1. Feed Algorithm Enhancements
- Improved filtering logic to correctly identify and display posts from Swarm community members
- Added comprehensive logging for better visibility into feed generation
- Created unit tests to verify feed algorithm functionality

### 2. Firehose Connection Reliability
- Implemented exponential backoff for reconnection attempts to handle network disruptions
- Added cursor tracking to resume from the last processed message after disconnections
- Created a dedicated health check endpoint at `/health/firehose` to monitor connection status

### 3. Database Flexibility
- Added support for both SQLite (default) and PostgreSQL databases
- Implemented auto-detection of database type based on connection string
- Created database analysis tools to monitor performance and growth

### 4. Logging and Monitoring
- Integrated Winston for structured, multi-level logging
- Implemented file-based logging with rotation for production environments
- Added in-memory logging for real-time debugging via the `/logs` endpoint
- Enhanced error handling with detailed error logging

### 5. Testing and Deployment
- Set up automated testing with Jest
- Configured ESLint for code quality enforcement
- Created GitHub Actions workflow for continuous integration and deployment
- Added comprehensive documentation

### 6. Performance Optimization
- Improved query efficiency with proper indexing
- Enhanced error handling and recovery mechanisms
- Optimized database connections and query patterns

### 7. DID Configuration and Resolution
- Ensured consistency between service DID and feed URIs
- Fixed DID resolution issues by using the same DID for both service identification and feed URIs
- Added validation to prevent mismatches between service DID and publisher DID
- Improved error handling for DID resolution failures

## Development

### Prerequisites
- Node.js 18 or higher
- Yarn package manager

### Setup
1. Clone the repository
2. Install dependencies: `yarn install`
3. Copy `.env.example` to `.env` and configure environment variables
4. Start the development server: `yarn start`

### Testing
Run the test suite with: `yarn test`

### Linting
Check code quality with: `yarn lint`

### Deployment
The feed generator is automatically deployed when changes are pushed to the main branch, thanks to the GitHub Actions workflow.

## Running the Server

Install dependencies with `yarn` and then run the server with `yarn start`. This will start the server on port 3000, or what's defined in `.env`. You can then watch the firehose output in the console and access the output of the default custom ALF feed at [http://localhost:3000/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:example:alice/app.bsky.feed.generator/whats-alf](http://localhost:3000/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:example:alice/app.bsky.feed.generator/whats-alf).

## Some Details

### Skeleton Metadata

The skeleton that a Feed Generator puts together is, in its simplest form, a list of post URIs.

```ts
[
  {post: 'at://did:example:1234/app.bsky.feed.post/1'},
  {post: 'at://did:example:1234/app.bsky.feed.post/2'},
  {post: 'at://did:example:1234/app.bsky.feed.post/3'}
]
```

However, we include an additional location to attach some context. Here is the full schema:

```ts
type SkeletonItem = {
  post: string // post URI

  // optional reason for inclusion in the feed
  // (generally to be displayed in client)
  reason?: Reason
}

// for now, the only defined reason is a repost, but this is open to extension
type Reason = ReasonRepost

type ReasonRepost = {
  $type: 'app.bsky.feed.defs#skeletonReasonRepost'
  repost: string // repost URI
}
```

This metadata serves two purposes:

1. To aid the PDS in hydrating all relevant post information
2. To give a cue to the client in terms of context to display when rendering a post

### Authentication

If you are creating a generic feed that does not differ for different users, you do not need to check auth. But if a user's state (such as follows or likes) is taken into account, we _strongly_ encourage you to validate their auth token.

Users are authenticated with a simple JWT signed by the user's repo signing key.

This JWT header/payload takes the format:
```ts
const header = {
  type: "JWT",
  alg: "ES256K" // (key algorithm) - in this case secp256k1
}
const payload = {
  iss: "did:example:alice", // (issuer) the requesting user's DID
  aud: "did:example:feedGenerator", // (audience) the DID of the Feed Generator
  exp: 1683643619 // (expiration) unix timestamp in seconds
}
```

We provide utilities for verifying user JWTs in the `@atproto/xrpc-server` package, and you can see them in action in `src/auth.ts`.

### Pagination
You'll notice that the `getFeedSkeleton` method returns a `cursor` in its response and takes a `cursor` param as input.

This cursor is treated as an opaque value and fully at the Feed Generator's discretion. It is simply passed through the PDS directly to and from the client.

We strongly encourage that the cursor be _unique per feed item_ to prevent unexpected behavior in pagination.

We recommend, for instance, a compound cursor with a timestamp + a CID:
`1683654690921::bafyreia3tbsfxe3cc75xrxyyn6qc42oupi73fxiox76prlyi5bpx7hr72u`

## Suggestions for Implementation

How a feed generator fulfills the `getFeedSkeleton` request is completely at their discretion. At the simplest end, a Feed Generator could supply a "feed" that only contains some hardcoded posts.

For most use cases, we recommend subscribing to the firehose at `com.atproto.sync.subscribeRepos`. This websocket will send you every record that is published on the network. Since Feed Generators do not need to provide hydrated posts, you can index as much or as little of the firehose as necessary.

Depending on your algorithm, you likely do not need to keep posts around for long. Unless your algorithm is intended to provide "posts you missed" or something similar, you can likely garbage collect any data that is older than 48 hours.

Some examples:

### Reimplementing What's Hot
To reimplement "What's Hot", you may subscribe to the firehose and filter for all posts and likes (ignoring profiles/reposts/follows/etc.). You would keep a running tally of likes per post and when a PDS requests a feed, you would send the most recent posts that pass some threshold of likes.

### A Community Feed
You might create a feed for a given community by compiling a list of DIDs within that community and filtering the firehose for all posts from users within that list.

### A Topical Feed
To implement a topical feed, you might filter the algorithm for posts and pass the post text through some filtering mechanism (an LLM, a keyword matcher, etc.) that filters for the topic of your choice.

## Community Feed Generator Templates

- [Python](https://github.com/MarshalX/bluesky-feed-generator) - [@MarshalX](https://github.com/MarshalX)
- [Ruby](https://github.com/mackuba/bluesky-feeds-rb) - [@mackuba](https://github.com/mackuba)

## Troubleshooting

### DID Resolution Errors
If you encounter DID resolution errors in the Bluesky interface, check the following:

1. **DID Consistency**: Ensure that the service DID (`FEEDGEN_SERVICE_DID`) is used consistently in both the feed generator configuration and the feed URIs. The feed URIs in the `describeFeedGenerator` response should use the same DID as the service DID.

2. **Feed Registration**: Verify that the feed is registered with the correct DID. You can check this by running the `publishFeedGen.ts` script with the correct DID values.

3. **Health Check**: Use the `/health/firehose` endpoint to verify that the firehose connection is active and processing events correctly.

4. **Logs**: Check the logs at the `/logs` endpoint for any errors related to DID resolution or feed generation.

### Empty Feed
If your feed appears empty in the Bluesky interface, check the following:

1. **Community Members**: Verify that the `SWARM_COMMUNITY_MEMBERS` array in `swarm-community-members.ts` contains valid DIDs.

2. **Database**: Check the database to ensure that posts are being indexed correctly. You can use the `/debug` endpoint to view database statistics.

3. **Firehose Connection**: Verify that the firehose connection is active and processing events. Use the `/health/firehose` endpoint to check the connection status.
