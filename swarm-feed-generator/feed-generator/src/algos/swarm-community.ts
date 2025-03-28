import { AppContext } from '../config'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { SWARM_COMMUNITY_MEMBERS } from '../swarm-community-members'
import { logger } from '../util/logger'

// max 15 chars
export const shortname = 'swarm-community'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  const { limit, cursor } = params
  const db = ctx.db

  logger.info('Feed request received', {
    limit,
    cursor: cursor || 'none',
  })

  logger.debug('Community members', {
    count: SWARM_COMMUNITY_MEMBERS.length,
    members: SWARM_COMMUNITY_MEMBERS,
  })

  // Use SWARM_COMMUNITY_MEMBERS to filter posts from community members
  const memberDids =
    SWARM_COMMUNITY_MEMBERS.length > 0
      ? SWARM_COMMUNITY_MEMBERS
      : await db
          .selectFrom('post')
          .select(['creator'])
          .distinct()
          .execute()
          .then((rows) => rows.map((row) => row.creator))

  logger.info('Member DIDs for filtering', {
    count: memberDids.length,
  })

  try {
    let builder = db
      .selectFrom('post')
      .where('creator', 'in', memberDids)
      .selectAll()
      .orderBy('indexedAt', 'desc')
      .orderBy('cid', 'desc')
      .limit(limit)

    if (cursor) {
      const [indexedAt, cid] = cursor.split('::')
      if (!indexedAt || !cid) {
        throw new Error('Invalid cursor')
      }

      builder = builder.where((eb) => {
        return eb.or([
          eb('indexedAt', '<', indexedAt),
          eb.and([eb('indexedAt', '=', indexedAt), eb('cid', '<', cid)]),
        ])
      })
    }

    logger.debug('Executing query for posts from community members')

    const res = await builder.execute()

    logger.info('Query results', { count: res.length })

    if (res.length > 0) {
      logger.debug('Sample posts', {
        samples: res
          .slice(0, 3)
          .map((p) => ({ uri: p.uri, creator: p.creator })),
      })
    } else {
      logger.warn('No posts found for the given criteria')

      try {
        // Additional diagnostic query to check if there are any posts in the database
        const totalPosts = await db
          .selectFrom('post')
          .select(db.fn.count('uri').as('count'))
          .executeTakeFirst()

        logger.info('Database statistics', {
          totalPosts: totalPosts?.count || 0,
        })

        // Check if there are any posts from community members
        const communityPosts = await db
          .selectFrom('post')
          .where('creator', 'in', memberDids)
          .select(db.fn.count('uri').as('count'))
          .executeTakeFirst()

        logger.info('Community posts statistics', {
          communityPosts: communityPosts?.count || 0,
        })
      } catch (err) {
        logger.error('Error running diagnostic queries', { error: err instanceof Error ? err.message : String(err) })
      }
    }

    const feed = res.map((row) => ({
      post: row.uri,
    }))

    let nextCursor: string | undefined
    const last = res.at(-1)
    if (last) {
      nextCursor = `${last.indexedAt}::${last.cid}`
    }

    return {
      cursor: nextCursor,
      feed,
    }
  } catch (err) {
    logger.error('Error processing feed request', { error: err instanceof Error ? err.message : String(err) })
    throw err
  }
}
