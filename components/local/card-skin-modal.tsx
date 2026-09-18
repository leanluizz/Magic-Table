'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { getCardPrints, type ScryfallCardPrint } from '@/lib/scryfall'

interface CardSkinModalProps {
  cardName: string
  currentScryfallId?: string
  onClose: () => void
  onSelectSkin: (skin: ScryfallCardPrint) => void
}

export function CardSkinModal({
  cardName,
  currentScryfallId,
  onClose,
  onSelectSkin,
}: CardSkinModalProps) {
  const [prints, setPrints] = useState<ScryfallCardPrint[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLegacyOnly, setFilterLegacyOnly] = useState(false)

  useEffect(() => {
    setLoading(true)
    getCardPrints(cardName).then((data) => {
      setPrints(data)
      setLoading(false)
    })
  }, [cardName])

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  if (typeof window === 'undefined') return null

  const legacyPrints = prints.filter((p) => p.isLegacyFrame)
  const displayedPrints = filterLegacyOnly ? legacyPrints : prints

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Trocar skin de ${cardName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        animation: 'modal-bg-in 0.2s ease forwards',
        padding: 16,
      }}
    >
      <div
        style={{
          position: 'relative',
          background: 'rgba(12, 14, 26, 0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
          width: '100%',
          maxWidth: 900,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modal-in 0.22s cubic-bezier(0.34,1.4,0.64,1) forwards',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🎨</span> Trocar Skin / Edição
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Selecione a versão/arte desejada para <strong style={{ color: '#fff' }}>{cardName}</strong>
            </p>
          </div>

          {/* Filtro Legacy */}
          {legacyPrints.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterLegacyOnly(!filterLegacyOnly)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: filterLegacyOnly ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                background: filterLegacyOnly ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                color: filterLegacyOnly ? '#fbbf24' : 'rgba(255,255,255,0.8)',
                transition: 'all 0.15s',
              }}
            >
              📜 Legacy / Retro Frame ({legacyPrints.length})
            </button>
          )}

          {/* Fechar */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            style={{
              width: 32,
              height: 32,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'rgba(255,255,255,0.5)', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', animation: 'spin 0.7s linear infinite' }} />
              <p style={{ margin: 0, fontSize: 14 }}>Buscando edições disponíveis...</p>
            </div>
          ) : displayedPrints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
              Nenhuma versão encontrada para esse filtro.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
              {displayedPrints.map((print) => {
                const isCurrent = print.id === currentScryfallId
                return (
                  <button
                    key={print.id}
                    type="button"
                    onClick={() => {
                      onSelectSkin(print)
                      onClose()
                    }}
                    style={{
                      background: isCurrent ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.03)',
                      border: isCurrent ? '2px solid #818cf8' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      }
                    }}
                  >
                    {/* Badge Legacy / Retro */}
                    {print.isLegacyFrame && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 14,
                          right: 14,
                          zIndex: 2,
                          background: 'rgba(251,191,36,0.95)',
                          color: '#000',
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        📜 Legacy
                      </span>
                    )}

                    <div style={{ width: '100%', borderRadius: '4.5%', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                      <Image
                        src={print.image}
                        alt={print.setName}
                        width={180}
                        height={250}
                        unoptimized
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>

                    <div style={{ width: '100%' }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {print.setName}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                        {print.setCode} · {print.releasedAt.slice(0, 4)}
                      </p>
                    </div>

                    {isCurrent && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', marginTop: -2 }}>
                        ✓ Selecionada
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modal-bg-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.9) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body,
  )
}
