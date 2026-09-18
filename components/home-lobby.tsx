'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface PublicRoom {
  id: string
  players: number
  status: string
  createdAt: number
}

export function HomeLobby() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState<'create' | 'join' | 'test' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])

  useEffect(() => {
    async function fetchPublicRooms() {
      try {
        const res = await fetch('/api/rooms')
        const data = await res.json()
        setPublicRooms(data)
      } catch {
        // silently ignore
      }
    }
    fetchPublicRooms()
    const interval = setInterval(fetchPublicRooms, 5000)
    return () => clearInterval(interval)
  }, [])

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
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      })
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

  async function handleJoinPublic(roomId: string) {
    if (!name.trim()) {
      setError('Digite seu nome primeiro para entrar em uma sala pública')
      return
    }
    setError(null)
    setLoading('join')
    try {
      await joinRoom(roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar na sala')
      setLoading(null)
    }
  }

  async function handleTest() {
    setError(null)
    setLoading('test')
    const testName = name.trim() || `Tester#${Math.floor(Math.random() * 9000) + 1000}`
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: false }),
      })
      const json = await res.json()
      const roomId = json.roomId as string
      const joinRes = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: testName }),
      })
      const joinJson = await joinRes.json().catch(() => null)
      if (!joinRes.ok) throw new Error(joinJson?.error ?? 'Erro ao entrar na sala de teste')
      sessionStorage.setItem(`mtg-player-${roomId.toUpperCase()}`, joinJson.playerId)
      router.push(`/room/${roomId.toUpperCase()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sala de teste')
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

      {/* Toggle público/privado */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {isPublic ? '🌐 Sala pública' : '🔒 Sala privada'}
          </span>
          <span className="text-xs text-muted-foreground">
            {isPublic
              ? 'Aparece na lista para qualquer jogador entrar'
              : 'Apenas com código da sala'}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isPublic ? 'bg-primary' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform ${
              isPublic ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
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
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
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

      {/* Salas públicas */}
      {publicRooms.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              salas abertas
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <ul className="flex flex-col gap-2">
            {publicRooms.map((room) => (
              <li
                key={room.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm font-bold tracking-widest text-primary">
                    {room.id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {room.players} / 4 jogadores
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleJoinPublic(room.id)}
                  disabled={loading !== null}
                  className="h-8 text-xs"
                >
                  Entrar
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          teste rápido
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleTest}
        disabled={loading !== null}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-amber-500/50 bg-amber-500/5 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Entrar em uma mesa de teste sem precisar de outros jogadores"
      >
        {loading === 'test' ? 'Criando mesa de teste...' : 'Entrar em mesa de teste'}
      </button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
