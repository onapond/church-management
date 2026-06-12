import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

const mockSendNotification = vi.fn()
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}))

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key'
process.env.VAPID_PRIVATE_KEY = 'test-private-key'

import { sendPushToUser, sendPushToUsers } from './push'

type MockQueryResult = { data?: unknown; error?: unknown }
type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: (resolve: (value: MockQueryResult) => unknown) => unknown
}

function createMockChain(result: MockQueryResult): MockChain {
  const chain = {} as MockChain
  const methods = ['select', 'insert', 'update', 'eq', 'in', 'single', 'order', 'limit']
  methods.forEach((method) => {
    chain[method] = vi.fn().mockReturnValue(chain)
  })
  chain.then = (resolve) => resolve(result)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSendNotification.mockResolvedValue({})
})

describe('sendPushToUser', () => {
  it('sends to one active subscription', async () => {
    const selectChain = createMockChain({
      data: [{ id: 'sub-1', endpoint: 'https://fcm/1', p256dh_key: 'p256dh', auth_key: 'auth' }],
    })
    const supabase = { from: vi.fn(() => selectChain) } as unknown as SupabaseClient

    await sendPushToUser(supabase, 'user-1', { title: 'title', body: 'body' })

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    expect(mockSendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://fcm/1', keys: { p256dh: 'p256dh', auth: 'auth' } },
      expect.any(String),
    )
  })

  it('sends to multiple active subscriptions', async () => {
    const selectChain = createMockChain({
      data: [
        { id: 'sub-1', endpoint: 'https://fcm/1', p256dh_key: 'p1', auth_key: 'a1' },
        { id: 'sub-2', endpoint: 'https://fcm/2', p256dh_key: 'p2', auth_key: 'a2' },
      ],
    })
    const supabase = { from: vi.fn(() => selectChain) } as unknown as SupabaseClient

    await sendPushToUser(supabase, 'user-1', { title: 'title', body: 'body' })

    expect(mockSendNotification).toHaveBeenCalledTimes(2)
  })

  it('skips when no subscriptions exist', async () => {
    const selectChain = createMockChain({ data: [] })
    const supabase = { from: vi.fn(() => selectChain) } as unknown as SupabaseClient

    await sendPushToUser(supabase, 'user-1', { title: 'title', body: 'body' })

    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('swallows database errors', async () => {
    const selectChain = createMockChain({ data: null, error: { message: 'DB error' } })
    const supabase = { from: vi.fn(() => selectChain) } as unknown as SupabaseClient

    await expect(sendPushToUser(supabase, 'user-1', { title: 'title', body: 'body' })).resolves.toBeUndefined()
    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('deactivates expired subscriptions on 410', async () => {
    mockSendNotification.mockRejectedValueOnce({ statusCode: 410 })

    const selectChain = createMockChain({
      data: [{ id: 'sub-1', endpoint: 'https://fcm/1', p256dh_key: 'p1', auth_key: 'a1' }],
    })
    const updateChain = createMockChain({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => (++callCount === 1 ? selectChain : updateChain)),
    } as unknown as SupabaseClient

    await sendPushToUser(supabase, 'user-1', { title: 'title', body: 'body' })

    expect(updateChain.update).toHaveBeenCalledWith({ is_active: false })
    expect(updateChain.in).toHaveBeenCalledWith('id', ['sub-1'])
  })

  it('deactivates expired subscriptions on 404', async () => {
    mockSendNotification.mockRejectedValueOnce({ statusCode: 404 })

    const selectChain = createMockChain({
      data: [{ id: 'sub-1', endpoint: 'https://fcm/1', p256dh_key: 'p1', auth_key: 'a1' }],
    })
    const updateChain = createMockChain({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => (++callCount === 1 ? selectChain : updateChain)),
    } as unknown as SupabaseClient

    await sendPushToUser(supabase, 'user-1', { title: 'title', body: 'body' })

    expect(updateChain.update).toHaveBeenCalledWith({ is_active: false })
    expect(updateChain.in).toHaveBeenCalledWith('id', ['sub-1'])
  })

  it('does not deactivate subscriptions on other errors', async () => {
    mockSendNotification.mockRejectedValueOnce({ statusCode: 500 })

    const selectChain = createMockChain({
      data: [{ id: 'sub-1', endpoint: 'https://fcm/1', p256dh_key: 'p1', auth_key: 'a1' }],
    })
    const supabase = { from: vi.fn(() => selectChain) } as unknown as SupabaseClient

    await sendPushToUser(supabase, 'user-1', { title: 'title', body: 'body' })

    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('adds default payload metadata', async () => {
    const selectChain = createMockChain({
      data: [{ id: 'sub-1', endpoint: 'https://fcm/1', p256dh_key: 'p1', auth_key: 'a1' }],
    })
    const supabase = { from: vi.fn(() => selectChain) } as unknown as SupabaseClient

    await sendPushToUser(supabase, 'user-1', { title: 'title', body: 'body' })

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string)
    expect(payload.link).toBe('/')
    expect(payload.icon).toBe('/icon-192.png')
  })
})

describe('sendPushToUsers', () => {
  it('sends to multiple users', async () => {
    const selectChain = createMockChain({
      data: [{ id: 'sub-1', endpoint: 'https://fcm/1', p256dh_key: 'p1', auth_key: 'a1' }],
    })
    const supabase = { from: vi.fn(() => selectChain) } as unknown as SupabaseClient

    await sendPushToUsers(supabase, ['user-1', 'user-2'], { title: 'title', body: 'body' })

    expect(supabase.from).toHaveBeenCalledTimes(2)
    expect(mockSendNotification).toHaveBeenCalledTimes(2)
  })

  it('does nothing when user ids are empty', async () => {
    const supabase = { from: vi.fn() } as unknown as SupabaseClient

    await sendPushToUsers(supabase, [], { title: 'title', body: 'body' })

    expect(supabase.from).not.toHaveBeenCalled()
    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('continues on partial failure', async () => {
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount += 1
        if (callCount === 1) {
          return createMockChain({
            data: [{ id: 'sub-1', endpoint: 'https://fcm/1', p256dh_key: 'p1', auth_key: 'a1' }],
          })
        }
        return createMockChain({ data: null, error: { message: 'DB error' } })
      }),
    } as unknown as SupabaseClient

    await expect(sendPushToUsers(supabase, ['user-1', 'user-2'], { title: 'title', body: 'body' })).resolves.toBeUndefined()
    expect(mockSendNotification).toHaveBeenCalledTimes(1)
  })
})

