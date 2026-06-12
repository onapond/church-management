import type { SupabaseClient } from '@supabase/supabase-js'

export async function deleteReportBundle(supabase: SupabaseClient, reportId: string) {
  const { data: files, error: listError } = await supabase.storage.from('report-photos').list(reportId)

  if (listError) {
    throw new Error(`report photos list failed: ${listError.message}`)
  }

  if (files?.length) {
    const paths = files.map((file) => `${reportId}/${file.name}`)
    const { error: removeError } = await supabase.storage.from('report-photos').remove(paths)

    if (removeError) {
      throw new Error(`report photos remove failed: ${removeError.message}`)
    }
  }

  const { error: deleteError } = await supabase.from('weekly_reports').delete().eq('id', reportId)

  if (deleteError) {
    throw new Error(`report delete failed: ${deleteError.message}`)
  }
}
