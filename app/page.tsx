'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    router.push(token ? '/prospects' : '/login')
  }, [router])

  return null
}
