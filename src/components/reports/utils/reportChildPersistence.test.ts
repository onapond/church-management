import { describe, expect, it } from 'vitest'
import { replaceChildRows } from './reportChildPersistence'

type TestRow = {
  id?: string
  value: string
}

type Operation =
  | { type: 'insert'; table: string; rows: Record<string, unknown>[] }
  | { type: 'update'; table: string; row: Record<string, unknown>; filters: Array<{ column: string; value: unknown }> }
  | { type: 'delete'; table: string; filters: Array<{ column: string; value: unknown }> }

function createSupabaseMock(config?: {
  insertError?: string
  updateError?: string
  deleteError?: string
}) {
  const operations: Operation[] = []

  return {
    operations,
    client: {
      from(table: string) {
        return {
          insert(rows: Record<string, unknown>[]) {
            operations.push({ type: 'insert', table, rows })
            return Promise.resolve({
              error: config?.insertError ? { message: config.insertError } : null,
            })
          },
          update(row: Record<string, unknown>) {
            const filters: Array<{ column: string; value: unknown }> = []

            const builder = {
              eq(column: string, value: unknown) {
                filters.push({ column, value })
                return builder
              },
              then(resolve: (value: { error: { message: string } | null }) => unknown) {
                operations.push({ type: 'update', table, row, filters: [...filters] })
                return Promise.resolve({
                  error: config?.updateError ? { message: config.updateError } : null,
                }).then(resolve)
              },
            }

            return builder
          },
          delete() {
            const filters: Array<{ column: string; value: unknown }> = []

            const builder = {
              eq(column: string, value: unknown) {
                filters.push({ column, value })
                return builder
              },
              in(column: string, value: unknown) {
                filters.push({ column, value })
                return builder
              },
              then(resolve: (value: { error: { message: string } | null }) => unknown) {
                operations.push({ type: 'delete', table, filters: [...filters] })
                return Promise.resolve({
                  error: config?.deleteError ? { message: config.deleteError } : null,
                }).then(resolve)
              },
            }

            return builder
          },
        }
      },
    },
  }
}

describe('replaceChildRows', () => {
  it('inserts and updates before deleting removed rows', async () => {
    const { client, operations } = createSupabaseMock()

    await replaceChildRows<TestRow>({
      supabase: client,
      table: 'report_programs',
      reportId: 'report-1',
      existingRows: [{ id: 'old-1' }, { id: 'old-2' }],
      nextRows: [
        { id: 'old-1', value: 'updated' },
        { value: 'new row' },
      ],
      contextLabel: 'report programs',
      mapRow: (row, index) => ({
        report_id: 'report-1',
        value: row.value,
        order_index: index,
      }),
    })

    expect(operations.map(operation => operation.type)).toEqual(['insert', 'update', 'delete'])
    expect(operations[0]).toMatchObject({
      type: 'insert',
      table: 'report_programs',
      rows: [{ report_id: 'report-1', value: 'new row', order_index: 0 }],
    })
    expect(operations[1]).toMatchObject({
      type: 'update',
      filters: [
        { column: 'id', value: 'old-1' },
        { column: 'report_id', value: 'report-1' },
      ],
    })
    expect(operations[2]).toMatchObject({
      type: 'delete',
      filters: [
        { column: 'report_id', value: 'report-1' },
        { column: 'id', value: ['old-2'] },
      ],
    })
  })

  it('does not delete existing rows when insert fails', async () => {
    const { client, operations } = createSupabaseMock({ insertError: 'insert failed' })

    await expect(replaceChildRows<TestRow>({
      supabase: client,
      table: 'newcomers',
      reportId: 'report-1',
      existingRows: [{ id: 'old-1' }],
      nextRows: [{ value: 'new row' }],
      contextLabel: 'newcomers',
      mapRow: row => ({ report_id: 'report-1', value: row.value }),
    })).rejects.toThrow('insert failed')

    expect(operations.map(operation => operation.type)).toEqual(['insert'])
  })

  it('does not delete removed rows when update fails', async () => {
    const { client, operations } = createSupabaseMock({ updateError: 'update failed' })

    await expect(replaceChildRows<TestRow>({
      supabase: client,
      table: 'project_content_items',
      reportId: 'report-1',
      existingRows: [{ id: 'old-1' }, { id: 'old-2' }],
      nextRows: [{ id: 'old-1', value: 'updated' }],
      contextLabel: 'project content items',
      mapRow: row => ({ report_id: 'report-1', value: row.value }),
    })).rejects.toThrow('update failed')

    expect(operations.map(operation => operation.type)).toEqual(['update'])
  })
})
