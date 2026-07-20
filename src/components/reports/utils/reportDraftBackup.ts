export const REPORT_DRAFT_BACKUP_VERSION = 2

type VersionedReportDraftBackup = {
  version: number
}

export function readReportDraftBackup<T extends VersionedReportDraftBackup>(
  storage: Storage,
  key: string,
): T | null {
  const raw = storage.getItem(key)
  if (!raw) return null

  try {
    const backup = JSON.parse(raw) as T
    if (backup.version !== REPORT_DRAFT_BACKUP_VERSION) {
      storage.removeItem(key)
      return null
    }

    return backup
  } catch {
    storage.removeItem(key)
    return null
  }
}

export function writeReportDraftBackup<T extends VersionedReportDraftBackup>(
  storage: Storage,
  key: string,
  backup: T,
) {
  storage.setItem(key, JSON.stringify(backup))
}

export function clearReportDraftBackup(storage: Storage, key: string) {
  storage.removeItem(key)
}
