import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/login')) return NextResponse.next()

  const token = request.cookies.get('ivengo_token')?.value
  if (!token) {
    // Clone nextUrl (which is already basePath-aware) and only set the
    // pathname. Next.js re-applies basePath on redirect automatically, so we
    // must NOT prepend it ourselves — doing both produced /ivengo/ivengo/login
    // and bounced the user straight back to the login screen.
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
}
