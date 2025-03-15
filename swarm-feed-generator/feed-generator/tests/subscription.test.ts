import { FirehoseSubscriptionBase, getOpsByType } from '../src/util/subscription'
import { Commit } from '../src/lexicon/types/com/atproto/sync/subscribeRepos'

// Mock the database
const mockDb = {
  updateTable: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({}),
  selectFrom: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  executeTakeFirst: jest.fn().mockResolvedValue({ cursor: 123 }),
}

// Create a test implementation of FirehoseSubscriptionBase
class TestFirehoseSubscription extends FirehoseSubscriptionBase {
  public handleEventCalled = false
  
  constructor() {
    super(mockDb as any, 'test-service')
  }
  
  async handleEvent(): Promise<void> {
    this.handleEventCalled = true
  }
  
  // Expose protected methods for testing
  public async testUpdateCursor(cursor: number): Promise<void> {
    return this.updateCursor(cursor)
  }
  
  public async testGetCursor(): Promise<{ cursor?: number }> {
    return this.getCursor()
  }
}

describe('FirehoseSubscriptionBase', () => {
  let subscription: TestFirehoseSubscription
  
  beforeEach(() => {
    jest.clearAllMocks()
    subscription = new TestFirehoseSubscription()
  })
  
  describe('updateCursor', () => {
    it('should update the cursor in the database', async () => {
      await subscription.testUpdateCursor(456)
      
      expect(mockDb.updateTable).toHaveBeenCalledWith('sub_state')
      expect(mockDb.set).toHaveBeenCalledWith({ cursor: 456 })
      expect(mockDb.where).toHaveBeenCalledWith('service', '=', 'test-service')
      expect(mockDb.execute).toHaveBeenCalled()
    })
  })
  
  describe('getCursor', () => {
    it('should retrieve the cursor from the database', async () => {
      const result = await subscription.testGetCursor()
      
      expect(mockDb.selectFrom).toHaveBeenCalledWith('sub_state')
      expect(mockDb.selectAll).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalledWith('service', '=', 'test-service')
      expect(mockDb.executeTakeFirst).toHaveBeenCalled()
      expect(result).toEqual({ cursor: 123 })
    })
    
    it('should return an empty object if no cursor is found', async () => {
      mockDb.executeTakeFirst.mockResolvedValueOnce(null)
      
      const result = await subscription.testGetCursor()
      
      expect(result).toEqual({})
    })
  })
  
  describe('isFirehoseConnected', () => {
    it('should return the connection status', () => {
      // Default is false
      expect(subscription.isFirehoseConnected()).toBe(false)
    })
  })
  
  describe('getLastCursor', () => {
    it('should return undefined by default', () => {
      expect(subscription.getLastCursor()).toBeUndefined()
    })
  })
})

describe('getOpsByType', () => {
  it('should extract operations by type from a commit', async () => {
    // Mock a commit with operations
    const mockCommit: Partial<Commit> = {
      repo: 'did:plc:test',
      ops: [
        {
          action: 'create',
          path: 'app.bsky.feed.post/test1',
          cid: { toString: () => 'bafytest1' } as any,
        },
        {
          action: 'delete',
          path: 'app.bsky.feed.post/test2',
        },
      ],
      blocks: {
        get: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      } as any,
    }
    
    // Mock the cborToLexRecord function
    jest.mock('../src/util/subscription', () => ({
      ...jest.requireActual('../src/util/subscription'),
      cborToLexRecord: jest.fn().mockReturnValue({
        $type: 'app.bsky.feed.post',
        text: 'Test post',
      }),
    }))
    
    // This test is more of a placeholder since we can't easily mock the CBOR decoding
    // In a real test, we would need to mock the imported functions more thoroughly
    const result = await getOpsByType(mockCommit as Commit)
    
    // Just verify the structure of the result
    expect(result).toHaveProperty('posts')
    expect(result).toHaveProperty('reposts')
    expect(result).toHaveProperty('likes')
    expect(result).toHaveProperty('follows')
  })
}) 