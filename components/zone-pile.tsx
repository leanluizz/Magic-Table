'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import type { CardInstance, Zone } from '@/lib/types'

interface ZonePileProps {
  label: string
  zone: Zone
  cards: CardInstance[]
  onSendTo?: (cardId: string, zone: Zone) => void
  onStartDragCard?: (card: CardInstance, zone: Zone, e: React.PointerEvent<HTMLElement>) => void
  shortcutKey?: string
}

/**
 * Pilha de cemitério/exílio. Também é alvo de drop (data-drop-zone).
 * Clicar abre a lista para devolver cartas à mão ou ao campo.
 * Arrastar a carta do topo permite jogá-la direto na mesa ou mão.
 */
export function ZonePile({
  label,
  zone,
  cards,
  onSendTo,
  onStartDragCard,
  shortcutKey,
}: ZonePileProps) {
  const [open, setOpen] = useState(false)
  const top = cards[cards.length - 1]

  return (
    <div className="relative flex flex-col items-center gap-1">
      <div
        data-drop-zone={zone}
        onClick={() => cards.length > 0 && setOpen((o) => !o)}
        className="relative flex h-[92px] w-[66px] cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-felt-border bg-black/20 transition-colors hover:border-primary/60"
        aria-label={`${label}: ${cards.length} cartas`}
        role="button"
        tabIndex={0}
      >
        {/* Badge de atalho de teclado sempre no topo absoluto */}
        {shortcutKey && (
          <span className="pointer-events-none absolute -left-1.5 -top-1.5 z-40 flex h-4 min-w-4 items-center justify-center rounded bg-primary px-1 font-mono text-[9px] font-extrabold text-primary-foreground shadow-md border border-primary-foreground/30">
            {shortcutKey}
          </span>
        )}
        {top ? (
          <div
            onPointerDown={(e) => {
              if (onStartDragCard) {
                e.stopPropagation()
                onStartDragCard(top, zone, e)
              }
            }}
            className="h-full w-full cursor-grab active:cursor-grabbing"
            title="Clique para ver todas · Arraste para mover a carta do topo"
          >
            <img
              src={top.image || '/placeholder.svg'}
              alt={top.name}
              width={62}
              height={86}
              draggable={false}
              className="pointer-events-none h-full w-full rounded-[6%] object-cover opacity-95"
            />
          </div>
        ) : (
          <span className="pointer-events-none px-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        )}
        {cards.length > 0 && (
          <span className="pointer-events-none absolute -right-1.5 -top-1.5 z-30 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {cards.length}
          </span>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card p-4 shadow-2xl">
            {/* Header do Modal */}
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-primary">{label}</span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {cards.length} {cards.length === 1 ? 'carta' : 'cartas'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-muted-foreground hover:bg-white/10 hover:text-foreground"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Grid com Imagens das Cartas */}
            <div className="no-scrollbar flex-1 overflow-y-auto p-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[...cards].reverse().map((card) => (
                  <div
                    key={card.id}
                    className="group relative flex flex-col items-center rounded-xl border border-border bg-background/90 p-2 transition-all hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <div className="relative mb-2 aspect-[5/7] w-full overflow-hidden rounded-lg border border-white/10">
                      <img
                        src={card.image || '/placeholder.svg'}
                        alt={card.name}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                    <span className="w-full truncate text-center text-xs font-bold text-foreground mb-2" title={card.name}>
                      {card.name}
                    </span>
                    <div className="flex w-full gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSendTo?.(card.id, 'hand')
                          if (cards.length <= 1) setOpen(false)
                        }}
                        className="flex-1 rounded-md bg-secondary px-1 py-1 text-[10px] font-bold text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-center"
                        title="Enviar para a Mão"
                      >
                        ✋ Mão
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSendTo?.(card.id, 'battlefield')
                          if (cards.length <= 1) setOpen(false)
                        }}
                        className="flex-1 rounded-md bg-secondary px-1 py-1 text-[10px] font-bold text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-center"
                        title="Enviar para o Campo de Batalha"
                      >
                        ⚔️ Campo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
