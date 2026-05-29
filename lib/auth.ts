import { NextRequest } from 'next/server'

export async function readAuth(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null

  const token = auth.slice(7)
  const secret = process.env.ADMIN_SECRET || 'maravilla-contractedge-admin-2026'

  if (token === secret) {
    return { user_id: 'admin', role: 'admin' }
  }

  return null
}
