'use client'
import { useEffect, useState } from 'react'

interface ConfettiProps {
  active: boolean
  reducedMotion?: boolean
}

export function Confetti({ active, reducedMotion }: ConfettiProps) {
  const [pieces, setPieces] = useState<
    { id: number; x: number; color: string; delay: number; size: number }[]
  >([])

  useEffect(() => {
    if (active && !reducedMotion) {
      setPieces(
        Array.from({ length: 48 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          color: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][i % 6],
          delay: Math.random() * 0.8,
          size: 6 + Math.random() * 8,
        })),
      )
    } else {
      setPieces([])
    }
  }, [active, reducedMotion])

  if (!pieces.length) return null

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0)    rotate(0deg);   opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 999,
          overflow: 'hidden',
        }}
      >
        {pieces.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: -20,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: 2,
              animation: `confettiFall 1.8s ease-in ${p.delay}s forwards`,
            }}
          />
        ))}
      </div>
    </>
  )
}
