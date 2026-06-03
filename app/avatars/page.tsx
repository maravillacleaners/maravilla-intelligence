'use client'

import dynamic from 'next/dynamic'

const AvatarMap = dynamic(() => import('./avatar-map').then(m => ({ default: m.AvatarMap })), { ssr: false })

export default function Page() {
  return <AvatarMap />
}
