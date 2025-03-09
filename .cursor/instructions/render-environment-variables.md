# Render Environment Variables Update

To fix the feed generator connection issues on the deployed service, update the following environment variables in the Render dashboard:

## Required Changes

1. **FEEDGEN_HOSTNAME**
   - Current: `localhost:3000` or similar
   - New: `swarm-social.onrender.com` (without the port)

2. **FEEDGEN_LISTENHOST**
   - Current: Not set or set to `localhost`
   - New: `0.0.0.0`

3. **FEEDGEN_SERVICE_DID**
   - Current: `did:web:feed.swarm.example.com` or similar
   - New: `did:plc:ouadmsyvsfcpkxg3yyz4trqi`

## Steps to Update

1. Log in to your Render dashboard at https://dashboard.render.com/
2. Navigate to your "swarm-social" service
3. Click on the "Environment" tab
4. Update the environment variables as specified above
5. Click "Save Changes"
6. Trigger a manual deploy by clicking "Manual Deploy" and selecting "Deploy latest commit"

## Verification

After the deployment is complete, verify that the service is working correctly by accessing:

```
https://swarm-social.onrender.com/xrpc/app.bsky.feed.describeFeedGenerator
```

You should receive a JSON response with the correct DID and feed URIs:

```json
{
  "did": "did:plc:ouadmsyvsfcpkxg3yyz4trqi",
  "feeds": [
    {
      "uri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/whats-alf"
    },
    {
      "uri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community"
    }
  ]
}
``` 