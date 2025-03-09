# Resolve Feed Generator DID Configuration Issue

This document outlines a systematic approach to resolve the "invalid feed generator service details in did document" error for the Swarm feed generator.

## Current Status

- ✅ Feed generator service is deployed at `https://swarm-social.onrender.com`
- ✅ Feed generator record exists at `at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community`
- ❌ DID document is missing the required feed generator service entry
- ❌ Clients receive "invalid feed generator service details in did document" error

## Target Solution

Add the following service entry to the DID document `did:plc:ouadmsyvsfcpkxg3yyz4trqi`:

```json
{
  "id": "#atproto_feed_generator",
  "type": "AtprotoFeedGenerator",
  "serviceEndpoint": "https://swarm-social.onrender.com"
}
```

## Step 1: Verify Rotation Key Access

**Goal**: Determine if we have access to the rotation keys for `did:plc:ouadmsyvsfcpkxg3yyz4trqi`.

**Why**: Rotation keys are required to sign DID operations for updating the DID document.

**Actions**:
1. Check project files, environment variables, and configuration for any stored rotation keys
2. Look for key files with extensions like `.key`, `.pem`, or `.jwk`
3. Check if there's a `did-info.json` file containing key information
4. Look for any script that might have been used to create the DID initially

**Expected Outcome**:
- Either locate the rotation key needed to update the DID document
- Or confirm we don't have access to the rotation keys

## Step 2: Create a Signed Operation to Update the DID Document

**Goal**: Use the rotation key to craft and sign a DID operation adding the feed generator service entry.

**Why**: A signed operation is required to update the DID document in the PLC directory.

**Actions**:
1. Install the required library: `npm install @did-plc/lib`
2. Fetch the current DID document from `https://plc.directory/did:plc:ouadmsyvsfcpkxg3yyz4trqi`
3. Create a script to add the feed generator service entry to the DID document
4. Use the rotation key to sign the operation
5. Format the output in DAG-CBOR as required by the PLC directory

**Expected Outcome**:
- A signed operation ready for submission to the PLC directory

## Step 3: Submit the Signed Operation to the PLC Directory

**Goal**: Send the signed operation to update the DID document officially.

**Why**: The PLC directory must validate and apply the operation to reflect the changes.

**Actions**:
1. Submit the signed operation via POST request to `https://plc.directory/did:plc:ouadmsyvsfcpkxg3yyz4trqi`
2. Ensure the request body is the DAG-CBOR-encoded operation
3. Handle any error responses appropriately

**Expected Outcome**:
- Successful update of the DID document
- Or error responses indicating what went wrong

## Step 4: Verify the DID Document Update

**Goal**: Confirm the DID document now includes the feed generator service entry.

**Why**: Ensures the update worked and the feed generator error is resolved.

**Actions**:
1. Fetch the updated DID document from `https://plc.directory/did:plc:ouadmsyvsfcpkxg3yyz4trqi`
2. Verify it now includes the `AtprotoFeedGenerator` service with endpoint `https://swarm-social.onrender.com`
3. Test the feed generator in a client application

**Expected Outcome**:
- DID document contains the correct service entry
- Feed generator works correctly in client applications

## Step 5: Alternative Approach - Create a New DID (If Rotation Keys Unavailable)

**Goal**: Create a new DID for the feed generator that we fully control.

**Why**: If updating the existing DID isn't possible, a new DID bypasses the rotation key issue.

**Actions**:
1. Use `@did-plc/lib` to create a new DID
2. Configure the DID document to include the feed generator service entry
3. Store the rotation keys securely for future use
4. Update the `publishSwarmFeed.ts` script to use the new DID
5. Run the script to publish the feed generator record under the new DID

**Expected Outcome**:
- A new DID with the correct service entry
- Updated feed generator record pointing to this new DID

## Step 6: Update Client Application (If Using Alternative Approach)

**Goal**: Point the client to the new DID's feed URI.

**Why**: The client must use the DID that correctly resolves the feed generator.

**Actions**:
1. Update client code to reference the new feed URI: `at://<new_did>/app.bsky.feed.generator/swarm-community`
2. Test the client to ensure it fetches and displays the feed correctly

**Expected Outcome**:
- Client application successfully connects to and displays the feed

## Troubleshooting Tips

- If the PLC directory rejects the operation, double-check the signature and format
- Ensure the rotation key being used is actually authorized for the DID
- For the alternative approach, ensure the new DID is properly registered before publishing the feed
- Check the AT Protocol documentation and community resources for any recent changes to the DID update process 