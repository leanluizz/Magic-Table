'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { getCardById, type ScryfallCardDetail } from '@/lib/scryfall'

// ── Constantes ────────────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  common:   'rgba(200,200,200,0.8)',
  uncommon: 'rgba(99,182,220,0.9)',
  rare:     'rgba(255,215,80,0.9)',
  mythic:   'rgba(255,120,50,0.95)',
}

const LEGALITY_FORMAT = [
  { key: 'standard',  label: 'Standard' },
  { key: 'pioneer',   label: 'Pioneer'  },
  { key: 'modern',    label: 'Modern'   },
  { key: 'legacy',    label: 'Legacy'   },
  { key: 'vintage',   label: 'Vintage'  },
  { key: 'commander', label: 'Commander'},
  { key: 'pauper',    label: 'Pauper'   },
]

const LEGALITY_COLOR: Record<string, { bg: string; text: string }> = {
  legal:      { bg: 'rgba(34,197,94,0.18)',  text: '#4ade80' },
  restricted: { bg: 'rgba(251,191,36,0.18)', text: '#fbbf24' },
  banned:     { bg: 'rgba(239,68,68,0.18)',  text: '#f87171' },
  not_legal:  { bg: 'rgba(255,255,255,0.06)',text: 'rgba(255,255,255,0.3)' },
}

// ── Componente principal ──────────────────────────────────────────────────────

interface CardDetailModalProps {
  cardId: string
  cardName: string
  onClose: () => void
}

export function CardDetailModal({ cardId, cardName, onClose }: CardDetailModalProps) {
  const [detail, setDetail] = useState<ScryfallCardDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    getCardById(cardId).then((data) => {
      if (data) setDetail(data)
      else setError(true)
      setLoading(false)
    })
  }, [cardId])

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${cardName}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        animation: 'modal-bg-in 0.2s ease forwards',
        padding: 16,
      }}
    >
      <div
        style={{
          position: 'relative',
          background: 'rgba(12, 14, 26, 0.97)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.85)',
          width: '100%',
          maxWidth: 860,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modal-in 0.22s cubic-bezier(0.34,1.4,0.64,1) forwards',
        }}
      >
        {/* Botão fechar */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar modal"
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 1,
            width: 32, height: 32,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
        >
          ✕
        </button>

        {/* Conteúdo */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {loading && <LoadingState name={cardName} />}
          {error   && <ErrorState name={cardName} />}
          {detail  && !loading && <DetailContent detail={detail} />}
        </div>
      </div>

      <style>{`
        @keyframes modal-bg-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.88) translateY(20px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>,
    document.body,
  )
}

// ── Estados de loading / erro ─────────────────────────────────────────────────

function LoadingState({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60, color: 'rgba(255,255,255,0.5)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', animation: 'spin 0.7s linear infinite' }} />
      <p style={{ margin: 0, fontSize: 14 }}>Carregando {name}…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ErrorState({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 60, color: 'rgba(255,255,255,0.5)' }}>
      <span style={{ fontSize: 36 }}>⚠️</span>
      <p style={{ margin: 0, fontSize: 14 }}>Não foi possível carregar {name}.</p>
    </div>
  )
}

// ── Conteúdo do modal ─────────────────────────────────────────────────────────

function DetailContent({ detail }: { detail: ScryfallCardDetail }) {
  const rarityColor = RARITY_COLOR[detail.rarity] ?? RARITY_COLOR.common
  const ligaMagicUrl = `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(detail.name)}`

  const hasPT = detail.power !== undefined && detail.toughness !== undefined
  const hasLoyal = detail.loyalty !== undefined

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 480 }}>

      {/* Imagem */}
      <div
        style={{
          flexShrink: 0, width: 260,
          background: 'rgba(255,255,255,0.03)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        <div style={{ borderRadius: '4.5%', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.8)' }}>
          <Image
            src={detail.imageLarge}
            alt={detail.name}
            width={220}
            height={306}
            unoptimized
            style={{ display: 'block', width: 220, height: 'auto' }}
          />
        </div>
      </div>

      {/* Detalhes */}
      <div style={{ flex: 1, padding: '24px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', maxHeight: '90vh' }}>

        {/* Nome + raridade */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>{detail.name}</h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: rarityColor, textTransform: 'capitalize', border: `1px solid ${rarityColor}30` }}>
              {detail.rarity}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            {detail.setName} ({detail.setCode})
            {detail.manaCost ? ` · ${detail.manaCost}` : ''}
            {(hasPT) ? ` · ${detail.power}/${detail.toughness}` : ''}
            {hasLoyal ? ` · 🔷 ${detail.loyalty}` : ''}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>{detail.typeLine}</p>
        </div>

        {/* Oracle text */}
        {detail.oracleText && (
          <Section title="Texto">
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {detail.oracleText}
            </p>
            {detail.flavorText && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
                {detail.flavorText}
              </p>
            )}
          </Section>
        )}

        {/* Preços */}
        <Section title="Preços">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <PriceTag label="USD" value={detail.prices.usd} />
            <PriceTag label="USD Foil" value={detail.prices.usdFoil} />
            <PriceTag label="EUR" value={detail.prices.eur} />
            <PriceTag label="EUR Foil" value={detail.prices.eurFoil} />
            <PriceTag label="MTGO (TIX)" value={detail.prices.tix} />
          </div>
        </Section>

        {/* Legalidades */}
        <Section title="Legalidades">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {LEGALITY_FORMAT.map(({ key, label }) => {
              const status = detail.legalities[key] ?? 'not_legal'
              const colors = LEGALITY_COLOR[status] ?? LEGALITY_COLOR.not_legal
              return (
                <span key={key} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: colors.bg, color: colors.text, border: `1px solid ${colors.text}30` }}>
                  {label}
                </span>
              )
            })}
          </div>
        </Section>

        {/* Links */}
        <Section title="Links">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <LinkButton href={detail.scryfallUri} label="🔗 Scryfall" />
            {detail.gathererUri && <LinkButton href={detail.gathererUri} label="📖 Gatherer" />}
            <LinkButton href={ligaMagicUrl} label="🛒 Liga Magic" highlight />
          </div>
        </Section>

      </div>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      {children}
    </div>
  )
}

function PriceTag({ label, value }: { label: string; value?: string }) {
  const display = value ? `${ value}` : '—'
  const hasValue = !!value
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 72 }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: hasValue ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>{display}</span>
    </div>
  )
}

function LinkButton({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 8,
        background: highlight ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${highlight ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.10)'}`,
        color: highlight ? '#818cf8' : 'rgba(255,255,255,0.7)',
        fontSize: 12, fontWeight: 600, textDecoration: 'none',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = highlight ? 'rgba(129,140,248,0.25)' : 'rgba(255,255,255,0.10)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = highlight ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.06)' }}
    >
      {label}
    </a>
  )
}
