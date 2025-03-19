import { Subscription } from '@atproto/xrpc-server'
import { cborToLexRecord, readCar } from '@atproto/repo'
import { BlobRef } from '@atproto/lexicon'
import { ids, lexicons } from '../lexicon/lexicons'
import { Record as PostRecord } from '../lexicon/types/app/bsky/feed/post'
import { Record as RepostRecord } from '../lexicon/types/app/bsky/feed/repost'
import { Record as LikeRecord } from '../lexicon/types/app/bsky/feed/like'
import { Record as FollowRecord } from '../lexicon/types/app/bsky/graph/follow'
import {
  Commit,
  OutputSchema as RepoEvent,
  isCommit,
} from '../lexicon/types/com/atproto/sync/subscribeRepos'
import { Database } from '../db'
import { logger } from './logger'

export abstract class FirehoseSubscriptionBase {
  public sub: Subscription<RepoEvent>
  private _connected: boolean = false
  private _lastCursor?: number
  private _connectionStartTime?: Date
  private _lastEventTime?: Date
  private _eventCount: number = 0

  constructor(public db: Database, public service: string) {
    logger.info('Initializing firehose subscription', {
      service,
      timestamp: new Date().toISOString()
    })
    
    this.sub = new Subscription({
      service: service,
      method: ids.ComAtprotoSyncSubscribeRepos,
      getParams: () => this.getCursor(),
      validate: (value: unknown) => {
        try {
          return lexicons.assertValidXrpcMessage<RepoEvent>(
            ids.ComAtprotoSyncSubscribeRepos,
            value,
          )
        } catch (err) {
          logger.error('Firehose subscription skipped invalid message', { 
            error: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString()
          })
        }
      },
    })
  }

  abstract handleEvent(evt: RepoEvent): Promise<void>

  async run(subscriptionReconnectDelay: number) {
    try {
      this._connected = true
      this._connectionStartTime = new Date()
      this._eventCount = 0
      
      logger.info('Firehose subscription started', {
        service: this.service,
        startTime: this._connectionStartTime.toISOString(),
        lastCursor: this._lastCursor
      })
      
      for await (const evt of this.sub) {
        this._lastEventTime = new Date()
        this._eventCount++
        
        await this.handleEvent(evt).catch((err) => {
          logger.error('Firehose subscription could not handle message', {
            error: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
            eventCount: this._eventCount
          })
        })
        
        // update stored cursor every 20 events or so
        if (isCommit(evt) && evt.seq % 20 === 0) {
          this._lastCursor = evt.seq
          logger.debug('Updating firehose cursor', {
            cursor: evt.seq,
            timestamp: new Date().toISOString(),
            eventCount: this._eventCount
          })
          await this.updateCursor(evt.seq)
        }
      }
    } catch (err) {
      logger.error('Firehose subscription error', {
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
        eventCount: this._eventCount,
        connectionDuration: this._connectionStartTime 
          ? `${Math.floor((Date.now() - this._connectionStartTime.getTime()) / 1000)} seconds`
          : 'unknown'
      })
      
      this._connected = false
      logger.info('Firehose subscription reconnecting', {
        delay: subscriptionReconnectDelay,
        timestamp: new Date().toISOString()
      })
      
      setTimeout(
        () => this.run(subscriptionReconnectDelay),
        subscriptionReconnectDelay,
      )
    }
  }

  isFirehoseConnected(): boolean {
    return this._connected
  }

  getLastCursor(): number | undefined {
    return this._lastCursor
  }
  
  getConnectionStats(): object {
    return {
      connected: this._connected,
      connectionStartTime: this._connectionStartTime?.toISOString(),
      lastEventTime: this._lastEventTime?.toISOString(),
      eventCount: this._eventCount,
      lastCursor: this._lastCursor,
      connectionAge: this._connectionStartTime 
        ? `${Math.floor((Date.now() - this._connectionStartTime.getTime()) / 1000)} seconds`
        : 'not connected'
    }
  }

  async updateCursor(cursor: number) {
    this._lastCursor = cursor
    
    logger.debug('Persisting firehose cursor to database', {
      cursor,
      service: this.service,
      timestamp: new Date().toISOString()
    })
    
    await this.db
      .updateTable('sub_state')
      .set({ cursor })
      .where('service', '=', this.service)
      .execute()
  }

