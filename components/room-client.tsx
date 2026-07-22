'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGame } from '@/hooks/use-game'
import { RoomLobby } from '@/components/room-lobby'
import { GameTable } from '@/components/game-table'

export function RoomClient({ roomId }: { roomId: string }) {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(`mtg-player-${roomId}`)
    if (stored) setPlayerId(stored)
    else setMissing(true)
  }, [roomId])

  const { state, connected, error, sendAction } = useGame(roomId, playerId)

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
      <main className="flex min-h-svh items-center justify-center">
        <p className="animate-pulse text-muted-foreground">
          Conectando à mesa {roomId}...
        </p>
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
