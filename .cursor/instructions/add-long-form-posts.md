## Step-by-Step Instructions for Implementing Long-Form Posts in Swarm

### Overview
These instructions enable Swarm to support long-form posts (up to ~7500 characters) while aligning with your architecture:
- **Client**: React/React Native frontend
- **Feed Generator**: Node.js/Express service on Render (`https://swarm-social.onrender.com`)
- **Database**: SQLite (transitioning to PostgreSQL)
- **Protocol**: AT Protocol with Bluesky integration
- **Features**: Community management, JWT authentication

The steps build on your completed deployment and feed generator setup, ensuring compatibility with your roadmap.

---

### Step 1: Update the Client-Side Post Creation Interface
**Goal**: Allow users to create long-form posts in the client application.

- **Modify the UI**:
  - Replace the existing input with a resizable text area. For React, use `react-textarea-autosize`:
    ```javascript
    import TextareaAutosize from 'react-textarea-autosize';
    import { useState } from 'react';

    function PostComposer() {
      const [text, setText] = useState('');
      return (
        <div>
          <TextareaAutosize
            minRows={3}
            maxRows={20}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your long-form post..."
            style={{ width: '100%' }}
          />
          <p>{7500 - text.length} characters left</p>
        </div>
      );
    }
    ```
  - Add a character counter to enforce the 7500-character limit.
  - **Optional**: Integrate `react-markdown` for Markdown support with a preview toggle.

- **React Native**:
  - Use a `TextInput` with `multiline={true}`:
    ```javascript
    import { TextInput, Text } from 'react-native';
    import { useState } from 'react';

    function PostComposer() {
      const [text, setText] = useState('');
      return (
        <>
          <TextInput
            multiline
            numberOfLines={4}
            value={text}
            onChangeText={setText}
            placeholder="Write your long-form post..."
            style={{ height: 100, textAlignVertical: 'top' }}
          />
          <Text>{7500 - text.length} characters left</Text>
        </>
      );
    }
    ```

- **Considerations**:
  - Ensure responsiveness across web and mobile, consistent with your client design.

---

### Step 2: Adjust Post Submission Logic
**Goal**: Submit long-form posts to the Personal Data Server (PDS) with JWT authentication.