  async getCursor(): Promise<{ cursor?: number }> {
    const res = await this.db
      .selectFrom('sub_state')
      .selectAll()
      .where('service', '=', this.service)
      .executeTakeFirst()
      
    if (res && res.cursor) {
      this._lastCursor = res.cursor
      logger.info('Retrieved firehose cursor from database', {
        cursor: res.cursor,
        service: this.service,
        timestamp: new Date().toISOString()
      })
    } else {
      logger.info('No saved firehose cursor found in database', {
        service: this.service,
        timestamp: new Date().toISOString()
      })
    }
    
    return res ? { cursor: res.cursor } : {}
  }
}

export const getOpsByType = async (evt: Commit): Promise<OperationsByType> => {
  const car = await readCar(evt.blocks)
  const opsByType: OperationsByType = {
    posts: { creates: [], deletes: [] },
    reposts: { creates: [], deletes: [] },
    likes: { creates: [], deletes: [] },
    follows: { creates: [], deletes: [] },
  }

  for (const op of evt.ops) {
    const uri = `at://${evt.repo}/${op.path}`
    const [collection] = op.path.split('/')

    if (op.action === 'update') continue // updates not supported yet

    if (op.action === 'create') {
      if (!op.cid) continue
      const recordBytes = car.blocks.get(op.cid)
      if (!recordBytes) continue
      const record = cborToLexRecord(recordBytes)
      const create = { uri, cid: op.cid.toString(), author: evt.repo }
      if (collection === ids.AppBskyFeedPost && isPost(record)) {
        opsByType.posts.creates.push({ record, ...create })
      } else if (collection === ids.AppBskyFeedRepost && isRepost(record)) {
        opsByType.reposts.creates.push({ record, ...create })
      } else if (collection === ids.AppBskyFeedLike && isLike(record)) {
        opsByType.likes.creates.push({ record, ...create })
      } else if (collection === ids.AppBskyGraphFollow && isFollow(record)) {
        opsByType.follows.creates.push({ record, ...create })
      }
    }

    if (op.action === 'delete') {
      if (collection === ids.AppBskyFeedPost) {
        opsByType.posts.deletes.push({ uri })
      } else if (collection === ids.AppBskyFeedRepost) {
        opsByType.reposts.deletes.push({ uri })
      } else if (collection === ids.AppBskyFeedLike) {
        opsByType.likes.deletes.push({ uri })
      } else if (collection === ids.AppBskyGraphFollow) {
        opsByType.follows.deletes.push({ uri })
      }
    }
  }

  return opsByType
}

type OperationsByType = {
  posts: Operations<PostRecord>
  reposts: Operations<RepostRecord>
  likes: Operations<LikeRecord>
  follows: Operations<FollowRecord>
}

type Operations<T = Record<string, unknown>> = {
  creates: CreateOp<T>[]
  deletes: DeleteOp[]
}

type CreateOp<T> = {
  uri: string
  cid: string
  author: string
  record: T
}

type DeleteOp = {
  uri: string
}

export const isPost = (obj: unknown): obj is PostRecord => {
  return isType(obj, ids.AppBskyFeedPost)
}

export const isRepost = (obj: unknown): obj is RepostRecord => {
  return isType(obj, ids.AppBskyFeedRepost)
}

export const isLike = (obj: unknown): obj is LikeRecord => {
  return isType(obj, ids.AppBskyFeedLike)
}

export const isFollow = (obj: unknown): obj is FollowRecord => {
  return isType(obj, ids.AppBskyGraphFollow)
}

const isType = (obj: unknown, nsid: string) => {
  try {
    lexicons.assertValidRecord(nsid, fixBlobRefs(obj))
    return true
  } catch (err) {
    return false
  }
}

// @TODO right now record validation fails on BlobRefs
// simply because multiple packages have their own copy
// of the BlobRef class, causing instanceof checks to fail.
// This is a temporary solution.
const fixBlobRefs = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(fixBlobRefs)
  }
  if (obj && typeof obj === 'object') {
    if (obj.constructor.name === 'BlobRef') {
      const blob = obj as BlobRef
      return new BlobRef(blob.ref, blob.mimeType, blob.size, blob.original)
    }
    return Object.entries(obj).reduce((acc, [key, val]) => {
      return Object.assign(acc, { [key]: fixBlobRefs(val) })
    }, {} as Record<string, unknown>)
  }
  return obj
}
