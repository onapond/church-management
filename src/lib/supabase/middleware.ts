import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신 (중요: getUser 호출로 세션 유효성 검증)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 로그인 필요한 페이지 보호
  const protectedPaths = ['/dashboard', '/reports', '/attendance', '/members', '/approvals', '/stats', '/users']
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  )

  // 승인 대기 페이지는 로그인 필요하지만 승인 체크 제외
  const isPendingPage = pathname === '/pending'

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // 로그인된 사용자의 승인 상태 확인
  if (user && isProtectedPath) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_approved')
      .eq('id', user.id)
      .single()

    // 미승인 사용자는 승인 대기 페이지로 리디렉션
    if (userData && !userData.is_approved) {
      const url = request.nextUrl.clone()
      url.pathname = '/pending'
      return NextResponse.redirect(url)
    }
  }

  // 승인된 사용자가 pending 페이지 접근 시 대시보드로 리디렉션
  if (user && isPendingPage) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_approved')
      .eq('id', user.id)
      .single()

    if (userData?.is_approved) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
