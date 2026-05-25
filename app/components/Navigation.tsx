'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/prospects', label: '👥 Prospects', icon: '📋' },
    { href: '/contracts', label: '📄 Contracts', icon: '📊' },
    { href: '/subs', label: '🏗️ Subs', icon: '🏭' },
    { href: '/campaigns', label: '📧 Campaigns', icon: '✉️' },
    { href: '/analytics', label: '📈 Analytics', icon: '📊' },
    { href: '/runs', label: '⚙️ Runs', icon: '🔄' },
    { href: '/settings', label: '⚙️ Settings', icon: '🔧' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1">
          <Link href="/prospects" className="py-4 px-2 font-bold text-gray-900 hover:text-blue-600">
            🚀 Maravilla Intelligence
          </Link>

          <div className="flex-1 flex items-center gap-0 ml-8">
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
        </div>
      </div>
    </nav>
  )
}
