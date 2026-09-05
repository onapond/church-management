import type { SupabaseClient } from '@supabase/supabase-js'

const STORAGE_OBJECT_MARKER = '/storage/v1/object/'

/**
 * DB에 남아 있는 public/signed URL과 새 상대 경로를 모두 Storage 객체 경로로 정규화한다.
 */
export function getStorageObjectPath(value: string | null | undefined, bucket: string): string | null {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, '') || null
  }

  try {
    const url = new URL(trimmed)
    const markerIndex = url.pathname.indexOf(STORAGE_OBJECT_MARKER)
    if (markerIndex === -1) return null

    const objectPart = url.pathname.slice(markerIndex + STORAGE_OBJECT_MARKER.length)
    const segments = objectPart.split('/').filter(Boolean)
    if (['public', 'sign', 'authenticated'].includes(segments[0])) segments.shift()
    if (segments.shift() !== bucket || segments.length === 0) return null

    return decodeURIComponent(segments.join('/'))
  } catch {
    return null
  }
}

export async function createSignedStorageUrl(
  supabase: SupabaseClient,
  bucket: string,
  storedValue: string | null | undefined,
  expiresIn = 60 * 60,
): Promise<string | null> {
  if (!storedValue) return null
  if (storedValue.startsWith('data:') || storedValue.startsWith('blob:')) return storedValue

  const objectPath = getStorageObjectPath(storedValue, bucket)
  if (!objectPath) return null

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresIn)
  if (error) {
    console.error(`Failed to sign ${bucket} object:`, error)
    return null
  }

  return data.signedUrl
}

export async function signPhotoRecords<T extends { photo_url: string | null }>(
  supabase: SupabaseClient,
  bucket: string,
  records: T[],
): Promise<T[]> {
  return Promise.all(records.map(async (record) => ({
    ...record,
    photo_url: await createSignedStorageUrl(supabase, bucket, record.photo_url),
  })))
}
