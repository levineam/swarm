#!/usr/bin/env node

/**
 * Script to check feed URIs for consistency with the publisher DID
 * 
 * This script makes requests to the feed generator's endpoints and checks if the feed URIs
 * in the responses are using the correct DID (publisher DID as per AT Protocol specifications).
 */

require('dotenv').config();
const fetch = require('node-fetch');
const chalk = require('chalk');

const FEEDGEN_HOSTNAME = process.env.FEEDGEN_HOSTNAME || 'swarm-feed-generator.onrender.com';
const FEEDGEN_SERVICE_DID = process.env.FEEDGEN_SERVICE_DID || 'did:web:swarm-feed-generator.onrender.com';
const FEEDGEN_PUBLISHER_DID = process.env.FEEDGEN_PUBLISHER_DID || 'did:plc:ouadmsyvsfcpkxg3yyz4trqi';

async function main() {
  console.log(chalk.blue('=== Feed URI Consistency Check ==='));
  console.log(chalk.gray('Checking if feed URIs are using the correct DID'));
  console.log('');
  
  console.log(chalk.yellow('Configuration:'));
  console.log(`Service DID: ${chalk.cyan(FEEDGEN_SERVICE_DID)}`);
  console.log(`Publisher DID: ${chalk.cyan(FEEDGEN_PUBLISHER_DID)}`);
  console.log(`Hostname: ${chalk.cyan(FEEDGEN_HOSTNAME)}`);
  console.log('');

  // Check the describeFeedGenerator endpoint
  console.log(chalk.yellow('Checking describeFeedGenerator endpoint...'));
  
  try {
    const describeResponse = await fetch(`https://${FEEDGEN_HOSTNAME}/xrpc/app.bsky.feed.describeFeedGenerator`);
    
    if (!describeResponse.ok) {
      console.log(chalk.red(`✗ Endpoint returned status ${describeResponse.status}: ${describeResponse.statusText}`));
      return;
    }
    
    const describeData = await describeResponse.json();
    console.log(`Response: ${chalk.cyan(JSON.stringify(describeData, null, 2))}`);
    
    // Check DID in the response
    if (describeData.did) {
      console.log(`DID in response: ${chalk.cyan(describeData.did)}`);
      
      if (describeData.did === FEEDGEN_PUBLISHER_DID) {
        console.log(chalk.green(`✓ DID in response is correctly set to publisher DID`));
      } else if (describeData.did === FEEDGEN_SERVICE_DID) {
        console.log(chalk.red(`✗ DID in response is incorrectly set to service DID instead of publisher DID`));
        console.log(chalk.yellow(`  This violates AT Protocol specifications`));
      } else {
        console.log(chalk.red(`✗ DID in response is set to an unknown DID: ${describeData.did}`));
      }
    } else {
      console.log(chalk.red(`✗ No DID found in response`));
    }
    
    // Check feed URIs in the response
    let allFeedUrisCorrect = true;
    
    if (describeData.feeds && Array.isArray(describeData.feeds)) {
      console.log(`\nFound ${describeData.feeds.length} feeds in response`);
      
      for (const feed of describeData.feeds) {
        const feedUri = feed.uri;
        console.log(`Feed URI: ${chalk.cyan(feedUri)}`);
        
        // Extract the DID from the feed URI
        const didMatch = feedUri.match(/at:\/\/(did:[^/]+)/);
        if (!didMatch) {
          console.log(chalk.red(`✗ Could not extract DID from feed URI: ${feedUri}`));
          allFeedUrisCorrect = false;
          continue;
        }
        
        const feedDid = didMatch[1];
        if (feedDid === FEEDGEN_PUBLISHER_DID) {
          console.log(chalk.green(`✓ Feed URI uses publisher DID correctly`));
        } else if (feedDid === FEEDGEN_SERVICE_DID) {
          console.log(chalk.red(`✗ Feed URI uses service DID instead of publisher DID`));
          allFeedUrisCorrect = false;
          
          // Suggest fix
          const correctedUri = feed.uri.replace(FEEDGEN_SERVICE_DID, FEEDGEN_PUBLISHER_DID);
          console.log(chalk.yellow(`  Suggested fix: Update feed URI to ${correctedUri}`));
        } else {
          console.log(chalk.red(`✗ Feed URI uses unknown DID: ${feedDid}`));
          allFeedUrisCorrect = false;
        }
      }
      
      if (allFeedUrisCorrect) {
        console.log(chalk.green('\n✓ All feed URIs are using the correct publisher DID'));
      } else {
        console.log(chalk.red('\n✗ Some feed URIs are not using the correct publisher DID'));
        console.log(chalk.yellow('  This can cause DID resolution issues when users try to access the feed'));
        console.log(chalk.yellow('  Update the describe-generator.ts file to use ctx.cfg.publisherDid instead of ctx.cfg.serviceDid'));
      }
    }
  } catch (error) {
    console.log(chalk.red(`✗ Error checking describeFeedGenerator: ${error.message}`));
  }
  
  console.log('');
  
  // Check if both feed URIs work
  console.log(chalk.yellow('Testing feed endpoints with both DIDs...'));
  
  try {
    // Test with service DID
    const serviceFeedUrl = `https://${FEEDGEN_HOSTNAME}/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://${FEEDGEN_SERVICE_DID}/app.bsky.feed.generator/swarm-community`;
    console.log(`Testing service DID feed URI: ${chalk.cyan(serviceFeedUrl)}`);
    
    const serviceResponse = await fetch(serviceFeedUrl);
    if (serviceResponse.ok) {
      const serviceData = await serviceResponse.json();
      console.log(chalk.green(`✓ Feed endpoint works with service DID (returned ${serviceData.feed?.length || 0} items)`));
      console.log(chalk.yellow('  Note: While this works, it should not be the primary URI format used according to AT Protocol specs'));
    } else {
      console.log(chalk.red(`✗ Feed endpoint failed with service DID: ${serviceResponse.status} ${serviceResponse.statusText}`));
    }
  } catch (error) {
    console.log(chalk.red(`✗ Error testing service DID feed: ${error.message}`));
  }
  
  try {
    // Test with publisher DID
    const publisherFeedUrl = `https://${FEEDGEN_HOSTNAME}/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://${FEEDGEN_PUBLISHER_DID}/app.bsky.feed.generator/swarm-community`;
    console.log(`Testing publisher DID feed URI: ${chalk.cyan(publisherFeedUrl)}`);
    
    const publisherResponse = await fetch(publisherFeedUrl);
    if (publisherResponse.ok) {
      const publisherData = await publisherResponse.json();
      console.log(chalk.green(`✓ Feed endpoint works with publisher DID (returned ${publisherData.feed?.length || 0} items)`));
      console.log(chalk.green('  This is the correct format according to AT Protocol specs'));
    } else {
      console.log(chalk.red(`✗ Feed endpoint failed with publisher DID: ${publisherResponse.status} ${publisherResponse.statusText}`));
    }
  } catch (error) {
    console.log(chalk.red(`✗ Error testing publisher DID feed: ${error.message}`));
  }
  
  console.log('');
  console.log(chalk.blue('=== Feed URI Check Complete ==='));
  console.log(chalk.gray('If any feed URIs are using the wrong DID, update your feed generator code'));
  console.log(chalk.gray('After updating, redeploy the feed generator and run the publishFeedGen script to update the feed record'));
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 