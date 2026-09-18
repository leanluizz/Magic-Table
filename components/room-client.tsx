'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGame } from '@/hooks/use-game'
import { RoomLobby } from '@/components/room-lobby'
import { GameTable } from '@/components/game-table'

export function RoomClient({ roomId }: { roomId: string }) {
  const router = useRouter()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(`mtg-player-${roomId}`)
    if (stored) setPlayerId(stored)
    else setMissing(true)
  }, [roomId])

  const { state, connected, error, sendAction } = useGame(roomId, playerId)

  // Dispara timeout de 10s enquanto ainda não há estado
  useEffect(() => {
    if (state) return
    const timer = setTimeout(() => setTimedOut(true), 10000)
    return () => clearTimeout(timer)
  }, [state])

  if (missing) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-medium">
          Você não está registrado nesta sala.
        </p>
        <Link
          href="/"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </main>
    )
  }

  if (!state) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4">
        {timedOut ? (
          <>
            <p className="text-sm font-semibold text-destructive">
              ⚠ Não foi possível conectar. A sala pode ter sido apagada.
            </p>
            <p className="text-xs text-muted-foreground">
              Sala: <span className="font-mono font-bold">{roomId}</span>
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-md bg-destructive px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              ← Voltar ao início
            </button>
          </>
        ) : (
          <p className="animate-pulse text-muted-foreground">
            Conectando à mesa {roomId}...
          </p>
        )}
      </main>
    )
  }

  if (state.status === 'lobby') {
    return (
      <RoomLobby
        state={state}
        connected={connected}
        error={error}
        sendAction={sendAction}
      />
    )
  }

  return (
    <GameTable
      state={state}
      connected={connected}
      error={error}
      sendAction={sendAction}
    />
  )
}
