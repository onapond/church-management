import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApprovalStatus } from '@/types/database'
import {
  createApprovalNotification,
  createNotification,
  createNotifications,
  getRecipientsByRole,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from './notifications'

type MockQueryResult = { data?: unknown; error?: unknown; count?: number }
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

type MockSupabase = {
  from: ReturnType<typeof vi.fn>
  _getChain: (table: string) => MockChain | undefined
}

function createMockSupabase(tableResults: Record<string, MockQueryResult> = {}): MockSupabase {
  const chains: Record<string, MockChain> = {}
  return {
    from: vi.fn((table: string) => {
      if (!chains[table]) {
        chains[table] = createMockChain(tableResults[table] || { data: null, error: null })
      }
      return chains[table]
    }),
    _getChain: (table: string) => chains[table],
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

describe('getRecipientsByRole', () => {
  it('returns recipient ids by role', async () => {
    const supabase = createMockSupabase({
      users: { data: [{ id: 'user-1' }, { id: 'user-2' }] },
    })

    const result = await getRecipientsByRole(supabase as unknown as SupabaseClient, 'president')
    expect(result).toEqual(['user-1', 'user-2'])
    expect(supabase.from).toHaveBeenCalledWith('users')
  })

  it('returns empty array on error', async () => {
    const supabase = createMockSupabase({
      users: { data: null, error: { message: 'DB error' } },
    })

    const result = await getRecipientsByRole(supabase as unknown as SupabaseClient, 'president')
    expect(result).toEqual([])
  })

  it('returns empty array when no users found', async () => {
    const supabase = createMockSupabase({
      users: { data: [] },
    })

    const result = await getRecipientsByRole(supabase as unknown as SupabaseClient, 'super_admin')
    expect(result).toEqual([])
  })
})

describe('createNotification', () => {
  it('creates a single notification', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null },
    })

    const result = await createNotification(supabase as unknown as SupabaseClient, {
      userId: 'user-1',
      title: 'title',
      body: 'body',
      link: '/reports/1',
      reportId: 'report-1',
    })

    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('returns false on insert error', async () => {
    const supabase = createMockSupabase({
      notifications: { error: { message: 'insert failed' } },
    })

    const result = await createNotification(supabase as unknown as SupabaseClient, {
      userId: 'user-1',
      title: 'title',
      body: 'body',
    })

    expect(result).toBe(false)
  })
})

describe('createNotifications', () => {
  it('creates notifications for multiple users', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null },
    })

    const result = await createNotifications(supabase as unknown as SupabaseClient, ['user-1', 'user-2'], {
      title: 'title',
      body: 'body',
      link: '/reports/1',
    })

    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('returns true when user list is empty', async () => {
    const supabase = createMockSupabase()

    const result = await createNotifications(supabase as unknown as SupabaseClient, [], {
      title: 'title',
      body: 'body',
    })

    expect(result).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns false on bulk insert error', async () => {
    const supabase = createMockSupabase({
      notifications: { error: { message: 'bulk insert failed' } },
    })

    const result = await createNotifications(supabase as unknown as SupabaseClient, ['user-1'], {
      title: 'title',
      body: 'body',
    })

    expect(result).toBe(false)
  })
})

