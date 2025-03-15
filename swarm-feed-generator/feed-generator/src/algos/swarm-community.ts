import { AppContext } from '../config'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { SWARM_COMMUNITY_MEMBERS } from '../swarm-community-members'

// max 15 chars
export const shortname = 'swarm-community'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  const { limit, cursor } = params
  const db = ctx.db

  console.log(
    `[swarm-community] Feed request with limit=${limit}, cursor=${
      cursor || 'none'
    }`,
  )
  console.log(
    `[swarm-community] Community members: ${SWARM_COMMUNITY_MEMBERS.length}`,
    SWARM_COMMUNITY_MEMBERS,
  )

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

  console.log(
    `[swarm-community] Using ${memberDids.length} member DIDs for filtering`,
  )

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

  console.log(
    `[swarm-community] Executing query for posts from community members`,
  )

  const res = await builder.execute()

  console.log(`[swarm-community] Query returned ${res.length} posts`)
  if (res.length > 0) {
    console.log(
      `[swarm-community] Sample posts:`,
      res.slice(0, 3).map((p) => ({ uri: p.uri, creator: p.creator })),
    )
  } else {
    console.log(`[swarm-community] No posts found for the given criteria`)

    // Additional diagnostic query to check if there are any posts in the database
    const totalPosts = await db
      .selectFrom('post')
      .select(db.fn.count('uri').as('count'))
      .executeTakeFirst()

    console.log(
      `[swarm-community] Total posts in database: ${totalPosts?.count || 0}`,
    )

    // Check if there are any posts from community members
    const communityPosts = await db
      .selectFrom('post')
      .where('creator', 'in', memberDids)
      .select(db.fn.count('uri').as('count'))
      .executeTakeFirst()

    console.log(
      `[swarm-community] Posts from community members: ${
        communityPosts?.count || 0
      }`,
    )
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
}
