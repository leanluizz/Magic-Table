'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { DeckImport } from '@/components/features/deck-import'
import { searchCards, type ScryfallCard, type ScryfallCardPrint } from '@/lib/scryfall'
import type { DeckCard } from '@/lib/types'
import { CardContextMenu } from '@/components/local/card-context-menu'
import { CardDetailModal } from '@/components/local/card-detail-modal'
import { CardSkinModal } from '@/components/local/card-skin-modal'

const QUICK_SEARCHES = [
  { label: 'Terrenos básicos', query: 't:basic' },
  { label: 'Vermelhos', query: 'c:r t:instant cmc<=2' },
  { label: 'Verdes', query: 'c:g t:creature cmc<=3' },
  { label: 'Azuis', query: 'c:u o:"counter target"' },
]

interface DeckBuilderProps {
  deck: DeckCard[]
  onDeckChange: (deck: DeckCard[]) => void
  disabled?: boolean
}

interface ContextMenuState {
  card: ScryfallCard
  x: number
  y: number
}

export function DeckBuilder({ deck, onDeckChange, disabled }: DeckBuilderProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScryfallCard[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [detailCardId, setDetailCardId] = useState<{ id: string; name: string } | null>(null)
  const [skinModalCard, setSkinModalCard] = useState<ScryfallCard | null>(null)

  const handleCloseMenu = useCallback(() => setContextMenu(null), [])
  const handleCloseModal = useCallback(() => setDetailCardId(null), [])
  const handleCloseSkinModal = useCallback(() => setSkinModalCard(null), [])
  const [deckSearch, setDeckSearch] = useState('')

  function handleSelectSkin(skin: ScryfallCardPrint) {
    // Atualiza resultados da busca se a carta estiver la
    setResults((prev) =>
      prev.map((c) => (c.name === skin.name ? { ...c, id: skin.id, image: skin.image } : c)),
    )
    // Atualiza carta no deck do usuario se ja tiver adicionada
    onDeckChange(
      deck.map((c) =>
        c.name === skin.name ? { ...c, scryfallId: skin.id, image: skin.image } : c,
      ),
    )
  }

  const filteredDeck = deckSearch.trim()
    ? deck.filter((c) => c.name.toLowerCase().includes(deckSearch.toLowerCase()))
    : deck

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
        { scryfallId: card.id, name: card.name, image: card.image, quantity: 1, typeLine: card.typeLine },
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

  function incrementCard(scryfallId: string) {
    if (disabled) return
    onDeckChange(
      deck.map((c) =>
        c.scryfallId === scryfallId ? { ...c, quantity: c.quantity + 1 } : c,
      ),
    )
  }

  function setCardQuantity(scryfallId: string, quantity: number) {
    if (disabled) return
    const clamped = Math.max(1, quantity)
    onDeckChange(
      deck.map((c) =>
        c.scryfallId === scryfallId ? { ...c, quantity: clamped } : c,
      ),
    )
  }

  function removeAllCard(scryfallId: string) {
    if (disabled) return
    onDeckChange(deck.filter((c) => c.scryfallId !== scryfallId))
  }

  function handleImport(imported: DeckCard[]) {
    const merged = [...deck]
    for (const card of imported) {
      const existing = merged.find((c) => c.scryfallId === card.scryfallId)
      if (existing) {
        existing.quantity += card.quantity
      } else {
        merged.push(card)
      }
    }
    onDeckChange(merged)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Busca */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="card-search" className="text-sm font-medium">
              Buscar cartas na Scryfall
            </label>
            {/* <DeckImport onImport={handleImport} disabled={disabled} variant="default" /> */}
          </div>
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

        <div className="max-h-[520px] overflow-y-auto rounded-lg pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {results.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => addCard(card)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ card, x: e.clientX, y: e.clientY })
                }}
                disabled={disabled}
                className="group relative overflow-hidden rounded-lg border border-transparent hover:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                title={`Clique para adicionar · Botão direito para opções`}
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
      </div>

      {/* Menu contextual */}
      {contextMenu && (
        <CardContextMenu
          card={contextMenu.card}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseMenu}
          onViewDetails={() => setDetailCardId({ id: contextMenu.card.id, name: contextMenu.card.name })}
          onOpenSkinModal={() => setSkinModalCard(contextMenu.card)}
          onAddCard={() => addCard(contextMenu.card)}
        />
      )}

      {/* Modal de detalhes */}
      {detailCardId && (
        <CardDetailModal
          cardId={detailCardId.id}
          cardName={detailCardId.name}
          onClose={handleCloseModal}
        />
      )}

      {/* Modal de troca de skin */}
      {skinModalCard && (
        <CardSkinModal
          cardName={skinModalCard.name}
          currentScryfallId={skinModalCard.id}
          onClose={handleCloseSkinModal}
          onSelectSkin={handleSelectSkin}
        />
      )}

      {/* Lista do deck */}
      <aside className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Seu deck</h3>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${deckSize >= 7
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
                }`}
            >
              {deckSize} cartas
            </span>
          </div>
        </div>
        <DeckImport onImport={handleImport} disabled={disabled} />
        {/* Busca no deck */}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          </span>
          <input
            id="deck-search"
            type="text"
            value={deckSearch}
            onChange={(e) => setDeckSearch(e.target.value)}
            placeholder="Filtrar por nome..."
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filtrar cartas do deck"
          />
          {deckSearch && (
            <button
              type="button"
              onClick={() => setDeckSearch('')}
              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
              aria-label="Limpar filtro"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {deckSearch && (
          <p className="text-xs text-muted-foreground">
            {filteredDeck.length === 0
              ? 'Nenhuma carta encontrada.'
              : `${filteredDeck.length} carta${filteredDeck.length > 1 ? 's' : ''} encontrada${filteredDeck.length > 1 ? 's' : ''}`}
          </p>
        )}

        {deckSize < 7 && !deckSearch && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Adicione ao menos 7 cartas para jogar. Decks oficiais têm 60.
          </p>
        )}
        <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {filteredDeck.map((card) => (
            <li
              key={card.scryfallId}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({
                  card: {
                    id: card.scryfallId,
                    name: card.name,
                    image: card.image,
                    typeLine: '',
                    manaCost: '',
                  },
                  x: e.clientX,
                  y: e.clientY,
                })
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent cursor-pointer"
              title="Botão direito para trocar skin / ver opções"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{card.name}</span>

              {/* Controles de quantidade */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCard(card.scryfallId)}
                  disabled={disabled}
                  className="h-5 w-5 shrink-0 rounded p-0 text-xs text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`Remover 1x ${card.name}`}
                >
                  −
                </Button>
                <input
                  type="number"
                  min={1}
                  value={card.quantity}
                  onChange={(e) => setCardQuantity(card.scryfallId, Number(e.target.value))}
                  disabled={disabled}
                  className="h-5 w-8 rounded border border-input bg-background text-center font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  aria-label={`Quantidade de ${card.name}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => incrementCard(card.scryfallId)}
                  disabled={disabled}
                  className="h-5 w-5 shrink-0 rounded p-0 text-xs text-muted-foreground hover:bg-primary/15 hover:text-primary"
                  aria-label={`Adicionar 1x ${card.name}`}
                >
                  +
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAllCard(card.scryfallId)}
                  disabled={disabled}
                  className="ml-1 h-5 w-5 shrink-0 rounded p-0 text-xs text-muted-foreground/50 hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`Remover todas as cópias de ${card.name}`}
                  title={`Remover todas as cópias (${card.quantity}x)`}
                >
                  ✕
                </Button>
              </div>
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
