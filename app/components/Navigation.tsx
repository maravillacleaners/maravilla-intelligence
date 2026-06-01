'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/prospects', label: '👥 Prospects', icon: '📋' },
    { href: '/contracts', label: '📄 Contracts', icon: '📊' },
    { href: '/subs', label: '🏗️ Subs', icon: '🏭' },
    { href: '/suppliers/dashboard', label: '🤝 Supplier Portal', icon: '🏢' },
    { href: '/campaigns', label: '📧 Campaigns', icon: '✉️' },
    { href: '/analytics', label: '📈 Analytics', icon: '📊' },
    { href: '/runs', label: '⚙️ Runs', icon: '🔄' },
    { href: '/settings', label: '⚙️ Settings', icon: '🔧' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/prospects" className="py-4 px-2 font-bold text-gray-900 hover:text-blue-600 whitespace-nowrap">
            🚀 MI
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex flex-1 items-center gap-0 ml-8">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`py-4 px-4 text-sm font-medium border-b-2 transition ${
                  isActive(item.href)
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile nav menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-3 px-4 text-sm font-medium border-l-4 transition ${
                    isActive(item.href)
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
