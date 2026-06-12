import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mockCreateClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

vi.mock('@/lib/push', () => ({
  sendPushToUsers: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 10 }),
}))

import { POST as subscribePost } from './subscribe/route'
import { POST as unsubscribePost } from './unsubscribe/route'
import { POST as sendPost } from './send/route'
import { GET as notificationsGet, PATCH as notificationsPatch } from '../notifications/route'
import { sendPushToUsers } from '@/lib/push'

type MockQueryResult = { data?: unknown; error?: unknown; count?: number }
type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: (resolve: (value: MockQueryResult) => unknown) => unknown
}

type MockApiSupabase = {
  auth: {
    getUser: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
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

function createApiSupabase(
  user: { id: string } | null,
  fromResults: MockQueryResult[],
  authError?: unknown,
): MockApiSupabase {
  let fromCallIndex = 0

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError || null,
      }),
    },
    from: vi.fn(() => {
      const result = fromResults[fromCallIndex] || { data: null, error: null }
      fromCallIndex += 1
      return createMockChain(result)
    }),
  }
}

function makePostRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makePatchRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/push/subscribe', () => {
  const validBody = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  }

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase(null, []))

    const response = await subscribePost(makePostRequest('/api/push/subscribe', validBody))
    expect(response.status).toBe(401)
  })

  it('creates a new subscription', async () => {
    mockCreateClient.mockResolvedValue(
      createApiSupabase({ id: 'user-1' }, [
        { data: null },
        { data: null, error: null },
      ]),
    )

    const response = await subscribePost(makePostRequest('/api/push/subscribe', validBody))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('updates an existing subscription', async () => {
    mockCreateClient.mockResolvedValue(
      createApiSupabase({ id: 'user-1' }, [
        { data: { id: 'sub-1' } },
        { data: null, error: null },
      ]),
    )

    const response = await subscribePost(makePostRequest('/api/push/subscribe', validBody))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 400 for invalid input', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase({ id: 'user-1' }, []))

    const response = await subscribePost(makePostRequest('/api/push/subscribe', { endpoint: 'https://fcm/1' }))
    expect(response.status).toBe(400)
  })
})

describe('POST /api/push/unsubscribe', () => {
  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase(null, []))

    const response = await unsubscribePost(makePostRequest('/api/push/unsubscribe', { endpoint: 'https://fcm/1' }))
    expect(response.status).toBe(401)
  })

  it('unsubscribes successfully', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase({ id: 'user-1' }, [{ data: null, error: null }]))

    const response = await unsubscribePost(makePostRequest('/api/push/unsubscribe', { endpoint: 'https://fcm/1' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 400 when endpoint is missing', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase({ id: 'user-1' }, []))

    const response = await unsubscribePost(makePostRequest('/api/push/unsubscribe', {}))
    expect(response.status).toBe(400)
  })
})

describe('POST /api/push/send', () => {
  const validBody = {
    userIds: ['user-1', 'user-2'],
    title: 'title',
    body: 'body',
    link: '/reports/1',
  }

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase(null, []))

    const response = await sendPost(makePostRequest('/api/push/send', validBody))
    expect(response.status).toBe(401)
  })

  it('returns 403 for member role', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase({ id: 'member-1' }, [{ data: { role: 'member' } }]))

    const response = await sendPost(makePostRequest('/api/push/send', validBody))
    expect(response.status).toBe(403)
  })

  it('allows admin role and calls sendPushToUsers', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase({ id: 'admin-1' }, [{ data: { role: 'super_admin' } }]))

    const response = await sendPost(makePostRequest('/api/push/send', validBody))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sendPushToUsers).toHaveBeenCalledWith(expect.anything(), ['user-1', 'user-2'], {
      title: 'title',
      body: 'body',
      link: '/reports/1',
    })
  })

  it('returns 400 for invalid payload', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase({ id: 'admin-1' }, [{ data: { role: 'super_admin' } }]))

    const response = await sendPost(makePostRequest('/api/push/send', { userIds: ['user-1'] }))
    expect(response.status).toBe(400)
  })
})

describe('GET /api/notifications', () => {
  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(createApiSupabase(null, []))

    const request = new NextRequest(new URL('/api/notifications', 'http://localhost'))
    const response = await notificationsGet(request)
    expect(response.status).toBe(401)
  })

  it('returns notifications and unread count', async () => {
    const notifications = [
      { id: 'n1', title: 'notification-1', is_read: false },
      { id: 'n2', title: 'notification-2', is_read: true },
    ]

    mockCreateClient.mockResolvedValue(
      createApiSupabase({ id: 'user-1' }, [
        { data: notifications },
        { count: 3 },
      ]),
    )

    const request = new NextRequest(new URL('/api/notifications?limit=20', 'http://localhost'))
    const response = await notificationsGet(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.notifications).toEqual(notifications)
    expect(json.unreadCount).toBe(3)
  })
})

describe('PATCH /api/notifications', () => {
  it('marks specific notifications as read', async () => {
    mockCreateClient.mockResolvedValue(
      createApiSupabase({ id: 'user-1' }, [
        { data: null, error: null },
        { count: 2 },
      ]),
    )

    const response = await notificationsPatch(makePatchRequest('/api/notifications', { notification_ids: ['n1', 'n2'] }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.unreadCount).toBe(2)
  })

  it('marks all notifications as read', async () => {
    mockCreateClient.mockResolvedValue(
      createApiSupabase({ id: 'user-1' }, [
        { data: null, error: null },
        { count: 0 },
      ]),
    )

    const response = await notificationsPatch(makePatchRequest('/api/notifications', { mark_all_read: true }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.unreadCount).toBe(0)
  })
})