- **Update the Submission Function**:
  - Modify the client to handle larger text and use your existing JWT tokens:
    ```javascript
    async function submitPost(text) {
      if (text.length > 7500) {
        alert('Post exceeds 7500 characters');
        return;
      }
      const post = {
        $type: 'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
      };
      const response = await fetch('https://swarm-social.onrender.com/createPost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`, // Your JWT token
        },
        body: JSON.stringify(post),
      });
      if (!response.ok) throw new Error('Post submission failed');
    }
    ```
  - On the server, integrate with the AT Protocol agent (e.g., `@atproto/api`):
    ```javascript
    const { BskyAgent } = require('@atproto/api');
    const agent = new BskyAgent({ service: 'https://bsky.social' });

    app.post('/createPost', async (req, res) => {
      const { text, createdAt } = req.body;
      const token = req.headers.authorization.split(' ')[1]; // Extract JWT
      // Verify JWT and get user DID (implementation depends on your auth setup)
      const userDid = verifyToken(token); // Your JWT verification logic
      try {
        await agent.createRecord({
          repo: userDid,
          collection: 'app.bsky.feed.post',
          record: { $type: 'app.bsky.feed.post', text, createdAt },
        });
        res.status(200).send('Post created');
      } catch (error) {
        res.status(500).send('Error creating post');
      }
    });
    ```

- **Considerations**:
  - The Bluesky PDS historically limits posts to ~256 characters, but the AT Protocol supports larger records. If self-hosting the PDS, configure it to accept up to 7500 characters.

---

### Step 3: Enhance Post Rendering
**Goal**: Display long-form posts effectively in the client.

- **Update the Display Component**:
  - Use a collapsible view for lengthy posts:
    ```javascript
    import ReactMarkdown from 'react-markdown';
    import { useState } from 'react';

    function Post({ text }) {
      const [expanded, setExpanded] = useState(false);
      const preview = text.slice(0, 300);
      return (
        <div>
          {expanded ? (
            <ReactMarkdown>{text}</ReactMarkdown>
          ) : (
            <p>
              {preview}... <button onClick={() => setExpanded(true)}>Read More</button>
            </p>
          )}
        </div>
      );
    }
    ```

- **React Native**:
  - Use a collapsible component:
    ```javascript
    import { Text, TouchableOpacity, ScrollView } from 'react-native';
    import { useState } from 'react';

    function Post({ text }) {
      const [expanded, setExpanded] = useState(false);
      const preview = text.slice(0, 300);
      return expanded ? (
        <ScrollView>
          <Text>{text}</Text>
        </ScrollView>
      ) : (
        <Text>
          {preview}...{' '}
          <TouchableOpacity onPress={() => setExpanded(true)}>
            <Text>Read More</Text>
          </TouchableOpacity>
        </Text>
      );
    }
    ```

- **Considerations**:
  - Optimize rendering for feed performance, especially on mobile.

---

### Step 4: Verify Database Handling
**Goal**: Ensure SQLite (and future PostgreSQL) supports long-form posts.

- **Schema Check**:
  - If caching posts locally (e.g., for community metadata), use SQLite’s `TEXT` type:
    ```sql
    CREATE TABLE cached_posts (
      uri TEXT PRIMARY KEY,
      text TEXT,
      created_at DATETIME,
      community_id INTEGER, -- Foreign key to Communities table
      FOREIGN KEY (community_id) REFERENCES Communities(id)
    );
    ```
  - PostgreSQL’s `TEXT` type will work similarly in production.

- **Considerations**:
  - Align with your `Communities` and `CommunityMembers` schema for community-specific caching.

---

### Step 5: Modify the Feed Generator
**Goal**: Ensure the feed generator processes long-form posts.

- **Update Logic**:
  - The feed generator typically handles URIs. Verify it retrieves posts correctly:
    ```javascript
    app.get('/xrpc/app.bsky.feed.getFeedSkeleton', async (req, res) => {
      const feed = await db.query(
        'SELECT uri FROM cached_posts WHERE community_id IN (SELECT community_id FROM CommunityMembers WHERE member_did = ? AND status = "active")',
        [req.userDid] // Extracted from JWT
      );
      res.json({ feed });
    });
    ```

- **Considerations**:
  - Optimize for horizontal scaling as planned in your architecture.

---

### Step 6: Integrate with Community Management
**Goal**: Align long-form posts with community roles.

- **Add Permissions**:
  - Restrict long-form posts if desired:
    ```javascript
    app.post('/createPost', async (req, res) => {
      const { text } = req.body;
      const userDid = verifyToken(req.headers.authorization.split(' ')[1]);
      const role = await db.get(
        'SELECT role FROM CommunityMembers WHERE member_did = ? AND community_id = ?',
        [userDid, req.body.communityId]
      );
      if (role !== 'moderator' && role !== 'admin' && text.length > 300) {
        return res.status(403).send('Only moderators/admins can post long-form content');
      }
      // Proceed with post creation
    });
    ```

- **Considerations**:
  - Use your role-based system (`member`, `moderator`, `admin`) for consistency.

---

### Step 7: Test the Implementation
**Goal**: Validate the feature end-to-end.

- **Test Cases**:
  - Submit posts at 300, 5000, and 7500 characters.
  - Verify rendering and feed inclusion.
  - Test compatibility with Bluesky clients.

- **Data Flow**:
  - Confirm posts flow from the AT Protocol firehose to `https://swarm-social.onrender.com`.

---

### Step 8: Document the Feature
**Goal**: Update Swarm’s documentation.

- **User Guide**:
  - Add: "Long-form posts up to 7500 characters are supported. Use Markdown for formatting."
- **Developer Notes**:
  - Update [Feed Generator Implementation Notes](./feed-generator-implementation-notes.md) with changes.

---

### Step 9: Monitor Performance
**Goal**: Ensure scalability.

- **Optimizations**:
  - Index `text` fields if searching posts.
  - Prepare for PostgreSQL and caching per your roadmap.

- **Considerations**:
  - Monitor performance with high volumes, aligning with your scalability plans.

