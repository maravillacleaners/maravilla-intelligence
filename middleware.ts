import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'maravilla-admin-2026'

function verifyAdminToken(token: string): boolean {
  return token === ADMIN_SECRET
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect API admin routes — require Authorization: Bearer <ADMIN_TOKEN>
  if (pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.next()
  }

  // Protect admin UI routes — redirect to /login if no valid admin_token cookie
  if (pathname.startsWith('/admin')) {
    const cookieToken = request.cookies.get('admin_token')?.value ?? ''

    if (!cookieToken || !verifyAdminToken(cookieToken)) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
