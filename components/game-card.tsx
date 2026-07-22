'use client'

/* eslint-disable @next/next/no-img-element */

import type { CardInstance } from '@/lib/types'

export const SEAT_COLORS = ['#d4a843', '#6db3dd', '#d97676', '#82cf93']

interface GameCardProps {
  card: CardInstance
  seatColor?: string
  width?: number
  dimmed?: boolean
}

export function GameCard({ card, seatColor, width = 88, dimmed }: GameCardProps) {
  return (
    <div
      className="relative select-none transition-transform duration-150"
      style={{
        width,
        transform: card.tapped ? 'rotate(90deg)' : undefined,
        opacity: dimmed ? 0.35 : 1,
      }}
    >
      <img
        src={card.image || '/placeholder.svg'}
        alt={card.name}
        width={width}
        height={Math.round(width * 1.39)}
        draggable={false}
        className="pointer-events-none block h-auto w-full rounded-[6%] shadow-md"
      />
      {seatColor && (
        <span
          aria-hidden="true"
          className="absolute -bottom-1 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: seatColor }}
        />
      )}
    </div>
  )
}

export function CardBack({ width = 88 }: { width?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-md border-2 border-primary/40 bg-secondary shadow-md"
      style={{ width, height: Math.round(width * 1.39) }}
      aria-hidden="true"
    >
      <div className="flex h-3/5 w-3/5 items-center justify-center rounded-full border border-primary/30">
        <span className="font-mono text-lg font-bold text-primary/60">M</span>
      </div>
    </div>
  )
}
