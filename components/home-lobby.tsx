'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function HomeLobby() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function joinRoom(roomId: string) {
    const res = await fetch(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(json?.error ?? 'Não foi possível entrar na sala')
    }
    sessionStorage.setItem(`mtg-player-${roomId.toUpperCase()}`, json.playerId)
    router.push(`/room/${roomId.toUpperCase()}`)
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Digite seu nome primeiro')
      return
    }
    setError(null)
    setLoading('create')
    try {
      const res = await fetch('/api/rooms', { method: 'POST' })
      const json = await res.json()
      await joinRoom(json.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sala')
      setLoading(null)
    }
  }

  async function handleJoin() {
    if (!name.trim()) {
      setError('Digite seu nome primeiro')
      return
    }
    if (code.trim().length !== 4) {
      setError('O código da sala tem 4 letras')
      return
    }
    setError(null)
    setLoading('join')
    try {
      await joinRoom(code.trim().toUpperCase())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar na sala')
      setLoading(null)
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-lg">
      <div className="flex flex-col gap-2">
        <label htmlFor="player-name" className="text-sm font-medium">
          Seu nome
        </label>
        <input
          id="player-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Ex: Jace"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Button
        onClick={handleCreate}
        disabled={loading !== null}
        className="h-11 w-full text-base font-semibold"
      >
        {loading === 'create' ? 'Criando sala...' : 'Criar nova mesa'}
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          ou entre com código
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              handleJoin()
            }
          }}
          maxLength={4}
          placeholder="ABCD"
          aria-label="Código da sala"
          className="h-10 w-28 rounded-md border border-input bg-background px-3 text-center font-mono text-sm uppercase tracking-[0.3em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          onClick={handleJoin}
          disabled={loading !== null}
          variant="secondary"
          className="h-10 flex-1"
        >
          {loading === 'join' ? 'Entrando...' : 'Entrar na mesa'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
