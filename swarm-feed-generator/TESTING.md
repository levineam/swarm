# Testing the Swarm Community Feed Generator

This document provides instructions for testing the Swarm Community Feed Generator in a real-world environment.

## Prerequisites

- The feed generator server is deployed and running at `https://swarm-social.onrender.com`
- The algorithm record has been created with URI `at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`
- The client application has been updated to use the new feed URI

## Testing Steps

### 1. Launch the Client Application

1. Start the client application:
   ```bash
   cd /path/to/social-app
   npm start
   ```

2. Navigate to the Swarm Community feed tab.

### 2. Verify Feed Content

1. Check that the feed shows posts only from Swarm community members.
2. Verify that posts from non-community members do not appear in the feed.
3. Test posting as a community member and confirm the post appears in the feed.
4. Test posting as a non-community member and confirm the post does not appear in the feed.

### 3. Monitor Server Logs

1. Monitor the server logs for any errors:
   ```bash
   # If using Render, view logs in the Render dashboard
   # Or if you have log access:
   tail -f /path/to/logs/feed-generator.log
   ```

2. Look specifically for:
   - JWT authentication errors
   - Database connection issues
   - Feed generation errors
   - Firehose subscription errors

### 4. Test Authentication

1. Verify that the server checks JWT tokens in `getFeedSkeleton` requests:
   ```bash
   # Make a request without a valid JWT token
   curl -X GET https://swarm-social.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community
   
   # The response should indicate an authentication error
   ```

2. Make a request with a valid JWT token:
   ```bash
   curl -X GET https://swarm-social.onrender.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community \
   -H "Authorization: Bearer YOUR_JWT_TOKEN"
   
   # The response should include feed posts
   ```

### 5. Performance Testing

1. Test the feed with a small number of users (1-10).
2. Test the feed with a moderate number of users (10-100).
3. Monitor response times and server resource usage.

## Troubleshooting

### Common Issues

1. **Feed Not Loading**:
   - Check that the feed URI is correct in the client application.
   - Verify that the algorithm record exists and is properly configured.
   - Check server logs for any errors.

2. **Authentication Errors**:
   - Ensure the JWT token is valid and not expired.
   - Verify that the DID document is properly configured.

3. **Missing Posts**:
   - Check that the community members list is up to date.
   - Verify that the firehose subscription is working correctly.
   - Check the database for the expected posts.

## Reporting Issues

If you encounter any issues during testing, please:

1. Document the issue with steps to reproduce.
2. Include any relevant error messages or logs.
3. Note the environment and conditions under which the issue occurred.
4. Submit the issue to the project repository. 