# Instructions for Implementing the Initial "Swarm" Feed in Swarm

These instructions guide Cursor to implement the initial "Swarm" feed as the first community feed in the Swarm project, a Bluesky clone built on the AT Protocol. The feed will replace the "Following" feed, showcasing curated or user-contributed posts labeled "swarm-community." Follow these steps to execute the plan.

## Step 1: Define the Platform's DID
- **Action**: Assign a Decentralized Identifier (DID) to the platform.
  - Set the DID to `did:plc:swarm` as the unique identifier for the platform.
  - Ensure the DID is registered securely, using the PLC method with rotation keys managed by the platform.
- **Cursor Task**: Generate a configuration file or code snippet to register `did:plc:swarm` with the AT Protocol. Use the `@atproto/api` package to handle DID creation and key management.
  - Example: Create a file `src/config/did.ts` with a function to initialize the DID.
  - **Optional**: If the full DID registration process (e.g., key rotation setup) is unclear, provide AT Protocol documentation or a Bluesky code example for reference.

**Execution Summary**: Created the `src/config/did.ts` file with functions to initialize, register, and verify the platform's DID (`did:plc:swarm`). Updated the environment configuration in `src/env.ts` and `.env` to include AT Protocol authentication variables. The implementation includes functions for initializing both ATP and Bluesky agents, with proper error handling and authentication flow. For a production environment, additional work would be needed for key rotation and secure storage, as noted in the code comments. **Done.**

## Step 2: Create the Feed Generator Record
- **Action**: Create a feed generator record for the "Swarm" feed.
  - Define a record of type `app.bsky.feed.generator` with:
    - `did`: `did:plc:swarm`
    - `record_key`: "main-swarm"
    - `name`: "Swarm"
    - `description`: "The main community feed of the Swarm platform"
    - `avatar`: (Optional) Add a placeholder URL (e.g., "https://swarm.com/avatar.png")
  - Store this record with URI `at://did:plc:swarm/app.bsky.feed.generator/main-swarm`.
- **Cursor Task**: Generate server-side code to create this record using the agent.
  - Use `agent.createRecord` to store the feed generator in the platform's repository.
  - Example: Create a file `src/server/feed_generator.ts` with the record creation logic.
  - **Optional**: If the full `app.bsky.feed.generator` schema (e.g., all required fields) is missing, provide the AT Protocol schema details.

**Execution Summary**: Created the `src/server/feed_generator.ts` file with functions to create and manage the Swarm feed generator record. Implemented the feed generator with the specified metadata (name, description, avatar) and URI (`at://did:plc:swarm/app.bsky.feed.generator/main-swarm`). Added functions to check if the feed generator already exists and to initialize it if needed. The implementation includes proper error handling and logging. **Done.**

## Step 3: Define the Community Label "swarm-community"
- **Action**: Create a label to identify posts for the "Swarm" community.
  - Define a record of type `app.bsky.label.defs` with:
    - `name`: "swarm-community"
    - (Add other required fields as per AT Protocol schema, if known)
- **Cursor Task**: Generate code to create and store the label definition in the platform's repository.
  - Use `agent.createRecord` for the label definition.
  - Example: Create a file `src/labels/label_defs.ts` with the label setup.
  - **Optional**: If the complete `app.bsky.label.defs` schema is unavailable, provide the full field list from AT Protocol docs.

**Execution Summary**: Created the `src/labels/label_defs.ts` file with functions to define, create, and apply the "swarm-community" label. Implemented the label definition with metadata including name, description, visibility, and blur settings. Added functions to check if the label already exists, initialize it if needed, and apply it to posts. The implementation includes a utility function to apply the label to specific posts, which will be used in the post composer. Fixed a linter error by generating a unique identifier for label applications. **Done.**

## Step 4: Implement Feed Generation Logic
- **Action**: Develop server-side logic to generate the "Swarm" feed.
  - Query posts with the "swarm-community" label.
  - Sort by creation time or engagement (e.g., likes, reposts).
  - Implement pagination with cursors (default 50 posts, max 100).
- **Cursor Task**: Generate server-side TypeScript code for the `getFeed` method.
  - Use a database query to fetch labeled posts and sort them.
  - Example: Update `src/server/feed_generator.ts` with a `getFeed` function that handles pagination.
  - Include error handling and performance optimization (e.g., indexing on labels).
  - **Optional**: If the database schema or query language (e.g., SQL, MongoDB) is unspecified, provide the database setup or a query example.

**Execution Summary**: Updated the `src/server/feed_generator.ts` file to add feed generation logic with the `getSwarmFeed` function. Implemented interfaces for feed parameters, post items, and feed responses. Added support for pagination with cursor-based navigation and configurable limits (default 50, max 100). Implemented sorting options for both recent and popular posts, with popularity based on engagement metrics (likes, reposts, replies). Used the Bluesky API to search for posts with the "swarm-community" label, with proper error handling and logging. In a production environment, this would be replaced with a more efficient database query. **Done.**

## Step 5: Configure Client-Side Posting
- **Action**: Enable users to post to the "Swarm" community.
  - Add an option in the post composer to select "Swarm" community.
  - Create a label application record (`app.bsky.label.app`) when selected.
- **Cursor Task**: Generate client-side React Native code for the post composer.
  - Modify the UI to include a "Swarm" option in a dropdown or checkbox.
  - Use `agent.createRecord` to apply the "swarm-community" label.
  - Example: Update `src/components/PostComposer.tsx` with the new logic.
  - **Optional**: If the exact Bluesky post composer component path is unknown, provide the file name or path from the Bluesky codebase.

**Execution Summary**: Implemented the client-side posting functionality for the Swarm community. Created the SwarmCommunityBtn component that allows users to add their posts to the Swarm community feed. Updated the PostDraft type to include an isSwarmCommunity field and added a new action type to handle toggling this field. Modified the post function to apply the swarm-community label when publishing a post with the Swarm community option enabled. The implementation includes a dialog that explains the purpose of the Swarm community feed and provides a toggle button for users to opt in. The SwarmCommunityBtn is integrated into the Composer component's bottom bar, making it easily accessible during post creation. **Done.**

## Step 6: Set "Swarm" as the Default Feed
- **Action**: Configure the client to display the "Swarm" feed first.
  - Set `at://did:plc:swarm/app.bsky.feed.generator/main-swarm` as the default feed.
  - Use `agent.app.bsky.feed.getFeed` to fetch and display posts with pagination.
- **Cursor Task**: Generate client-side code to update the feed list.
  - Modify the feed manager to prioritize the "Swarm" feed.
  - Ensure pagination support for seamless scrolling.
  - Example: Update `src/components/FeedManager.tsx` with the new configuration (adjust path if needed).
  - **Optional**: If the exact feed manager file path is unclear, provide the Bluesky component name or file location.

## Execution Guidelines
- **Tech Stack**: Use React Native (TypeScript) for the client, aligned with Bluesky's structure, and server-side logic compatible with AT Protocol.
- **Dependencies**: Ensure `@atproto/api` is installed for AT Protocol interactions.
- **Testing**: Generate unit tests for each step (e.g., feed generation, label application) to verify functionality.
- **Performance**: Optimize database queries and client rendering for scalability.
- **Output**: Create or update the specified files with the generated code, and provide a diff for review.
- **Authentication**: Ensure the agent is authenticated (e.g., with API keys or tokens); if setup details are missing, provide authentication configuration.

## Outcome
Once implemented, the "Swarm" feed will be the platform's flagship community feed, showcasing user-contributed posts labeled "swarm-community," providing an engaging, platform-wide view from the start.