describe('createApprovalNotification', () => {
  it('notifies president on submitted', async () => {
    const notificationChain = createMockChain({ data: null, error: null })
    const usersChain = createMockChain({ data: [{ id: 'president-1' }] })
    const supabase = {
      from: vi.fn((table: string) => (table === 'users' ? usersChain : notificationChain)),
    } as unknown as SupabaseClient

    const result = await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'draft',
      toStatus: 'submitted',
      departmentName: '1청년',
      reportType: 'weekly',
      authorId: 'author-1',
    })

    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('users')
    expect(supabase.from).toHaveBeenCalledWith('notifications')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/push/send'), expect.objectContaining({ method: 'POST' }))
  })

  it('notifies author on final approval', async () => {
    const chain = createMockChain({ data: null, error: null })
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient

    const result = await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'manager_approved',
      toStatus: 'final_approved',
      departmentName: '1청년',
      reportType: 'weekly',
      authorId: 'author-1',
    })

    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('notifies author on rejection', async () => {
    const chain = createMockChain({ data: null, error: null })
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient

    const result = await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'submitted',
      toStatus: 'rejected',
      departmentName: 'CU1',
      reportType: 'meeting',
      authorId: 'author-1',
    })

    expect(result).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/push/send'),
      expect.objectContaining({ body: expect.stringContaining('보고서 반려') }),
    )
  })

  it('notifies accountant on coordinator review', async () => {
    const usersChain = createMockChain({ data: [{ id: 'acc-1' }] })
    const notificationChain = createMockChain({ data: null, error: null })
    const supabase = {
      from: vi.fn((table: string) => (table === 'users' ? usersChain : notificationChain)),
    } as unknown as SupabaseClient

    await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'submitted',
      toStatus: 'coordinator_reviewed',
      departmentName: '1청년',
      reportType: 'weekly',
      authorId: 'author-1',
    })

    expect(supabase.from).toHaveBeenCalledWith('users')
  })

  it('returns true for unsupported status', async () => {
    const supabase = createMockSupabase()

    const result = await createApprovalNotification(supabase as unknown as SupabaseClient, {
      reportId: 'report-1',
      fromStatus: 'draft',
      toStatus: 'draft' as ApprovalStatus,
      departmentName: '1청년',
      reportType: 'weekly',
      authorId: 'author-1',
    })

    expect(result).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('includes department and report type in push body', async () => {
    const notificationChain = createMockChain({ data: null, error: null })
    const usersChain = createMockChain({ data: [{ id: 'pres-1' }] })
    const supabase = {
      from: vi.fn((table: string) => (table === 'users' ? usersChain : notificationChain)),
    } as unknown as SupabaseClient

    await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'draft',
      toStatus: 'submitted',
      departmentName: 'CU예배',
      reportType: 'education',
      authorId: 'author-1',
    })

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1]?.body as string) as { body: string }
    expect(body.body).toContain('CU예배')
    expect(body.body).toContain('교육')
  })
})

describe('getUnreadCount', () => {
  it('returns unread notification count', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null, count: 5 },
    })

    const result = await getUnreadCount(supabase as unknown as SupabaseClient, 'user-1')
    expect(result).toBe(5)
  })

  it('returns 0 on error', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: { message: 'query failed' }, count: undefined },
    })

    const result = await getUnreadCount(supabase as unknown as SupabaseClient, 'user-1')
    expect(result).toBe(0)
  })
})

describe('markAsRead', () => {
  it('marks specific notifications as read', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null },
    })

    const result = await markAsRead(supabase as unknown as SupabaseClient, ['noti-1', 'noti-2'], 'user-1')
    expect(result).toBe(true)
  })

  it('returns true for empty ids', async () => {
    const supabase = createMockSupabase()

    const result = await markAsRead(supabase as unknown as SupabaseClient, [], 'user-1')
    expect(result).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns false on update error', async () => {
    const supabase = createMockSupabase({
      notifications: { error: { message: 'update failed' } },
    })

    const result = await markAsRead(supabase as unknown as SupabaseClient, ['noti-1'], 'user-1')
    expect(result).toBe(false)
  })
})

describe('markAllAsRead', () => {
  it('marks all notifications as read', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null },
    })

    const result = await markAllAsRead(supabase as unknown as SupabaseClient, 'user-1')
    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('returns false on update error', async () => {
    const supabase = createMockSupabase({
      notifications: { error: { message: 'update failed' } },
    })

    const result = await markAllAsRead(supabase as unknown as SupabaseClient, 'user-1')
    expect(result).toBe(false)
  })
})

