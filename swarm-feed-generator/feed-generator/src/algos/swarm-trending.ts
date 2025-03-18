import { AppContext } from '../config'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { SWARM_COMMUNITY_MEMBERS } from '../swarm-community-members'
import { logger } from '../util/logger'

// max 15 chars
export const shortname = 'swarm-trending'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  const { limit, cursor } = params
  const db = ctx.db

  logger.info('Trending feed request received', {
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
    // For trending posts, we want to prioritize recent posts (last week)
    // In a real implementation, we would consider engagement metrics like likes, reposts, etc.
    // For now, we'll just use recency as a simple proxy for trending
    
    // Calculate a date one week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();
    
    logger.debug('Time window for trending posts', {
      oneWeekAgo: oneWeekAgoStr,
      current: new Date().toISOString()
    });

    let builder = db
      .selectFrom('post')
      .where('creator', 'in', memberDids)
      // Only include posts from the last week
      .where('indexedAt', '>=', oneWeekAgoStr)
      .selectAll()
      // For a real trending algorithm, we'd order by some combination of:
      // - Engagement score (likes + reposts + replies)
      // - Recency
      // - Creator influence/reputation
      // For now, we're just sorting by recency
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

    logger.debug('Executing query for trending posts from community members')

    const res = await builder.execute()

    logger.info('Query results', { count: res.length })

    if (res.length > 0) {
      logger.debug('Sample trending posts', {
        samples: res
          .slice(0, 3)
          .map((p) => ({ uri: p.uri, creator: p.creator, indexedAt: p.indexedAt })),
      })
    } else {
      logger.warn('No trending posts found for the given criteria')

      // If no posts in the last week, fall back to most recent posts
      logger.info('Falling back to most recent posts regardless of date')
      
      const fallbackBuilder = db
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

        fallbackBuilder.where((eb) => {
          return eb.or([
            eb('indexedAt', '<', indexedAt),
            eb.and([eb('indexedAt', '=', indexedAt), eb('cid', '<', cid)]),
          ])
        })
      }
      
      const fallbackRes = await fallbackBuilder.execute()
      
      logger.info('Fallback query results', { count: fallbackRes.length })
      
      if (fallbackRes.length > 0) {
        // Use the fallback results
        const feed = fallbackRes.map((row) => ({
          post: row.uri,
        }))

        let nextCursor: string | undefined
        const last = fallbackRes.at(-1)
        if (last) {
          nextCursor = `${last.indexedAt}::${last.cid}`
        }

        return {
          cursor: nextCursor,
          feed,
        }
      } else {
        // Truly no posts available, return empty feed
        return {
          cursor: undefined,
          feed: [],
        }
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
    logger.error('Error processing trending feed request', { error: err instanceof Error ? err.message : String(err) })
    throw err
  }
} 