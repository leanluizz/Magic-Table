'use client'

import { useEffect, useRef } from 'react'
import type { ScryfallCard } from '@/lib/scryfall'

interface MenuItem {
  icon?: string
  label: string
  onClick: () => void
  variant?: 'default' | 'highlight'
}

interface CardContextMenuProps {
  card: ScryfallCard
  x: number
  y: number
  onClose: () => void
  onViewDetails: () => void
  onOpenSkinModal?: () => void
  onAddCard: () => void
}

export function CardContextMenu({
  card,
  x,
  y,
  onClose,
  onViewDetails,
  onOpenSkinModal,
  onAddCard,
}: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }, 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const menuW = 220
  const menuH = 250
  const adjustedX = Math.min(x, window.innerWidth - menuW - 8)
  const adjustedY = Math.min(y, window.innerHeight - menuH - 8)

  const ligaMagicUrl = `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(card.name)}`

  const menuItems: MenuItem[] = [
    {
      label: 'Ver detalhes',
      onClick: () => { onViewDetails(); onClose() },
    },
    {
      label: 'Trocar versão',
      onClick: () => { onOpenSkinModal?.(); onClose() },
    },
    {
      label: 'Ver no Scryfall',
      onClick: () => { window.open(`https://scryfall.com/search?q=${encodeURIComponent(`!"${card.name}"`)}&unique=cards`, '_blank'); onClose() },
    },
    {
      label: 'Comprar na Liga Magic',
      onClick: () => { window.open(ligaMagicUrl, '_blank'); onClose() },
    },
    {
      label: 'Adicionar ao deck',
      onClick: () => { onAddCard(); onClose() },
      variant: 'highlight',
    },
  ]

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Opcoes para ${card.name}`}
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        zIndex: 9999,
        width: menuW,
        animation: 'ctx-menu-in 0.15s cubic-bezier(0.34, 1.4, 0.64, 1) forwards',
      }}
    >
      <div
        style={{
          background: 'rgba(12, 14, 24, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '10px 14px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Carta
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {card.name}
          </p>
        </div>

        <div style={{ padding: '4px 0' }}>
          {menuItems.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={item.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                color: item.variant === 'highlight' ? '#818cf8' : 'rgba(255,255,255,0.8)',
                transition: 'background 0.12s, color 0.12s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.variant === 'highlight'
                  ? 'rgba(129,140,248,0.15)'
                  : 'rgba(255,255,255,0.07)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {item.icon && <span style={{ fontSize: 15, lineHeight: '1' }}>{item.icon}</span>}
              <span style={{ fontWeight: item.variant === 'highlight' ? 600 : 400 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ctx-menu-in {
          from { opacity: 0; transform: scale(0.92) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
