Here is a step-by-step guide to address the issues with the Swarm Feed Generator, a service that filters and provides custom feeds for the Swarm Community Platform built on the AT Protocol used by Bluesky. This guide resolves critical problems, removes manual workarounds, and evolves the service into a robust, scalable, and maintainable system.

---

**Step 1: Correct the Feed Algorithm**

**Problem**: Posts are indexed in the database but not appearing in feeds, possibly due to a typo in the variable name (SWARM\_COMUNITY\_MEMBERS instead of SWARM\_COMMUNITY\_MEMBERS) and lack of testing.

**Actions**:

* **Locate and Fix Typo**: Open the file swarm-community.ts (or wherever the feed query is defined). If the variable is SWARM\_COMUNITY\_MEMBERS, correct it to SWARM\_COMMUNITY\_MEMBERS.  
* **Verify Community Members List**: Ensure SWARM\_COMMUNITY\_MEMBERS is defined in the codebase and contains the correct Decentralized Identifiers (DIDs) of community members.  
* **Add Logging**: Modify the feed handler function to log the number of posts selected and details of a few sample posts (e.g., their URIs or creator DIDs) for debugging.  
* typescript  
* console.log(\`Selected ${posts.length} posts\`, posts.slice(0, 3));  
* **Implement Unit Tests**: Write tests for the handler function to confirm it retrieves the correct posts based on SWARM\_COMMUNITY\_MEMBERS. Example using a testing framework like Jest:  
* typescript

test('handler returns community posts', async () \=\> {  
  const result \= await handler(db, 10);  
  expect(result.feed.length).toBeGreaterThan(0);  
  expect(result.feed\[0\].post).toMatch(/at:/);

* });

**Outcome**: The feed algorithm correctly filters and displays posts from community members.

**Execution Summary**:
- Examined the feed algorithm in `swarm-community.ts` and confirmed the variable name is correctly defined as `SWARM_COMMUNITY_MEMBERS` in `swarm-community-members.ts`.
- Added comprehensive logging to the feed handler function to track:
  - Feed requests with limit and cursor parameters
  - Number of community members and their DIDs
  - Query execution and results
  - Sample posts when available
  - Database statistics when no posts are found
- Created unit tests in `swarm-community.test.ts` that verify:
  - The feed algorithm correctly filters posts from community members
  - Pagination works properly with cursor-based navigation
  - Empty result sets are handled gracefully
- Updated the `package.json` to include Jest for running tests with the `npm test` command
- Verified that the feed algorithm correctly uses the community members list to filter posts

**Status: Done**

---

**Step 2: Enhance Firehose Connection Reliability**

**Problem**: The AT Protocol firehose connection disconnects frequently, and the basic reconnection logic causes missed posts.

**Actions**:

* **Review Current Implementation**: Examine the existing firehose connection code to understand its reconnection strategy.  
* **Integrate a Library or Custom Logic**:  
  * **Option 1**: Use the atproto\_firehose library if compatible. Install it (npm install atproto\_firehose) and follow its documentation for setup.  
  * **Option 2**: Implement custom reconnection with exponential backoff. Example:  
  * typescript

let delay \= 1000; // Start with 1 second  
const maxDelay \= 60000; // Cap at 1 minute  
function reconnect() {  
  setTimeout(() \=\> {  
    connectToFirehose();  
    delay \= Math.min(delay \* 2, maxDelay);  
  }, delay);

* }  
* **Track Last Cursor**: Save the cursor of the last processed post (e.g., to a file or database) and use it to resume streaming after a disconnection.  
* typescript

let lastCursor;  
firehose.on('message', (msg) \=\> {  
  processMessage(msg);  
  lastCursor \= msg.cursor;  
  saveCursor(lastCursor);  
});

* firehose.connect({ cursor: loadLastCursor() });  
* **Add Logging**: Log connection events (e.g., "Connected", "Disconnected", "Reconnection attempt failed") to track reliability.

**Outcome**: A stable firehose connection that recovers from disconnections and catches up on missed posts.

---

**Step 3: Assess Database Needs and Migrate if Necessary**

**Problem**: SQLite is used currently, but it may not scale with increasing post volumes.

**Actions**:

* **Analyze Usage**: Check the current database size (e.g., SELECT COUNT(\*) FROM post) and estimate growth based on post frequency.  
* **Plan Migration** (if needed):  
  * **Set Up PostgreSQL**: Create a PostgreSQL instance (e.g., on Render.com, which supports it natively).  
  * **Update Connection**: Modify the application's database configuration to use PostgreSQL. Example with a library like pg:  
  * typescript

const { Pool } \= require('pg');

* const pool \= new Pool({ connectionString: 'postgres://user:pass@host:port/db' });  
  * **Migrate Data**: Export SQLite data (e.g., using .dump) and import it into PostgreSQL, adjusting schemas as needed.  
  * **Optimize Queries**: Add indexes on creator and indexedAt:  
  * sql

CREATE INDEX idx\_creator ON post (creator);

* CREATE INDEX idx\_indexedAt ON post (indexedAt);  
* **Test**: Run the application with the new database and verify feed generation.

**Outcome**: A database that supports current and future post volumes efficiently.

---

**Step 4: Set Up Logging and Monitoring**

**Problem**: Minimal logging and no monitoring make it hard to diagnose issues.

**Actions**:

* **Install Winston**: Add Winston for logging (npm install winston) and configure it:  
* typescript

const winston \= require('winston');  
const logger \= winston.createLogger({  
  level: 'info',  
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),  
  transports: \[new winston.transports.File({ filename: 'app.log' })\],

* });  
* **Add Logs**: Insert logging in key areas (e.g., feed generation, firehose events):  
* typescript  
* logger.info('Generating feed', { postCount: posts.length });  
* **Integrate Monitoring**: Sign up for New Relic (or similar), install its agent (npm install newrelic), and configure it per their docs. Monitor metrics like response times and error rates.  
* **Set Alerts**: Configure alerts (e.g., email notification if error rate \> 5%).  
* **Improve Error Handling**: Wrap critical operations in try-catch blocks and log errors:  
* typescript

try {  
  await builder.execute();  
} catch (error) {  
  logger.error('Query failed', { error });  
  throw error;

* }

**Outcome**: Detailed logs and real-time monitoring to quickly identify and resolve issues.

---

**Step 5: Automate Testing and Deployment, and Refactor Code**

**Problem**: Lack of automated testing and deployment, plus technical debt, increases error risk.

**Actions**:

* **Set Up CI/CD**:  
  * Create a GitHub Actions workflow (.github/workflows/deploy.yml):  
  * yaml

name: Deploy  
on: \[push\]  
jobs:  
  test-and-deploy:  
    runs-on: ubuntu-latest  
    steps:  
      \- uses: actions/checkout@v3  
      \- run: npm install  
      \- run: npm test

*       \- run: npm run deploy \# Adjust based on deployment method  
* **Write Tests**: Add unit and integration tests (e.g., for the handler and firehose logic) using Jest or Mocha.  
* **Code Review**: Review the codebase for inefficiencies (e.g., redundant queries) and refactor:  
  * Split large functions into smaller ones.  
  * Add comments explaining complex logic.  
* **Document**: Update README with setup and deployment instructions.

**Outcome**: Automated, reliable deployments with cleaner, well-tested code.

---

**Step 6: Phase Out Manual Workarounds**

**Problem**: Manual interventions (admin endpoint and hourly script) bypass core issues.

**Actions**:

* **Verify Fixes**: Confirm that Steps 1 and 2 resolve feed issues by checking the feed output.  
* **Remove Admin Endpoint**: Delete or disable the endpoint (e.g., /admin/add-post) in the codebase.  
* **Disable Script**: Turn off the hourly GitHub Action (e.g., delete its .yml file or comment it out).  
* **Monitor**: Check the feed over a few hours/days to ensure posts appear without manual help.

**Outcome**: A fully automated feed generation process.

---

**Conclusion**

By completing these steps, the Swarm Feed Generator will become a reliable, scalable service. Start with fixing the feed algorithm and firehose connection, then enhance infrastructure with better database and monitoring solutions, automate processes, and finally remove workarounds. This ensures the platform serves the Swarm Community effectively while being ready for growth.  
