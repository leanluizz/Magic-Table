'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { searchCards, type ScryfallCard } from '@/lib/scryfall'
import type { DeckCard } from '@/lib/types'

const QUICK_SEARCHES = [
  { label: 'Terrenos básicos', query: 't:basic' },
  { label: 'Raios (vermelho)', query: 'c:r t:instant cmc<=2' },
  { label: 'Criaturas verdes', query: 'c:g t:creature cmc<=3' },
  { label: 'Contramágicas', query: 'c:u o:"counter target"' },
]

interface DeckBuilderProps {
  deck: DeckCard[]
  onDeckChange: (deck: DeckCard[]) => void
  disabled?: boolean
}

export function DeckBuilder({ deck, onDeckChange, disabled }: DeckBuilderProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScryfallCard[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const deckSize = deck.reduce((s, c) => s + c.quantity, 0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      setSearched(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const cards = await searchCards(q)
      setResults(cards.slice(0, 24))
      setSearched(true)
      setSearching(false)
    }, 450)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function addCard(card: ScryfallCard) {
    if (disabled) return
    const existing = deck.find((c) => c.scryfallId === card.id)
    if (existing) {
      onDeckChange(
        deck.map((c) =>
          c.scryfallId === card.id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      )
    } else {
      onDeckChange([
        ...deck,
        { scryfallId: card.id, name: card.name, image: card.image, quantity: 1 },
      ])
    }
  }

  function removeCard(scryfallId: string) {
    if (disabled) return
    onDeckChange(
      deck
        .map((c) =>
          c.scryfallId === scryfallId ? { ...c, quantity: c.quantity - 1 } : c,
        )
        .filter((c) => c.quantity > 0),
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Busca */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="card-search" className="text-sm font-medium">
            Buscar cartas na Scryfall
          </label>
          <input
            id="card-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Ex: "Lightning Bolt", t:creature c:g, o:flying...'
            disabled={disabled}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <div className="flex flex-wrap gap-2">
            {QUICK_SEARCHES.map((q) => (
              <button
                key={q.query}
                type="button"
                onClick={() => setQuery(q.query)}
                disabled={disabled}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {searching && (
          <p className="animate-pulse text-sm text-muted-foreground">
            Buscando cartas...
          </p>
        )}
        {!searching && searched && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma carta encontrada para essa busca.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {results.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => addCard(card)}
              disabled={disabled}
              className="group relative overflow-hidden rounded-lg border border-transparent transition-transform hover:scale-105 hover:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              title={`Adicionar ${card.name}`}
            >
              <Image
                src={card.image || '/placeholder.svg'}
                alt={card.name}
                width={244}
                height={340}
                unoptimized
                className="h-auto w-full"
              />
              <span className="absolute inset-x-0 bottom-0 bg-primary py-1 text-center text-xs font-semibold text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                + Adicionar
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista do deck */}
      <aside className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Seu deck</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              deckSize >= 7
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {deckSize} cartas
          </span>
        </div>
        {deckSize < 7 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Adicione ao menos 7 cartas para jogar. Decks oficiais têm 60.
          </p>
        )}
        <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {deck.map((card) => (
            <li
              key={card.scryfallId}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="w-6 shrink-0 text-center font-mono text-xs text-primary">
                {card.quantity}x
              </span>
              <span className="min-w-0 flex-1 truncate">{card.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCard(card.scryfallId)}
                disabled={disabled}
                className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remover ${card.name}`}
              >
                −
              </Button>
            </li>
          ))}
        </ul>
        {deck.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma carta ainda. Busque e clique para adicionar.
          </p>
        )}
      </aside>
    </div>
  )
}
