import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase PKCE 흐름 이메일 인증 처리
 * 이메일 템플릿: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next') ?? '/reset-password'

  // 절대 URL에서 경로만 추출, 상대 경로는 그대로 사용
  let safeNext = '/reset-password'
  try {
    if (rawNext.startsWith('/') && !rawNext.startsWith('//')) {
      safeNext = rawNext
    } else {
      const url = new URL(rawNext)
      safeNext = url.pathname
    }
  } catch {
    safeNext = '/reset-password'
  }

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // 실패 시 로그인 페이지로 (에러 메시지 포함)
  return NextResponse.redirect(`${origin}/login?error=reset_link_expired`)
}
