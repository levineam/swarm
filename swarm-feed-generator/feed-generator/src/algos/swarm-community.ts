import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { SWARM_COMMUNITY_MEMBERS, isSwarmCommunityMember } from '../swarm-community-members'

// max 15 chars
export const shortname = 'swarm-community'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  const { limit, cursor } = params
  const db = ctx.db

  // Use SWARM_COMMUNITY_MEMBERS to filter posts from community members
  const memberDids = SWARM_COMMUNITY_MEMBERS.length > 0 
    ? SWARM_COMMUNITY_MEMBERS 
    : await db.selectFrom('post').select('creator').distinct().execute().then(rows => rows.map(row => row.creator))

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
    builder = builder
      .where(eb =>
        eb
          .where('indexedAt', '<', indexedAt)
          .orWhere(eb => eb.where('indexedAt', '=', indexedAt).where('cid', '<', cid))
      )
  }

  const res = await builder.execute()

  const feed = res.map(row => ({
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