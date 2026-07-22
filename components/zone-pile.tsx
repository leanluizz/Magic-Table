'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import type { CardInstance, Zone } from '@/lib/types'

interface ZonePileProps {
  label: string
  zone: Zone
  cards: CardInstance[]
  onSendTo?: (cardId: string, zone: Zone) => void
}

/**
 * Pilha de cemitério/exílio. Também é alvo de drop (data-drop-zone).
 * Clicar abre a lista para devolver cartas à mão ou ao campo.
 */
export function ZonePile({ label, zone, cards, onSendTo }: ZonePileProps) {
  const [open, setOpen] = useState(false)
  const top = cards[cards.length - 1]

  return (
    <div className="relative flex flex-col items-center gap-1">
      <button
        type="button"
        data-drop-zone={zone}
        onClick={() => cards.length > 0 && setOpen((o) => !o)}
        className="relative flex h-[92px] w-[66px] items-center justify-center rounded-md border-2 border-dashed border-felt-border bg-black/20 transition-colors hover:border-primary/60"
        aria-label={`${label}: ${cards.length} cartas`}
      >
        {top ? (
          <img
            src={top.image || '/placeholder.svg'}
            alt={top.name}
            width={62}
            height={86}
            draggable={false}
            className="pointer-events-none h-auto w-full rounded-[6%] opacity-90"
          />
        ) : (
          <span className="pointer-events-none px-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        )}
        {cards.length > 0 && (
          <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {cards.length}
          </span>
        )}
      </button>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>

      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-popover p-2 shadow-xl">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-semibold">{label}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Fechar
            </button>
          </div>
          <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {[...cards].reverse().map((card) => (
              <li
                key={card.id}
                className="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent"
              >
                <span className="min-w-0 flex-1 truncate">{card.name}</span>
                <button
                  type="button"
                  onClick={() => onSendTo?.(card.id, 'hand')}
                  className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] hover:bg-primary hover:text-primary-foreground"
                >
                  Mão
                </button>
                <button
                  type="button"
                  onClick={() => onSendTo?.(card.id, 'battlefield')}
                  className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] hover:bg-primary hover:text-primary-foreground"
                >
                  Campo
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
