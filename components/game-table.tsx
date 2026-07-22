'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GameCard, CardBack, SEAT_COLORS } from '@/components/game-card'
import { ZonePile } from '@/components/zone-pile'
import type { CardInstance, ClientState, GameAction, Zone } from '@/lib/types'

interface GameTableProps {
  state: ClientState
  connected: boolean
  error: string | null
  sendAction: (action: GameAction) => Promise<void>
}

interface DragState {
  card: CardInstance
  from: Zone
  pointerX: number
  pointerY: number
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  moved: boolean
}

const CARD_W = 88

export function GameTable({ state, connected, error, sendAction }: GameTableProps) {
  const battlefieldRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({})

  const me = state.players.find((p) => p.id === state.playerId)
  const opponents = state.players.filter((p) => p.id !== state.playerId)

  const myHand = state.cards.filter(
    (c) => c.zone === 'hand' && c.ownerId === state.playerId,
  )
  const battlefieldCards = state.cards.filter((c) => c.zone === 'battlefield')
  const graveyardOf = (pid: string) =>
    state.cards.filter((c) => c.zone === 'graveyard' && c.ownerId === pid)
  const exileOf = (pid: string) =>
    state.cards.filter((c) => c.zone === 'exile' && c.ownerId === pid)

  const seatColor = (pid: string) => {
    const player = state.players.find((p) => p.id === pid)
    return SEAT_COLORS[(player?.seat ?? 0) % SEAT_COLORS.length]
  }

  // Limpa posições otimistas quando o estado do servidor chega
  useEffect(() => {
    setOverrides({})
  }, [state])

  const startDrag = useCallback(
    (card: CardInstance, from: Zone, e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setDrag({
        card,
        from,
        pointerX: e.clientX,
        pointerY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      })
    },
    [],
  )

  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return d
        const moved =
          d.moved ||
          Math.abs(e.clientX - d.startX) > 6 ||
          Math.abs(e.clientY - d.startY) > 6
        return { ...d, pointerX: e.clientX, pointerY: e.clientY, moved }
      })
    }

    function onUp(e: PointerEvent) {
      // Lê do ref para evitar efeitos colaterais dentro do updater do setState
      // (o StrictMode executa updaters duas vezes em dev, duplicando ações)
      const d = dragRef.current
      setDrag(null)
      if (!d) return
      // Clique simples no campo = virar/desvirar
      if (!d.moved) {
        if (d.from === 'battlefield') {
          sendAction({ type: 'toggle-tap', cardId: d.card.id })
        }
        return
      }
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-drop-zone]')
      const zone = target?.dataset.dropZone as Zone | undefined
      if (!zone) return

      if (zone === 'battlefield') {
        const rect = battlefieldRef.current?.getBoundingClientRect()
        if (!rect) return
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setOverrides((o) => ({ ...o, [d.card.id]: { x, y } }))
        sendAction({ type: 'move-card', cardId: d.card.id, zone, x, y })
      } else {
        sendAction({ type: 'move-card', cardId: d.card.id, zone })
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag, sendAction])

  const sendTo = useCallback(
    (cardId: string, zone: Zone) => {
      if (zone === 'battlefield') {
        sendAction({ type: 'move-card', cardId, zone, x: 50, y: 60 })
      } else {
        sendAction({ type: 'move-card', cardId, zone })
      }
    },
    [sendAction],
  )

  return (
    <main className="flex h-svh flex-col overflow-hidden">
      {/* Barra superior: oponentes */}
      <header className="flex items-center gap-3 overflow-x-auto border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-primary' : 'bg-destructive'}`}
            aria-label={connected ? 'Conectado' : 'Desconectado'}
          />
          <span className="font-mono text-sm font-bold tracking-widest text-primary">
            {state.roomId}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {opponents.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seatColor(p.id) }}
                aria-hidden="true"
              />
              <span className="max-w-28 truncate text-sm font-semibold">
                {p.name}
              </span>
              <span className="text-sm font-bold text-primary">{p.life} PV</span>
              <span className="text-xs text-muted-foreground">
                Mão {p.handCount} · Deck {p.libraryCount} · Cem.{' '}
                {graveyardOf(p.id).length} · Ex. {exileOf(p.id).length}
              </span>
            </div>
          ))}
          {opponents.length === 0 && (
            <span className="text-sm text-muted-foreground">
              Aguardando oponentes...
            </span>
          )}
        </div>
      </header>

      {/* Campo de batalha */}
      <div
        ref={battlefieldRef}
        data-drop-zone="battlefield"
        className="relative min-h-0 flex-1 overflow-hidden bg-felt"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, oklch(0.28 0.05 160) 0%, oklch(0.22 0.045 160) 70%, oklch(0.18 0.04 160) 100%)',
        }}
        aria-label="Campo de batalha - arraste cartas aqui"
      >
        <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-felt-border/60" />
        <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-sm uppercase tracking-[0.4em] text-foreground/10">
          Campo de batalha
        </p>

        {battlefieldCards.map((card) => {
          const pos = overrides[card.id] ?? { x: card.x, y: card.y }
          const isDragging = drag?.card.id === card.id && drag.moved
          return (
            <div
              key={card.id}
              onPointerDown={(e) => startDrag(card, 'battlefield', e)}
              className="absolute cursor-grab touch-none active:cursor-grabbing"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isDragging ? 0 : 10,
              }}
              role="button"
              tabIndex={0}
              aria-label={`${card.name}${card.tapped ? ' (virada)' : ''} - clique para virar, arraste para mover`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  sendAction({ type: 'toggle-tap', cardId: card.id })
                }
              }}
            >
              <GameCard
                card={card}
                seatColor={seatColor(card.ownerId)}
                width={CARD_W}
                dimmed={isDragging}
              />
            </div>
          )
        })}
      </div>

      {/* Barra inferior: jogador local */}
      <footer className="flex flex-wrap items-end gap-4 border-t border-border bg-card px-3 py-2">
        {/* Vida e ações */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: seatColor(state.playerId) }}
              aria-hidden="true"
            />
            <span className="max-w-32 truncate text-sm font-semibold">
              {me?.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 text-lg"
              onClick={() => sendAction({ type: 'set-life', delta: -1 })}
              aria-label="Perder 1 ponto de vida"
            >
              −
            </Button>
            <span className="w-14 text-center text-2xl font-bold text-primary">
              {me?.life}
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 text-lg"
              onClick={() => sendAction({ type: 'set-life', delta: 1 })}
              aria-label="Ganhar 1 ponto de vida"
            >
              +
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-8 font-semibold"
              onClick={() => sendAction({ type: 'draw' })}
            >
              Comprar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={() => sendAction({ type: 'mulligan' })}
            >
              Mulligan{me && me.mulligans > 0 ? ` (${me.mulligans})` : ''}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={() => sendAction({ type: 'untap-all' })}
            >
              Desvirar
            </Button>
          </div>
        </div>

        {/* Zonas: biblioteca, cemitério, exílio */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              data-drop-zone="library"
              onClick={() => sendAction({ type: 'draw' })}
              className="relative transition-transform hover:scale-105"
              aria-label={`Biblioteca: ${me?.libraryCount ?? 0} cartas. Clique para comprar.`}
            >
              <CardBack width={66} />
              <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {me?.libraryCount ?? 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => sendAction({ type: 'shuffle-library' })}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
            >
              Embaralhar
            </button>
          </div>
          <ZonePile
            label="Cemitério"
            zone="graveyard"
            cards={graveyardOf(state.playerId)}
            onSendTo={sendTo}
          />
          <ZonePile
            label="Exílio"
            zone="exile"
            cards={exileOf(state.playerId)}
            onSendTo={sendTo}
          />
        </div>

        {/* Mão */}
        <div
          data-drop-zone="hand"
          className="flex min-h-[124px] min-w-0 flex-1 items-end gap-1 overflow-x-auto rounded-lg border border-dashed border-felt-border/70 bg-black/15 px-2 py-1.5"
          aria-label={`Sua mão: ${myHand.length} cartas`}
        >
          {myHand.length === 0 && (
            <span className="w-full self-center text-center text-xs uppercase tracking-wider text-muted-foreground">
              Sua mão está vazia
            </span>
          )}
          {myHand.map((card) => {
            const isDragging = drag?.card.id === card.id && drag.moved
            return (
              <div
                key={card.id}
                onPointerDown={(e) => startDrag(card, 'hand', e)}
                className="shrink-0 cursor-grab touch-none transition-transform hover:-translate-y-2 active:cursor-grabbing"
                role="button"
                tabIndex={0}
                aria-label={`${card.name} - arraste para jogar`}
              >
                <GameCard card={card} width={78} dimmed={isDragging} />
              </div>
            )
          })}
        </div>
      </footer>

      {/* Ghost da carta arrastada */}
      {drag?.moved && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: drag.pointerX - drag.offsetX,
            top: drag.pointerY - drag.offsetY,
          }}
          aria-hidden="true"
        >
          <GameCard card={drag.card} width={CARD_W} />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="fixed bottom-36 left-1/2 z-50 -translate-x-1/2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white shadow-lg"
        >
          {error}
        </p>
      )}
    </main>
  )
}
