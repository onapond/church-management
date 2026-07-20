import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearReportDraftBackup,
  readReportDraftBackup,
  REPORT_DRAFT_BACKUP_VERSION,
  writeReportDraftBackup,
} from './reportDraftBackup'

const key = 'report-draft:test'

beforeEach(() => {
  window.localStorage.clear()
})

describe('report draft backup storage', () => {
  it('reads current-version backups', () => {
    const backup = {
      version: REPORT_DRAFT_BACKUP_VERSION,
      draftReportId: 'draft-1',
      data: { title: 'draft' },
    }

    writeReportDraftBackup(window.localStorage, key, backup)

    expect(readReportDraftBackup<typeof backup>(window.localStorage, key)).toEqual(backup)
  })

  it('removes stale backup versions instead of restoring old draft ids', () => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      draftReportId: 'already-submitted-report',
      data: { title: 'stale' },
    }))

    expect(readReportDraftBackup(window.localStorage, key)).toBeNull()
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('removes malformed backup content', () => {
    window.localStorage.setItem(key, '{')

    expect(readReportDraftBackup(window.localStorage, key)).toBeNull()
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('clears backups after final submit', () => {
    writeReportDraftBackup(window.localStorage, key, {
      version: REPORT_DRAFT_BACKUP_VERSION,
      draftReportId: 'draft-1',
    })

    clearReportDraftBackup(window.localStorage, key)

    expect(window.localStorage.getItem(key)).toBeNull()
  })
})
