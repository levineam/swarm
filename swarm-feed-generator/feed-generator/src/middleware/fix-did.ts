import { Request, Response, NextFunction } from 'express'
import { logger } from '../util/logger'

/**
 * Creates a middleware that fixes feed URIs by replacing the publisher DID with the service DID
 * This helps ensure that all feed URIs use the service DID consistently
 * 
 * @param serviceDid - The DID of the service
 * @param publisherDid - The DID of the publisher that might be incorrectly used in some URIs
 * @returns Express middleware function
 */
export function fixFeedUris(serviceDid: string, publisherDid: string) {
  return function(req: Request, res: Response, next: NextFunction) {
    // Store the original json method
    const originalJson = res.json;

    // Override the json method to intercept the response body
    res.json = function(body: any) {
      try {
        // Check if we're serving a response from describeFeedGenerator or a similar endpoint
        if (body && 
            (req.path.includes('/app.bsky.feed.describeFeedGenerator') || 
             req.path.includes('describeFeedGenerator') ||
             body.feeds || 
             (body.feed && typeof body.feed === 'string'))) {
          
          logger.info('Intercepting response to fix feed URIs', { 
            path: req.path,
            hasFeedField: !!body.feed,
            hasFeedsArray: !!body.feeds
          });

          // Log the original body for debugging
          logger.debug('Original response body', { body });

          // Fix the feed field if it exists and contains the publisher DID
          if (body.feed && typeof body.feed === 'string' && body.feed.includes(publisherDid)) {
            const originalFeed = body.feed;
            body.feed = body.feed.replace(publisherDid, serviceDid);
            logger.info('Fixed feed URI', {
              original: originalFeed,
              fixed: body.feed
            });
          }

          // Fix the feeds array if it exists
          if (body.feeds && Array.isArray(body.feeds)) {
            for (let i = 0; i < body.feeds.length; i++) {
              const feed = body.feeds[i];
              if (feed.uri && typeof feed.uri === 'string' && feed.uri.includes(publisherDid)) {
                const originalUri = feed.uri;
                feed.uri = feed.uri.replace(publisherDid, serviceDid);
                logger.info('Fixed feed URI in feeds array', {
                  index: i,
                  original: originalUri,
                  fixed: feed.uri
                });
              }
            }
          }

          // Fix any feed URIs in HTML content
          if (typeof body === 'string' && body.includes(publisherDid) && body.includes('<!DOCTYPE html>')) {
            const originalHtml = body;
            body = body.replace(new RegExp(publisherDid, 'g'), serviceDid);
            logger.info('Fixed feed URIs in HTML content', {
              replacementCount: (originalHtml.match(new RegExp(publisherDid, 'g')) || []).length
            });
          }
          
          // Log the modified body for debugging
          logger.debug('Modified response body', { body });
        }
      } catch (err) {
        logger.error('Error in fixFeedUris middleware', { error: err });
        // Continue with the original response on error
      }

      // Call the original json method with the potentially modified body
      return originalJson.call(this, body);
    };

    next();
  };
} 