import {
  isCommit,
  OutputSchema as RepoEvent,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { isSwarmCommunityMember } from './swarm-community-members'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    for (const post of ops.posts.creates) {
      console.log(post.record.text)
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
    const swarmPostsToCreate = ops.posts.creates
      .filter((create) => {
        // only posts from Swarm community members
        return isSwarmCommunityMember(create.author)
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

    // Combine posts from both feeds
    const postsToCreate = [...alfPostsToCreate, ...swarmPostsToCreate]

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
