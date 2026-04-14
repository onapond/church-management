export function formatDate(dateStr: string, format: 'full' | 'short' | 'month-day' = 'short'): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return dateStr

  switch (format) {
    case 'full':
      return `${year}년 ${month + 1}월 ${day}일`
    case 'month-day':
      return `${month + 1}월 ${day}일`
    case 'short':
    default:
      return `${year}.${String(month + 1).padStart(2, '0')}.${String(day).padStart(2, '0')}`
  }
}

export function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function formatCurrency(amount: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`
}

export function getWeekNumber(dateStr: string): number {
  const parts = dateStr.split('-')
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return 1

  const date = new Date(year, month, day)
  const sundayDate = new Date(year, month, day - date.getDay())
  const jan1 = new Date(year, 0, 1)
  const jan1Day = jan1.getDay()
  const firstSunday = jan1Day === 0 ? jan1 : new Date(year, 0, 1 + (7 - jan1Day))

  const diffDays = Math.round((sundayDate.getTime() - firstSunday.getTime()) / 86400000)
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 날짜 문자열이 속한 주의 월요일~일요일 범위를 반환 (교회 주간: 월~일) */
export function getWeekBounds(dateStr: string): { start: string; end: string } {
  const parts = dateStr.split('-')
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const d = new Date(year, month, day)
  const dayOfWeek = d.getDay() // 0=일, 1=월, ..., 6=토

  // 해당 주 일요일 (주의 끝)
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek))

  // 해당 주 월요일 (주의 시작) = 일요일 - 6
  const monday = new Date(sunday)
  monday.setDate(sunday.getDate() - 6)

  return { start: toLocalDateString(monday), end: toLocalDateString(sunday) }
}

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function printHtmlInIframe(html: string): void {
  const printFrame = document.createElement('iframe')
  printFrame.style.position = 'fixed'
  printFrame.style.width = '0'
  printFrame.style.height = '0'
  document.body.appendChild(printFrame)

  const frameDoc = printFrame.contentWindow?.document
  if (frameDoc) {
    frameDoc.open()
    frameDoc.write(html)
    frameDoc.close()
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus()
        printFrame.contentWindow?.print()
      } catch (e) {
        console.error('Print error:', e)
      } finally {
        setTimeout(() => {
          if (printFrame.parentNode === document.body) {
            document.body.removeChild(printFrame)
          }
        }, 1000)
      }
    }
  }
}

export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const parts = birthDate.split('-')
  if (parts.length < 3) return null
  const birthYear = parseInt(parts[0], 10)
  const birthMonth = parseInt(parts[1], 10) - 1
  const birthDay = parseInt(parts[2], 10)
  if (!Number.isFinite(birthYear) || !Number.isFinite(birthMonth) || !Number.isFinite(birthDay)) return null
  const today = new Date()
  let age = today.getFullYear() - birthYear
  const monthDiff = today.getMonth() - birthMonth
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
    age--
  }
  return age
}
