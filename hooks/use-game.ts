'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientState, GameAction } from '@/lib/types'

export function useGame(roomId: string, playerId: string | null) {
  const [state, setState] = useState<ClientState | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!roomId || !playerId) return
    const source = new EventSource(
      `/api/rooms/${roomId}/stream?playerId=${playerId}`,
    )
    sourceRef.current = source
    source.onopen = () => setConnected(true)
    source.onmessage = (event) => {
      try {
        setState(JSON.parse(event.data))
      } catch {
        // ignora mensagens inválidas
      }
    }
    source.onerror = () => setConnected(false)
    return () => {
      source.close()
      sourceRef.current = null
    }
  }, [roomId, playerId])

  const sendAction = useCallback(
    async (action: GameAction) => {
      if (!playerId) return
      setError(null)
      const res = await fetch(`/api/rooms/${roomId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.error ?? 'Erro ao executar ação')
      }
    },
    [roomId, playerId],
  )

  return { state, connected, error, sendAction, clearError: () => setError(null) }
}
