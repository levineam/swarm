import {
  isCommit,
  OutputSchema as RepoEvent,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import {
  isSwarmCommunityMember,
  SWARM_COMMUNITY_MEMBERS,
} from './swarm-community-members'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { logger } from './util/logger'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    // Enhanced logging: Log firehose event details
    logger.info('Firehose event received', {
      repo: evt.repo,
      seq: evt.seq,
      time: new Date().toISOString(),
      postsCount: ops.posts.creates.length,
      likesCount: ops.likes.creates.length,
      repostsCount: ops.reposts.creates.length,
      followsCount: ops.follows.creates.length,
    })

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    for (const post of ops.posts.creates) {
      logger.debug('Firehose post text', {
        author: post.author,
        text: post.record.text.substring(0, 100) + (post.record.text.length > 100 ? '...' : ''),
        uri: post.uri
      })
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)

    // Filter posts for the "whats-alf" feed (original example)
    const alfPostsToCreate = ops.posts.creates
      .filter((create) => {
        // only alf-related posts
        return create.record.text.toLowerCase().includes('alf')
      })
      .map((create) => {
        // map alf-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          creator: create.author,
          indexedAt: new Date().toISOString(),
        }
      })

    // Filter posts for the Swarm community feed
    logger.info('Processing new posts from firehose', {
      count: ops.posts.creates.length,
      communityMembersCount: SWARM_COMMUNITY_MEMBERS.length,
    })
    
    // Enhanced logging: Log community members list for verification
    logger.debug('Community members list', {
      members: SWARM_COMMUNITY_MEMBERS
    })

    // Log all post authors for comparison
    const allAuthors = ops.posts.creates.map(post => post.author);
    logger.debug('All post authors in current batch', { authors: allAuthors });

    const swarmPostsToCreate = ops.posts.creates
      .filter((create) => {
        // Enhanced logging: Log detailed DID comparison
        const postAuthor = create.author;
        
        // Check if the author is in the community members list
        const isMember = isSwarmCommunityMember(postAuthor);
        
        // Log the comparison result for debugging
        logger.debug('Community member check', {
          author: postAuthor,
          isMember: isMember,
          inList: SWARM_COMMUNITY_MEMBERS.includes(postAuthor),
          exactMatch: SWARM_COMMUNITY_MEMBERS.some(member => member === postAuthor),
          listContains: SWARM_COMMUNITY_MEMBERS.map(member => member.includes(postAuthor))
        });
        
        if (isMember) {
          logger.info('Found post from community member', {
            author: create.author,
            uri: create.uri,
            text: create.record.text.substring(0, 50) + (create.record.text.length > 50 ? '...' : ''),
            timestamp: new Date().toISOString()
          });
        }
        
        return isMember;
      })
      .map((create) => {
        // map Swarm community posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          creator: create.author,
          indexedAt: new Date().toISOString(),
        }
      })

    logger.info('Posts from community members found', {
      count: swarmPostsToCreate.length,
      timestamp: new Date().toISOString()
    })

    // Combine posts from both feeds
    const postsToCreate = [...alfPostsToCreate, ...swarmPostsToCreate]

    if (postsToDelete.length > 0) {
      logger.info('Deleting posts', { count: postsToDelete.length })
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      logger.info('Inserting posts', {
        totalCount: postsToCreate.length,
        alfCount: alfPostsToCreate.length,
        swarmCount: swarmPostsToCreate.length,
        timestamp: new Date().toISOString()
      })
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
