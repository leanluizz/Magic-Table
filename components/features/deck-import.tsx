'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getCardByName } from '@/lib/scryfall'
import type { DeckCard } from '@/lib/types'

interface DeckImportProps {
  onImport: (deck: DeckCard[]) => void
  disabled?: boolean
  variant?: 'default' | 'secondary' | 'outline'
  className?: string
}

interface ParsedLine {
  quantity: number
  name: string
}

/** Suporta formatos:
 *  "4 Lightning Bolt"
 *  "4x Lightning Bolt"
 *  "Lightning Bolt" (assume 1x)
 *  Ignora linhas vazias, comentários (//) e headers de seção (ex: "Sideboard", "// Creatures")
 */
function parseDeckList(text: string): ParsedLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !/^[A-Za-z\s]+:$/.test(line))
    .map((line) => {
      const match = line.match(/^(\d+)x?\s+(.+)$/)
      if (match) {
        return { quantity: Math.min(parseInt(match[1], 10), 99), name: match[2].trim() }
      }
      return { quantity: 1, name: line }
    })
    .filter((l) => l.name.length > 0)
}

export function DeckImport({ onImport, disabled, variant = 'default', className = '' }: DeckImportProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  function handleOpen() {
    setOpen(true)
    setText('')
    setErrors([])
    setProgress(null)
  }

  function handleClose() {
    setOpen(false)
  }

  async function handleImport() {
    const lines = parseDeckList(text)
    if (lines.length === 0) return

    setImporting(true)
    setErrors([])
    setProgress({ done: 0, total: lines.length })

    const deck: DeckCard[] = []
    const notFound: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const { quantity, name } = lines[i]
      try {
        const card = await getCardByName(name)
        if (card) {
          const existing = deck.find((c) => c.scryfallId === card.id)
          if (existing) {
            existing.quantity += quantity
          } else {
            deck.push({ scryfallId: card.id, name: card.name, image: card.image, quantity, typeLine: card.typeLine })
          }
        } else {
          notFound.push(name)
        }
      } catch {
        notFound.push(name)
      }
      setProgress({ done: i + 1, total: lines.length })
    }

    setImporting(false)

    if (notFound.length > 0) {
      setErrors(notFound)
    }

    if (deck.length > 0) {
      onImport(deck)
      if (notFound.length === 0) setOpen(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        onClick={handleOpen}
        disabled={disabled}
        className={`h-11 gap-2 px-6 text-sm font-bold shadow-md transition-all hover:scale-[1.03] active:scale-[0.98] animate-[bounce_0.6s_ease-in-out_1] ${variant === 'default'
          ? 'bg-transparent text-white border border-white/30 hover:bg-white/10'
          : ''
          } ${className}`}
      >
        <span>Importar decklist</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Importar decklist"
        >
          <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">Importar decklist</h2>
                <p className="text-xs text-muted-foreground">
                  Cole sua lista no formato: <code className="rounded bg-muted px-1">4 Lightning Bolt</code> ou <code className="rounded bg-muted px-1">4x Sol Ring</code>
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder={`4 Lightning Bolt\n4x Counterspell\n2 Sol Ring\n1 Black Lotus`}
              disabled={importing}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label="Lista de cartas"
            />

            {/* Progresso */}
            {importing && progress && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Buscando cartas na Scryfall...</span>
                  <span>{progress.done}/{progress.total}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Erros */}
            {errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-1 text-xs font-semibold text-destructive">
                  {errors.length} carta(s) não encontrada(s):
                </p>
                <ul className="flex max-h-28 flex-col gap-0.5 overflow-y-auto">
                  {errors.map((name) => (
                    <li key={name} className="font-mono text-xs text-destructive/80">
                      — {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={importing || text.trim().length === 0}
                className="flex-1 font-semibold"
              >
                {importing ? 'Importando...' : 'Importar'}
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={importing}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
