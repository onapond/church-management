type ChildRowWithId = {
  id?: string
}

type QueryError = {
  message?: string
}

export type SupabaseLikeClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

export interface ReplaceChildRowsOptions<TRow extends ChildRowWithId> {
  supabase: SupabaseLikeClient
  table: string
  reportId: string
  existingRows: Array<{ id: string }>
  nextRows: TRow[]
  mapRow: (row: TRow, index: number) => Record<string, unknown>
  contextLabel: string
}

function failIfError(error: QueryError | null, context: string): void {
  if (!error) return
  throw new Error(`${context}: ${error.message || 'unknown error'}`)
}

export async function replaceChildRows<TRow extends ChildRowWithId>({
  supabase,
  table,
  reportId,
  existingRows,
  nextRows,
  mapRow,
  contextLabel,
}: ReplaceChildRowsOptions<TRow>): Promise<void> {
  const nextRowIds = new Set(nextRows.map(row => row.id).filter((id): id is string => Boolean(id)))

  const insertRows = nextRows
    .filter(row => !row.id)
    .map((row, index) => mapRow(row, index))

  if (insertRows.length > 0) {
    const { error } = await supabase.from(table).insert(insertRows)
    failIfError(error, `${contextLabel} insert failed`)
  }

  for (let index = 0; index < nextRows.length; index += 1) {
    const row = nextRows[index]
    if (!row.id) continue

    const updateBuilder = supabase
      .from(table)
      .update(mapRow(row, index))
      .eq('id', row.id)
      .eq('report_id', reportId)

    const { error } = await updateBuilder
    failIfError(error, `${contextLabel} update failed`)
  }

  const deleteIds = existingRows
    .map(row => row.id)
    .filter(id => !nextRowIds.has(id))

  if (deleteIds.length > 0) {
    const deleteBuilder = supabase
      .from(table)
      .delete()
      .eq('report_id', reportId)
      .in('id', deleteIds)

    const { error } = await deleteBuilder
    failIfError(error, `${contextLabel} delete failed`)
  }
}
