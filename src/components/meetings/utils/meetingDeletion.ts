import type { SupabaseClient } from '@supabase/supabase-js'

export async function deleteMeetingBundle(supabase: SupabaseClient, meetingId: string) {
  const { data: files, error: listError } = await supabase.storage.from('meeting-pdfs').list(meetingId)

  if (listError) {
    throw new Error(`meeting pdf list failed: ${listError.message}`)
  }

  if (files?.length) {
    const paths = files.map((file) => `${meetingId}/${file.name}`)
    const { error: removeError } = await supabase.storage.from('meeting-pdfs').remove(paths)

    if (removeError) {
      throw new Error(`meeting pdf remove failed: ${removeError.message}`)
    }
  }

  const { error: deleteError } = await supabase.from('meetings').delete().eq('id', meetingId)

  if (deleteError) {
    throw new Error(`meeting delete failed: ${deleteError.message}`)
  }
}
