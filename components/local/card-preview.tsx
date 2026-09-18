'use client'

import { createPortal } from 'react-dom'
import { useRef, useState, ReactNode, useCallback, useEffect } from 'react'
import type { CardInstance } from '@/lib/types'

interface CardPreviewProps {
  card: CardInstance
  children: ReactNode
}

export function CardPreview({ card, children }: CardPreviewProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [side, setSide] = useState<'left' | 'right'>('right')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportW = window.innerWidth
    // Se tiver mais espaço à direita, abre à direita; senão à esquerda
    setSide(rect.left > viewportW / 2 ? 'left' : 'right')
    setVisible(true)
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  const scheduleShow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(show, 150)
  }, [show])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const imgSrc = card.image || '/placeholder.svg'
  const IMG_W = 380
  const IMG_H = Math.round(IMG_W * 1.39)

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        style={{ display: 'contents' }}
      >
        {children}
      </div>

      {visible && typeof window !== 'undefined' && createPortal(
        <CardFloatingPanel
          imgSrc={imgSrc}
          cardName={card.name}
          triggerRef={triggerRef}
          side={side}
          imgW={IMG_W}
          imgH={IMG_H}
          onMouseLeave={hide}
        />,
        document.body,
      )}
    </>
  )
}

// ─── Painel flutuante ─────────────────────────────────────────────────────────

interface PanelProps {
  imgSrc: string
  cardName: string
  triggerRef: React.RefObject<HTMLDivElement | null>
  side: 'left' | 'right'
  imgW: number
  imgH: number
  onMouseLeave: () => void
}

const PANEL_PAD = 16   // padding interno
const PANEL_GAP = 20   // distância horizontal da carta original
const PANEL_W = 380 + PANEL_PAD * 2

function CardFloatingPanel({ imgSrc, cardName, triggerRef, side, imgW, imgH, onMouseLeave }: PanelProps) {
  const panelH = imgH + PANEL_PAD * 2

  // Calcula posição baseada no trigger
  const rect = triggerRef.current?.getBoundingClientRect()
  if (!rect) return null

  const viewportH = window.innerHeight
  const viewportW = window.innerWidth

  // Vertical: centraliza no trigger, mas mantém dentro da tela
  let top = rect.top + rect.height / 2 - panelH / 2
  top = Math.max(12, Math.min(viewportH - panelH - 12, top))

  // Horizontal: esquerda ou direita do trigger
  let left = side === 'right'
    ? rect.right + PANEL_GAP
    : rect.left - PANEL_W - PANEL_GAP

  left = Math.max(12, Math.min(viewportW - PANEL_W - 12, left))

  return (
    <div
      onMouseLeave={onMouseLeave}
      className="pointer-events-none fixed z-[9999]"
      style={{
        left,
        top,
        width: PANEL_W,
        height: panelH,
        animation: 'card-panel-in 0.2s cubic-bezier(0.34, 1.4, 0.64, 1) forwards',
      }}
      aria-hidden="true"
    >
      {/* Painel com glassmorphism */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 18,
          background: 'rgba(10, 12, 20, 0.82)',
          backdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255,255,255,0.10)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: PANEL_PAD,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={cardName}
          width={imgW}
          height={imgH}
          draggable={false}
          style={{
            width: imgW,
            height: imgH,
            borderRadius: '4.5%',
            display: 'block',
            objectFit: 'cover',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
          }}
        />
      </div>

      <style>{`
        @keyframes card-panel-in {
          from {
            opacity: 0;
            transform: scale(0.82) translateX(${side === 'right' ? '-24px' : '24px'});
          }
          to {
            opacity: 1;
            transform: scale(1) translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
