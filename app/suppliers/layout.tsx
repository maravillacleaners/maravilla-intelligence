'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SuppliersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('supplier_token')
    setIsLoggedIn(!!token)
  }, [])

  const isPublicPage = pathname === '/suppliers/register' || pathname === '/suppliers/login'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-lg text-gray-900">
            🚀 Maravilla Network
          </Link>
          <div className="flex gap-4">
            {isLoggedIn ? (
              <>
                <Link href="/suppliers/dashboard" className="text-blue-600 hover:text-blue-800">
                  Dashboard
                </Link>
                <Link href="/suppliers/profile" className="text-blue-600 hover:text-blue-800">
                  Profile
                </Link>
                <Link href="/suppliers/opportunities" className="text-blue-600 hover:text-blue-800">
                  Opportunities
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('supplier_token')
                    setIsLoggedIn(false)
                    router.push('/suppliers/login')
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {!isPublicPage && (
                  <Link href="/suppliers/login" className="text-blue-600 hover:text-blue-800">
                    Login
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
