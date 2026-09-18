'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DeckBuilder } from '@/components/deck-builder'
import type { ClientState, DeckCard, GameAction } from '@/lib/types'

interface RoomLobbyProps {
  state: ClientState
  connected: boolean
  error: string | null
  sendAction: (action: GameAction) => Promise<void>
}

export function RoomLobby({ state, connected, error, sendAction }: RoomLobbyProps) {
  const router = useRouter()
  const [deck, setDeck] = useState<DeckCard[]>([])
  const me = state.players.find((p) => p.id === state.playerId)
  const deckSize = deck.reduce((s, c) => s + c.quantity, 0)
  const isReady = me?.ready ?? false
  const readyCount = state.players.filter((p) => p.ready).length
  const isSolo = state.players.length === 1

  async function handleDeckChange(next: DeckCard[]) {
    setDeck(next)
    await sendAction({ type: 'set-deck', deck: next })
  }

  async function handleStartSolo() {
    await sendAction({ type: 'set-deck', deck })
    await sendAction({ type: 'toggle-ready' })
    await sendAction({ type: 'start-game' })
  }

  function handleLeaveRoom() {
    router.push('/')
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSolo ? 'Mesa de teste' : 'Sala de espera'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSolo
              ? 'Modo solo — monte seu deck e inicie a partida'
              : 'Compartilhe o código com seus amigos (até 4 jogadores)'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-primary' : 'bg-destructive'}`}
            aria-hidden="true"
          />
          <span className="rounded-lg border border-border bg-card px-4 py-2 font-mono text-xl font-bold tracking-[0.3em] text-primary">
            {state.roomId}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeaveRoom}
            className="ml-2 text-muted-foreground hover:text-destructive"
            aria-label="Sair da sala"
          >
            ← Sair
          </Button>
        </div>
      </header>

      {/* Jogadores */}
      <section aria-label="Jogadores na sala" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => {
          const player = state.players[i]
          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 rounded-xl border p-4 ${player
                  ? 'border-border bg-card'
                  : 'border-dashed border-border/60 bg-transparent'
                }`}
            >
              {player ? (
                <>
                  <span className="max-w-full truncate font-semibold">
                    {player.name}
                    {player.id === state.playerId && ' (você)'}
                  </span>
                  <span
                    className={`text-xs font-medium ${player.ready ? 'text-primary' : 'text-muted-foreground'
                      }`}
                  >
                    {player.ready
                      ? `Pronto · ${player.deckCount} cartas`
                      : player.deckCount > 0
                        ? `Montando deck (${player.deckCount})`
                        : 'Montando deck...'}
                  </span>
                </>
              ) : (
                <span className="py-2 text-sm text-muted-foreground">
                  Aguardando...
                </span>
              )}
            </div>
          )
        })}
      </section>

      {/* Ações */}
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        {isSolo ? (
          <>
            <Button
              onClick={handleStartSolo}
              disabled={deckSize < 7}
              className="font-semibold"
            >
              Iniciar partida de teste
            </Button>
            <p className="text-sm text-muted-foreground">
              {deckSize < 7
                ? `Adicione ao menos 7 cartas para iniciar (${deckSize}/7)`
                : 'Pronto! Clique para iniciar a mesa de teste solo.'}
            </p>
          </>
        ) : (
          <>
            <Button
              onClick={() => sendAction({ type: 'toggle-ready' })}
              disabled={deckSize < 7}
              variant={isReady ? 'secondary' : 'default'}
              className="font-semibold"
            >
              {isReady ? 'Cancelar pronto' : 'Estou pronto'}
            </Button>
            <Button
              onClick={() => sendAction({ type: 'start-game' })}
              disabled={readyCount < 2}
              variant="outline"
            >
              Iniciar partida ({readyCount}/{state.players.length} prontos)
            </Button>
            <p className="text-sm text-muted-foreground">
              Ao iniciar, cada jogador embaralha o deck e compra 7 cartas.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="w-full text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      <DeckBuilder deck={deck} onDeckChange={handleDeckChange} disabled={isReady} />
    </main>
  )
}
