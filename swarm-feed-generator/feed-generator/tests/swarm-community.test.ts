import { handler } from '../src/algos/swarm-community'
import { SWARM_COMMUNITY_MEMBERS } from '../src/swarm-community-members'

// Mock the database and context
const mockDb = {
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([
      {
        uri: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/test1',
        cid: 'bafytest1',
        creator: 'did:plc:ouadmsyvsfcpkxg3yyz4trqi',
        indexedAt: '2025-03-15T00:00:00.000Z',
      },
      {
        uri: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/test2',
        cid: 'bafytest2',
        creator: 'did:plc:ouadmsyvsfcpkxg3yyz4trqi',
        indexedAt: '2025-03-14T00:00:00.000Z',
      },
    ]),
    select: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    fn: {
      count: jest.fn().mockReturnValue('count'),
    },
    executeTakeFirst: jest.fn().mockResolvedValue({ count: 2 }),
  },
}

const mockCtx = {
  db: mockDb,
}

const mockParams = {
  limit: 10,
  cursor: undefined,
}

describe('Swarm Community Feed Algorithm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return posts from community members', async () => {
    const result = await handler(mockCtx as any, mockParams as any)

    // Verify the query was constructed correctly
    expect(mockDb.db.selectFrom).toHaveBeenCalledWith('post')
    expect(mockDb.db.where).toHaveBeenCalledWith(
      'creator',
      'in',
      SWARM_COMMUNITY_MEMBERS,
    )
    expect(mockDb.db.limit).toHaveBeenCalledWith(10)

    // Verify the result format
    expect(result).toHaveProperty('feed')
    expect(result).toHaveProperty('cursor')
    expect(result.feed).toHaveLength(2)
    expect(result.feed[0]).toEqual({
      post: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/test1',
    })
    expect(result.feed[1]).toEqual({
      post: 'at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.post/test2',
    })
  })

  it('should handle pagination with cursor', async () => {
    const paramsWithCursor = {
      limit: 10,
      cursor: '2025-03-15T00:00:00.000Z::bafytest1',
    }

    // Mock the where function for cursor-based filtering
    mockDb.db.where = jest.fn().mockImplementation((callback) => {
      // Call the callback with a mock eb function
      callback({
        or: jest.fn().mockReturnThis(),
        and: jest.fn().mockReturnThis(),
      })
      return mockDb.db
    })

    const result = await handler(mockCtx as any, paramsWithCursor as any)

    // Verify cursor handling
    expect(mockDb.db.where).toHaveBeenCalled()
    expect(result).toHaveProperty('feed')
  })

  it('should handle empty results', async () => {
    // Mock empty results
    mockDb.db.execute = jest.fn().mockResolvedValue([])

    const result = await handler(mockCtx as any, mockParams as any)

    // Verify empty result handling
    expect(result).toHaveProperty('feed')
    expect(result.feed).toHaveLength(0)
    expect(result.cursor).toBeUndefined()
  })
})
