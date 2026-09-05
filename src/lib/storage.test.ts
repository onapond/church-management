import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSignedStorageUrl, getStorageObjectPath } from './storage'

describe('getStorageObjectPath', () => {
  it('keeps a relative object path', () => {
    expect(getStorageObjectPath('members/member-1.jpg', 'member-photos')).toBe('members/member-1.jpg')
  })

  it('extracts paths from public and signed Supabase URLs', () => {
    expect(getStorageObjectPath(
      'https://example.supabase.co/storage/v1/object/public/member-photos/members/member-1.jpg?t=1',
      'member-photos',
    )).toBe('members/member-1.jpg')
    expect(getStorageObjectPath(
      'https://example.supabase.co/storage/v1/object/sign/report-photos/report-1/photo.jpg?token=secret',
      'report-photos',
    )).toBe('report-1/photo.jpg')
  })

  it('rejects another bucket and temporary browser URLs', () => {
    expect(getStorageObjectPath('https://example.supabase.co/storage/v1/object/public/other/a.jpg', 'member-photos')).toBeNull()
    expect(getStorageObjectPath('blob:https://example.test/id', 'member-photos')).toBeNull()
  })
})

describe('createSignedStorageUrl', () => {
  it('signs the normalized object path without persisting a signed URL', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/photo' }, error: null })
    const from = vi.fn().mockReturnValue({ createSignedUrl })
    const supabase = { storage: { from } } as unknown as SupabaseClient

    await expect(createSignedStorageUrl(supabase, 'member-photos', 'members/member-1.jpg')).resolves.toBe('https://signed.test/photo')
    expect(from).toHaveBeenCalledWith('member-photos')
    expect(createSignedUrl).toHaveBeenCalledWith('members/member-1.jpg', 3600)
  })
})
