'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { GameCard, CardBack, SEAT_COLORS } from '@/components/game-card'
import { ZonePile } from '@/components/zone-pile'
import { CardPreview } from '@/components/local/card-preview'
import type { CardInstance, ClientState, GameAction, Zone } from '@/lib/types'

interface GameTableProps {
  state: ClientState
  connected: boolean
  error: string | null
  sendAction: (action: GameAction) => Promise<void>
}

interface DragState {
  card: CardInstance
  from: Zone
  pointerX: number
  pointerY: number
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  moved: boolean
}

const CARD_W = 88

export type CardCategory = 'land' | 'artifact' | 'enchantment' | 'creature'

export function getCardCategory(cardName: string, typeLine?: string): CardCategory {
  if (typeLine) {
    const tl = typeLine.toLowerCase()
    if (tl.includes('land') || tl.includes('terreno')) return 'land'
    if (tl.includes('artifact') || tl.includes('artefato')) return 'artifact'
    if (tl.includes('enchantment') || tl.includes('encantamento') || tl.includes('planeswalker')) return 'enchantment'
    if (tl.includes('creature') || tl.includes('criatura')) return 'creature'
  }

  const name = cardName.toLowerCase()

  // 1. Verificação abrangente de Terrenos (Básicas, Duals, Fetches, Utilitários, Bogs, Towers, etc.)
  const isLand = /land|terreno|swamp|mountain|forest|island|plains|pantano|montanha|floresta|ilha|planicie|fetch|dual|bramblewood|pathway|temple|garden|pool|fountain|grave|overgrown|crypt|stomping|ground|shrine|verdant|marsh|foothills|strand|delta|catacomb|tower|wastes|expanse|wilds|bog|basin|passage|plaza|hall|harbor|spire|valley|peak|cliff|orchard|thicket|coast|grove|bridge|dune|quarry|grotto|hollow|bay|fen|isle|lagoon|reef|reach|sanctuary|steppe|wood|spring|camp|outpost|court|field|ruins|wharf|meadow|heath|district|copse|glade|mire|port|fortress|monastery|bivouac|palace|citadel|crag|verge|badlands|bayou|plateau|savannah|taiga|tundra|volcanic|scrubland|trove|cavern|confluence|city of|tomb|high market|strip mine|wasteland|dryad arbor|bochuka|urborg|cabal|valakut|karn|minamo|oboro|okina|shinka|eiganjo|darksteel citadel|seat of the synod|vault of whispers|tree of tales|great furnace|ancient den|buried ruin|reliquary|evolving/i.test(name)
  if (isLand) return 'land'

  // 2. Artefatos
  const isArtifact = /artifact|artefato|sol ring|signet|talisman|mox|monolith|vault|greaves|boots|hammer|sword|stone|lotus|ring|emblem|pelt|helm|plate|shield|spear|bow|bauble|sphere|orb|lens|clasp|anvil|engine|foundry|matrix|core|dynamo|chalice|key|sculptor|cannon|welder/i.test(name)
  if (isArtifact) return 'artifact'

  // 3. Encantamentos
  const isEnchantment = /enchantment|encantamento|aura|saga|planeswalker|rhystic|remora|sylvan|doubling|purphoros|anointed|smothering|teleportation|ascendancy|anthem|presence|harmony|study|pact|curse|oath|mark|blessing|gift|seal|trial|authority/i.test(name)
  if (isEnchantment) return 'enchantment'

  return 'creature'
}

function snapToFieldZone(
  card: { name: string; typeLine?: string },
  dropX?: number,
  dropY?: number,
  existingCards: CardInstance[] = []
): { x: number; y: number } {
  const category = getCardCategory(card.name, card.typeLine)

  // Se não foi passado dropX/dropY (ex: tecla B, clique duplo ou botão "Campo"), inicia no MEIO da zona e expande pra direita:
  if (dropX === undefined || dropY === undefined) {
    const zoneCards = existingCards.filter(
      (c) => getCardCategory(c.name, c.typeLine) === category
    )
    const idx = zoneCards.length

    if (category === 'land') {
      return {
        x: Math.min(29, 17.5 + idx * 4.0),
        y: Math.min(90, 60 + (idx % 3) * 3),
      }
    }
    if (category === 'artifact') {
      const cols = 2
      const col = idx % cols
      const row = Math.floor(idx / cols)
      return {
        x: Math.min(62, 49.5 + col * 6.5),
        y: Math.min(90, 60 + row * 14),
      }
    }
    if (category === 'enchantment') {
      const cols = 2
      const col = idx % cols
      const row = Math.floor(idx / cols)
      return {
        x: Math.min(94, 82.0 + col * 6.5),
        y: Math.min(90, 60 + row * 14),
      }
    }
    // Criatura / Outros
    const cols = 5
    const col = idx % cols
    const row = Math.floor(idx / cols)
    return {
      x: Math.min(92, 50.0 + col * 9.5),
      y: Math.min(44, 14 + row * 15),
    }
  }

  // Regra Estrita de Zonas ao arrastar:
  // Terrenos -> Zona Inferior Esquerda (x: 5% a 30%, y: 55% a 92%)
  if (category === 'land') {
    return {
      x: Math.max(5, Math.min(30, dropX)),
      y: Math.max(55, Math.min(92, dropY)),
    }
  }

  // Artefatos -> Zona Inferior Centro (x: 36% a 63%, y: 55% a 92%)
  if (category === 'artifact') {
    return {
      x: Math.max(36, Math.min(63, dropX)),
      y: Math.max(55, Math.min(92, dropY)),
    }
  }

  // Encantamentos & Outros -> Zona Inferior Direita (x: 69% a 95%, y: 55% a 92%)
  if (category === 'enchantment') {
    return {
      x: Math.max(69, Math.min(95, dropX)),
      y: Math.max(55, Math.min(92, dropY)),
    }
  }

  // Criaturas & Combate -> Zona Superior (x: 5% a 95%, y: 8% a 44%)
  return {
    x: Math.max(5, Math.min(95, dropX)),
    y: Math.max(8, Math.min(44, dropY)),
  }
}

function computeAutoPositions(cards: CardInstance[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}

  const landGroups = new Map<string, CardInstance[]>()
  const artifacts: CardInstance[] = []
  const enchantments: CardInstance[] = []
  const creatures: CardInstance[] = []

  for (const card of cards) {
    const cat = getCardCategory(card.name, card.typeLine)
    if (cat === 'land') {
      const key = card.name.trim().toLowerCase()
      if (!landGroups.has(key)) landGroups.set(key, [])
      landGroups.get(key)!.push(card)
    } else if (cat === 'artifact') {
      artifacts.push(card)
    } else if (cat === 'enchantment') {
      enchantments.push(card)
    } else {
      creatures.push(card)
    }
  }

  // 1. Organiza Terrenos: começa no centro da zona de terrenos (17.5%) e expande para a direita
  let groupIndex = 0
  landGroups.forEach((stack) => {
    const baseX = Math.min(29, 17.5 + groupIndex * 5.0)
    const baseY = 60
    stack.forEach((card, stackIdx) => {
      positions[card.id] = {
        x: Math.min(29, baseX + stackIdx * 1.0),
        y: Math.min(90, baseY + stackIdx * 3.5),
      }
    })
    groupIndex++
  })

  // 2. Organiza Artefatos: começa no centro da zona de artefatos (49.5%) e expande para a direita
  artifacts.forEach((card, idx) => {
    const cols = 2
    const col = idx % cols
    const row = Math.floor(idx / cols)
    positions[card.id] = {
      x: Math.min(62, 49.5 + col * 6.5),
      y: Math.min(90, 60 + row * 14),
    }
  })

  // 3. Organiza Encantamentos: começa no centro da zona de encantamentos (82%) e expande para a direita
  enchantments.forEach((card, idx) => {
    const cols = 2
    const col = idx % cols
    const row = Math.floor(idx / cols)
    positions[card.id] = {
      x: Math.min(94, 82.0 + col * 6.5),
      y: Math.min(90, 60 + row * 14),
    }
  })

  // 4. Organiza Criaturas: começa no centro do campo (50%) e expande para a direita
  creatures.forEach((card, idx) => {
    const cols = 5
    const col = idx % cols
    const row = Math.floor(idx / cols)
    positions[card.id] = {
      x: Math.min(92, 50.0 + col * 9.5),
      y: Math.min(44, 14 + row * 15),
    }
  })

  return positions
}

export function GameTable({ state, connected, error, sendAction }: GameTableProps) {
  const router = useRouter()
  const battlefieldRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLDivElement>(null)
  const [handCardWidth, setHandCardWidth] = useState(88)
  const [handPage, setHandPage] = useState<number>(0)
  const [battlefieldScale, setBattlefieldScale] = useState(1.0)
  const [autoOrganize, setAutoOrganize] = useState<boolean>(true)
  const [editingLife, setEditingLife] = useState<string | null>(null)
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const hoveredCardIdRef = useRef<string | null>(null)
  hoveredCardIdRef.current = hoveredCardId
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({})

  // Estado de seleção Marquee (Caixa de Seleção)
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
  const marqueeRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
  marqueeRef.current = marquee

  const me = state.players.find((p) => p.id === state.playerId)
  const opponents = state.players.filter((p) => p.id !== state.playerId)

  const myHand = state.cards.filter(
    (c) => c.zone === 'hand' && c.ownerId === state.playerId,
  )
  const battlefieldCards = state.cards.filter((c) => c.zone === 'battlefield')
  const graveyardOf = (pid: string) =>
    state.cards.filter((c) => c.zone === 'graveyard' && c.ownerId === pid)
  const exileOf = (pid: string) =>
    state.cards.filter((c) => c.zone === 'exile' && c.ownerId === pid)

  const seatColor = (pid: string) => {
    const player = state.players.find((p) => p.id === pid)
    return SEAT_COLORS[(player?.seat ?? 0) % SEAT_COLORS.length]
  }

  // Ações em massa para cartas selecionadas
  const handleToggleTapSelected = useCallback(() => {
    selectedCardIds.forEach((cardId) => {
      sendAction({ type: 'toggle-tap', cardId })
    })
  }, [selectedCardIds, sendAction])

  const handleSendSelectedToHand = useCallback(() => {
    selectedCardIds.forEach((cardId) => {
      sendAction({ type: 'move-card', cardId, zone: 'hand' })
    })
    setSelectedCardIds(new Set())
  }, [selectedCardIds, sendAction])

  const handleSendSelectedToGraveyard = useCallback(() => {
    selectedCardIds.forEach((cardId) => {
      sendAction({ type: 'move-card', cardId, zone: 'graveyard' })
    })
    setSelectedCardIds(new Set())
  }, [selectedCardIds, sendAction])

  const handleSendSelectedToExile = useCallback(() => {
    selectedCardIds.forEach((cardId) => {
      sendAction({ type: 'move-card', cardId, zone: 'exile' })
    })
    setSelectedCardIds(new Set())
  }, [selectedCardIds, sendAction])

  // Eventos do Marquee Box Selection
  const handleBattlefieldPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    // Se clicou em uma carta ou botão, não ativa a caixa de seleção do fundo
    if (target.closest('[role="button"]') || target.closest('button')) {
      return
    }
    if (!e.shiftKey) {
      setSelectedCardIds(new Set())
    }
    setMarquee({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    })
  }

  useEffect(() => {
    if (!marquee) return

    function onMove(e: PointerEvent) {
      setMarquee((m) => (m ? { ...m, currentX: e.clientX, currentY: e.clientY } : null))
    }

    function onUp(e: PointerEvent) {
      const m = marqueeRef.current
      setMarquee(null)
      if (!m) return

      const left = Math.min(m.startX, m.currentX)
      const right = Math.max(m.startX, m.currentX)
      const top = Math.min(m.startY, m.currentY)
      const bottom = Math.max(m.startY, m.currentY)

      if (Math.abs(m.currentX - m.startX) > 6 || Math.abs(m.currentY - m.startY) > 6) {
        const nextSelected = new Set(e.shiftKey ? selectedCardIds : [])
        battlefieldCards.forEach((card) => {
          const cardEl = document.querySelector(`[data-card-id="${card.id}"]`)
          if (cardEl) {
            const cRect = cardEl.getBoundingClientRect()
            const intersects = !(
              cRect.right < left ||
              cRect.left > right ||
              cRect.bottom < top ||
              cRect.top > bottom
            )
            if (intersects) {
              nextSelected.add(card.id)
            }
          }
        })
        setSelectedCardIds(nextSelected)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [marquee, battlefieldCards, selectedCardIds])

  // Atualiza a organização das cartas quando o estado muda ou o modo auto-organizar é alterado
  useEffect(() => {
    if (autoOrganize) {
      setOverrides(computeAutoPositions(battlefieldCards))
    }
  }, [state, autoOrganize])

  const startDrag = useCallback(
    (card: CardInstance, from: Zone, e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setDrag({
        card,
        from,
        pointerX: e.clientX,
        pointerY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      })
    },
    [],
  )

  // Scroll do mouse para zoom no Campo de Batalha
  useEffect(() => {
    const el = battlefieldRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY < 0 ? 0.08 : -0.08
      setBattlefieldScale((s) => Math.min(2.5, Math.max(0.5, s + delta)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Scroll do mouse para zoom na Mão
  useEffect(() => {
    const el = handRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY < 0 ? 8 : -8
      setHandCardWidth((w) => Math.min(180, Math.max(60, w + delta)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Atalhos de teclado (A, S, T, G, E, Esc)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key === 'Escape') {
        setSelectedCardIds(new Set())
        return
      }

      const key = e.key.toLowerCase()
      const cardId = hoveredCardIdRef.current

      // Se houver cartas marcadas, os atalhos T, G, E, H aplicam-se a todas as marcadas!
      if (selectedCardIds.size > 0) {
        if (key === 't') {
          e.preventDefault()
          handleToggleTapSelected()
          return
        }
        if (key === 'g') {
          e.preventDefault()
          handleSendSelectedToGraveyard()
          return
        }
        if (key === 'e') {
          e.preventDefault()
          handleSendSelectedToExile()
          return
        }
        if (key === 'h') {
          e.preventDefault()
          handleSendSelectedToHand()
          return
        }
      }

      if (key === 'o') {
        e.preventDefault()
        setAutoOrganize((prev) => !prev)
        return
      }

      if (key === 'a') {
        e.preventDefault()
        sendAction({ type: 'draw' })
      } else if (key === 's') {
        e.preventDefault()
        sendAction({ type: 'shuffle-library' })
      } else if (key === 't' && cardId) {
        e.preventDefault()
        sendAction({ type: 'toggle-tap', cardId })
      } else if (key === 'g' && cardId) {
        e.preventDefault()
        sendAction({ type: 'move-card', cardId, zone: 'graveyard' })
      } else if (key === 'e' && cardId) {
        e.preventDefault()
        sendAction({ type: 'move-card', cardId, zone: 'exile' })
      } else if (key === 'h' && cardId) {
        e.preventDefault()
        sendAction({ type: 'move-card', cardId, zone: 'hand' })
      } else if (key === 'b' && cardId) {
        e.preventDefault()
        const targetCard = state.cards.find((c) => c.id === cardId)
        const pos = snapToFieldZone(targetCard ?? { name: '' }, undefined, undefined, battlefieldCards)
        sendAction({ type: 'move-card', cardId, zone: 'battlefield', x: pos.x, y: pos.y })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    sendAction,
    selectedCardIds,
    handleToggleTapSelected,
    handleSendSelectedToHand,
    handleSendSelectedToGraveyard,
    handleSendSelectedToExile,
    state.cards,
    battlefieldCards,
  ])

  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return d
        const moved =
          d.moved ||
          Math.abs(e.clientX - d.startX) > 6 ||
          Math.abs(e.clientY - d.startY) > 6
        return { ...d, pointerX: e.clientX, pointerY: e.clientY, moved }
      })
    }

    function onUp(e: PointerEvent) {
      const d = dragRef.current
      setDrag(null)
      if (!d) return
      // Clique simples no campo = virar/desvirar
      if (!d.moved) {
        if (d.from === 'battlefield') {
          sendAction({ type: 'toggle-tap', cardId: d.card.id })
        }
        return
      }
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-drop-zone]')
      const dropZoneType = target?.dataset.dropZone as Zone | undefined
      if (!dropZoneType) return

      if (dropZoneType === 'battlefield') {
        const rect = battlefieldRef.current?.getBoundingClientRect()
        if (!rect) return
        const rawX = ((e.clientX - rect.left) / rect.width) * 100
        const rawY = ((e.clientY - rect.top) / rect.height) * 100
        const { x, y } = snapToFieldZone(d.card, rawX, rawY)

        if (selectedCardIds.has(d.card.id) && selectedCardIds.size > 1) {
          const dx = x - d.card.x
          const dy = y - d.card.y
          const newOverrides: Record<string, { x: number; y: number }> = {}
          selectedCardIds.forEach((id) => {
            const targetCard = state.cards.find((c) => c.id === id)
            if (targetCard) {
              const targetPos = snapToFieldZone(targetCard, targetCard.x + dx, targetCard.y + dy)
              newOverrides[id] = targetPos
              sendAction({ type: 'move-card', cardId: id, zone: 'battlefield', x: targetPos.x, y: targetPos.y })
            }
          })
          setOverrides((o) => ({ ...o, ...newOverrides }))
        } else {
          setOverrides((o) => ({ ...o, [d.card.id]: { x, y } }))
          sendAction({ type: 'move-card', cardId: d.card.id, zone: dropZoneType, x, y })
        }
      } else {
        if (selectedCardIds.has(d.card.id) && selectedCardIds.size > 1) {
          selectedCardIds.forEach((id) => {
            sendAction({ type: 'move-card', cardId: id, zone: dropZoneType as Zone })
          })
          setSelectedCardIds(new Set())
        } else {
          sendAction({ type: 'move-card', cardId: d.card.id, zone: dropZoneType as Zone })
        }
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag, sendAction, selectedCardIds, state.cards])

  const sendTo = useCallback(
    (cardId: string, zone: Zone) => {
      if (zone === 'battlefield') {
        const card = state.cards.find((c) => c.id === cardId)
        const pos = snapToFieldZone(card ?? { name: '' }, undefined, undefined, battlefieldCards)
        sendAction({ type: 'move-card', cardId, zone, x: pos.x, y: pos.y })
      } else {
        sendAction({ type: 'move-card', cardId, zone })
      }
    },
    [sendAction, state.cards, battlefieldCards],
  )

  return (
    <main className="flex h-svh flex-col overflow-hidden">
      {/* Barra superior: oponentes */}
      <header className="flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-primary' : 'bg-destructive'}`}
            aria-label={connected ? 'Conectado' : 'Desconectado'}
          />
          <span className="font-mono text-sm font-bold tracking-widest text-primary">
            {state.roomId}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {opponents.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seatColor(p.id) }}
                aria-hidden="true"
              />
              <span className="max-w-28 truncate text-sm font-semibold">
                {p.name}
              </span>
              <span className="text-sm font-bold text-primary">{p.life} PV</span>
              <span className="text-xs text-muted-foreground">
                Mão {p.handCount} · Deck {p.libraryCount} · Cem.{' '}
                {graveyardOf(p.id).length} · Ex. {exileOf(p.id).length}
              </span>
            </div>
          ))}
          {opponents.length === 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Aguardando oponentes...
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                aria-label="Sair da mesa e voltar ao início"
              >
                ← Sair
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Campo de batalha */}
      <div
        ref={battlefieldRef}
        data-drop-zone="battlefield"
        onPointerDown={handleBattlefieldPointerDown}
        className="relative min-h-0 flex-1 overflow-hidden no-scrollbar bg-felt select-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, oklch(0.28 0.05 160) 0%, oklch(0.22 0.045 160) 70%, oklch(0.18 0.04 160) 100%)',
        }}
        aria-label="Campo de batalha - arraste cartas ou desenhe uma caixa para selecionar"
      >
        {/* Badge de zoom e controles de organização do campo de batalha */}
        <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-md shadow-lg opacity-90 transition-opacity hover:opacity-100">
          <div className="flex items-center gap-1.5 border-r border-white/15 pr-2.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Campo:</span>
            <button
              type="button"
              onClick={() => setBattlefieldScale((s) => Math.max(0.6, s - 0.1))}
              disabled={battlefieldScale <= 0.6}
              className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-muted-foreground hover:bg-white/10 hover:text-white disabled:opacity-20"
              title="Reduzir zoom do campo (ou use scroll do mouse)"
            >
              −
            </button>
            <span className="min-w-8 text-center font-mono text-[11px] font-bold text-primary">
              {Math.round(battlefieldScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setBattlefieldScale((s) => Math.min(2.2, s + 0.1))}
              disabled={battlefieldScale >= 2.2}
              className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-muted-foreground hover:bg-white/10 hover:text-white disabled:opacity-20"
              title="Aumentar zoom do campo (ou use scroll do mouse)"
            >
              +
            </button>
            {battlefieldScale !== 1.0 && (
              <button
                type="button"
                onClick={() => setBattlefieldScale(1.0)}
                className="ml-1 text-[10px] font-semibold text-muted-foreground hover:text-white"
                title="Resetar zoom para 100%"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoOrganize((prev) => !prev)}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold transition-all shadow-sm ${
                autoOrganize
                  ? 'bg-primary text-primary-foreground shadow-primary/20'
                  : 'bg-white/10 text-muted-foreground hover:bg-white/20 hover:text-white'
              }`}
              title="Ativar/desativar modo organização automática do jogo"
            >
              <span>⚡</span>
              <span>Modo Organização: {autoOrganize ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={() => setOverrides(computeAutoPositions(battlefieldCards))}
              className="flex items-center gap-1 rounded bg-secondary/90 px-2.5 py-1 text-[11px] font-bold text-secondary-foreground hover:bg-secondary transition-colors"
              title="Organizar a mesa agora"
            >
              <span>✨</span>
              <span>Organizar Mesa</span>
            </button>
          </div>
        </div>

        {/* Guia discreto de atalhos de teclado */}
        <div className="absolute right-3 top-3 z-20 hidden lg:flex items-center gap-2.5 rounded-md border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur-md shadow-md opacity-75 transition-opacity hover:opacity-100">
          <span className="font-semibold text-white/90">Atalhos:</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-white/20 bg-white/10 px-1 font-mono font-bold text-white">O</kbd> Organizar</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-white/20 bg-white/10 px-1 font-mono font-bold text-white">A</kbd> Comprar</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-white/20 bg-white/10 px-1 font-mono font-bold text-white">S</kbd> Embaralhar</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-white/20 bg-white/10 px-1 font-mono font-bold text-white">T</kbd> Virar</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-white/20 bg-white/10 px-1 font-mono font-bold text-white">H</kbd> Mão</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-white/20 bg-white/10 px-1 font-mono font-bold text-white">B</kbd> Campo</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-white/20 bg-white/10 px-1 font-mono font-bold text-white">G</kbd> Cemitério</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-white/20 bg-white/10 px-1 font-mono font-bold text-white">E</kbd> Exílio</span>
        </div>

        {/* Caixinha retangular de seleção (Marquee Box) */}
        {marquee && Math.abs(marquee.currentX - marquee.startX) > 4 && (
          <div
            className="pointer-events-none fixed z-40 rounded border-2 border-primary bg-primary/20 backdrop-blur-[1px] shadow-lg shadow-primary/30"
            style={{
              left: Math.min(marquee.startX, marquee.currentX),
              top: Math.min(marquee.startY, marquee.currentY),
              width: Math.abs(marquee.currentX - marquee.startX),
              height: Math.abs(marquee.currentY - marquee.startY),
            }}
          />
        )}

        {/* Toolbar flutuante para cartas selecionadas */}
        {selectedCardIds.size > 0 && (
          <div className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/40 bg-black/85 px-4 py-2 text-sm text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
            <div className="flex items-center gap-1.5 border-r border-white/20 pr-3 font-semibold text-primary">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">
                {selectedCardIds.size}
              </span>
              <span>{selectedCardIds.size === 1 ? 'Carta Marcada' : 'Cartas Marcadas'}</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleTapSelected}
                className="h-8 gap-1 text-xs text-white hover:bg-white/15"
                title="Virar/desvirar todas as cartas marcadas (Atalho: T)"
              >
                <span>🔄</span>
                <span>Virar/Desvirar</span>
                <kbd className="ml-1 rounded border border-white/20 bg-white/10 px-1 font-mono text-[9px] font-bold">T</kbd>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleSendSelectedToHand}
                className="h-8 gap-1 text-xs text-white hover:bg-white/15"
                title="Enviar marcadas para a Mão (Atalho: H)"
              >
                <span>✋</span>
                <span>Mão</span>
                <kbd className="ml-1 rounded border border-white/20 bg-white/10 px-1 font-mono text-[9px] font-bold">H</kbd>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleSendSelectedToGraveyard}
                className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/20 hover:text-destructive-foreground"
                title="Enviar marcadas para o Cemitério (Atalho: G)"
              >
                <span>🪦</span>
                <span>Cemitério</span>
                <kbd className="ml-1 rounded border border-white/20 bg-white/10 px-1 font-mono text-[9px] font-bold">G</kbd>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleSendSelectedToExile}
                className="h-8 gap-1 text-xs text-purple-300 hover:bg-purple-500/20 hover:text-purple-100"
                title="Enviar marcadas para o Exílio (Atalho: E)"
              >
                <span>🌌</span>
                <span>Exílio</span>
                <kbd className="ml-1 rounded border border-white/20 bg-white/10 px-1 font-mono text-[9px] font-bold">E</kbd>
              </Button>

              <div className="ml-2 border-l border-white/20 pl-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCardIds(new Set())}
                  className="h-7 text-[11px] text-muted-foreground hover:text-white"
                >
                  Limpar Seleção (Esc)
                </Button>
              </div>
            </div>
          </div>
        )}

        <div
          className="relative h-full w-full origin-center transition-transform duration-75"
          style={{ transform: `scale(${battlefieldScale})` }}
        >
          {/* Bordas e Zonas demarcadas do Campo de Batalha */}
          <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-felt-border/60">
            {/* Linha divisória horizontal (Criaturas em cima, Terrenos/Artefatos/Encantamentos embaixo) */}
            <div className="absolute left-0 right-0 top-[50%] border-t border-dashed border-felt-border/50" />

            {/* Linhas divisórias verticais na parte inferior */}
            <div className="absolute bottom-0 top-[50%] left-[33.3%] border-l border-dashed border-felt-border/40" />
            <div className="absolute bottom-0 top-[50%] left-[66.6%] border-l border-dashed border-felt-border/40" />

            {/* Rótulo: Criaturas (Parte Superior) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-25 select-none text-[11px] font-extrabold uppercase tracking-[0.3em] text-foreground">
              <span>⚔️</span>
              <span>Criaturas & Combate</span>
            </div>

            {/* Rótulo: Terrenos (Inferior Esquerda) */}
            <div className="absolute bottom-3 left-[16.6%] -translate-x-1/2 flex items-center gap-1.5 opacity-25 select-none text-[11px] font-extrabold uppercase tracking-[0.25em] text-foreground">
              <span>🌳</span>
              <span>Terrenos</span>
            </div>

            {/* Rótulo: Artefatos (Inferior Centro) */}
            <div className="absolute bottom-3 left-[50%] -translate-x-1/2 flex items-center gap-1.5 opacity-25 select-none text-[11px] font-extrabold uppercase tracking-[0.25em] text-foreground">
              <span>💎</span>
              <span>Artefatos</span>
            </div>

            {/* Rótulo: Encantamentos & Outros (Inferior Direita) */}
            <div className="absolute bottom-3 left-[83.3%] -translate-x-1/2 flex items-center gap-1.5 opacity-25 select-none text-[11px] font-extrabold uppercase tracking-[0.2em] text-foreground">
              <span>✨</span>
              <span>Encantamentos & Outros</span>
            </div>
          </div>

          {battlefieldCards.map((card) => {
            const rawPos = overrides[card.id] ?? { x: card.x, y: card.y }
            const pos = {
              x: Math.max(4, Math.min(96, rawPos.x)),
              y: Math.max(6, Math.min(94, rawPos.y)),
            }
            const isDragging = drag?.card.id === card.id && drag.moved
            const isSelected = selectedCardIds.has(card.id)
            return (
              <div
                key={card.id}
                data-card-id={card.id}
                onPointerDown={(e) => {
                  if (e.shiftKey) {
                    e.stopPropagation()
                    setSelectedCardIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(card.id)) next.delete(card.id)
                      else next.add(card.id)
                      return next
                    })
                    return
                  }
                  if (!selectedCardIds.has(card.id)) {
                    setSelectedCardIds(new Set([card.id]))
                  }
                  startDrag(card, 'battlefield', e)
                }}
                onMouseEnter={() => setHoveredCardId(card.id)}
                onMouseLeave={() => setHoveredCardId((prev) => (prev === card.id ? null : prev))}
                className={`absolute cursor-grab touch-none active:cursor-grabbing transition-all rounded-xl ${
                  isSelected
                    ? 'ring-4 ring-primary ring-offset-2 ring-offset-black/90 shadow-2xl shadow-primary/40 scale-105 z-30'
                    : ''
                }`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isDragging ? 50 : isSelected ? 30 : 10,
                }}
                role="button"
                tabIndex={0}
                aria-label={`${card.name}${card.tapped ? ' (virada)' : ''} - clique para virar, arraste para mover`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    sendAction({ type: 'toggle-tap', cardId: card.id })
                  }
                }}
              >
                {isSelected && (
                  <span className="pointer-events-none absolute -left-2 -top-2 z-40 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground shadow-lg border border-white/40 animate-in zoom-in-50">
                    ✓
                  </span>
                )}
                <CardPreview card={card}>
                  <GameCard
                    card={card}
                    seatColor={seatColor(card.ownerId)}
                    width={CARD_W}
                    dimmed={isDragging}
                  />
                </CardPreview>
              </div>
            )
          })}
        </div>
      </div>

      {/* Barra inferior: jogador local */}
      <footer className="flex flex-wrap items-end gap-4 border-t border-border bg-card px-3 py-2">
        {/* Vida e ações */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: seatColor(state.playerId) }}
              aria-hidden="true"
            />
            <span className="max-w-32 truncate text-sm font-semibold">
              {me?.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 text-lg"
              onClick={() => sendAction({ type: 'set-life', delta: -1 })}
              aria-label="Perder 1 ponto de vida"
            >
              −
            </Button>
            <input
              type="number"
              value={editingLife !== null ? editingLife : (me?.life ?? 20)}
              onChange={(e) => setEditingLife(e.target.value)}
              onFocus={() => setEditingLife(String(me?.life ?? 20))}
              onBlur={() => {
                if (editingLife !== null) {
                  const val = parseInt(editingLife, 10)
                  if (!isNaN(val)) {
                    const current = me?.life ?? 20
                    const delta = val - current
                    if (delta !== 0) {
                      sendAction({ type: 'set-life', delta })
                    }
                  }
                  setEditingLife(null)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  setEditingLife(null)
                  e.currentTarget.blur()
                }
              }}
              className="w-16 rounded border border-transparent bg-transparent text-center font-mono text-2xl font-bold text-primary transition-all hover:border-border hover:bg-black/20 focus:border-primary focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-primary"
              title="Clique ou use o teclado para digitar o número da sua vida (Enter para confirmar)"
              aria-label="Editar total de vida"
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 text-lg"
              onClick={() => sendAction({ type: 'set-life', delta: 1 })}
              aria-label="Ganhar 1 ponto de vida"
            >
              +
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="relative h-8 gap-1.5 font-semibold"
              onClick={() => sendAction({ type: 'draw' })}
            >
              <span>Comprar</span>
              <kbd className="pointer-events-none hidden sm:inline-flex h-4 items-center rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 font-mono text-[9px] font-bold text-primary-foreground">
                A
              </kbd>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={() => sendAction({ type: 'mulligan' })}
            >
              Mulligan{me && me.mulligans > 0 ? ` (${me.mulligans})` : ''}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={() => sendAction({ type: 'untap-all' })}
            >
              Desvirar
            </Button>
          </div>
        </div>

        {/* Zonas: biblioteca, cemitério, exílio */}
        <div className="flex shrink-0 items-end gap-3">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              data-drop-zone="library"
              onClick={() => sendAction({ type: 'draw' })}
              className="relative transition-transform hover:scale-105"
              aria-label={`Biblioteca: ${me?.libraryCount ?? 0} cartas. Clique para comprar.`}
            >
              <CardBack width={66} />
              <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {me?.libraryCount ?? 0}
              </span>
              <span className="pointer-events-none absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded bg-primary/90 px-1 font-mono text-[9px] font-extrabold text-primary-foreground shadow-sm">
                A
              </span>
            </button>
            <button
              type="button"
              onClick={() => sendAction({ type: 'shuffle-library' })}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
            >
              <span>Embaralhar</span>
              <kbd className="pointer-events-none inline-flex h-3.5 items-center rounded border border-border bg-muted/80 px-1 font-mono text-[9px] font-bold text-muted-foreground">
                S
              </kbd>
            </button>
          </div>
          <ZonePile
            label="Cemitério"
            zone="graveyard"
            cards={graveyardOf(state.playerId)}
            onSendTo={sendTo}
            onStartDragCard={startDrag}
            shortcutKey="G"
          />
          <ZonePile
            label="Exílio"
            zone="exile"
            cards={exileOf(state.playerId)}
            onSendTo={sendTo}
            onStartDragCard={startDrag}
            shortcutKey="E"
          />
        </div>

        {/* Mão (Carrossel de 7 em 7 cartas) */}
        {(() => {
          const CARDS_PER_PAGE = 7
          const totalPages = Math.max(1, Math.ceil(myHand.length / CARDS_PER_PAGE))
          const safeHandPage = Math.min(handPage, totalPages - 1)
          const visibleHandCards = myHand.slice(
            safeHandPage * CARDS_PER_PAGE,
            (safeHandPage + 1) * CARDS_PER_PAGE,
          )

          return (
            <div className="relative flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-dashed border-felt-border/70 bg-black/20 p-1.5 transition-all">
              {/* Botão Anterior */}
              {totalPages > 1 && (
                <button
                  type="button"
                  onClick={() => setHandPage((p) => Math.max(0, p - 1))}
                  disabled={safeHandPage === 0}
                  className="flex h-8 w-6 shrink-0 items-center justify-center rounded bg-black/40 text-xs font-bold text-white hover:bg-primary hover:text-primary-foreground disabled:opacity-20 transition-colors z-20"
                  title="Página anterior da mão (7 cartas por página)"
                >
                  ◀
                </button>
              )}

              {/* Área de cartas da página atual */}
              <div
                ref={handRef}
                data-drop-zone="hand"
                style={{ height: Math.round(handCardWidth * 1.39 + 18) }}
                className="relative flex min-w-0 flex-1 items-end justify-center gap-2 overflow-x-auto no-scrollbar transition-all"
                aria-label={`Sua mão: página ${safeHandPage + 1} de ${totalPages} (${myHand.length} cartas no total)`}
              >
                {myHand.length === 0 && (
                  <span className="w-full self-center text-center text-xs uppercase tracking-wider text-muted-foreground">
                    Sua mão está vazia
                  </span>
                )}
                {visibleHandCards.map((card) => {
                  const isDragging = drag?.card.id === card.id && drag.moved
                  return (
                    <div
                      key={card.id}
                      onPointerDown={(e) => startDrag(card, 'hand', e)}
                      onMouseEnter={() => setHoveredCardId(card.id)}
                      onMouseLeave={() => setHoveredCardId((prev) => (prev === card.id ? null : prev))}
                      className="shrink-0 cursor-grab touch-none transition-transform hover:-translate-y-2 active:cursor-grabbing"
                      role="button"
                      tabIndex={0}
                      aria-label={`${card.name} - arraste para jogar`}
                    >
                      <CardPreview card={card}>
                        <GameCard card={card} width={handCardWidth} dimmed={isDragging} />
                      </CardPreview>
                    </div>
                  )
                })}
              </div>

              {/* Botão Próximo */}
              {totalPages > 1 && (
                <button
                  type="button"
                  onClick={() => setHandPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safeHandPage >= totalPages - 1}
                  className="flex h-8 w-6 shrink-0 items-center justify-center rounded bg-black/40 text-xs font-bold text-white hover:bg-primary hover:text-primary-foreground disabled:opacity-20 transition-colors z-20"
                  title="Próxima página da mão (7 cartas por página)"
                >
                  ▶
                </button>
              )}

              {/* Indicador de página e contagem total */}
              {totalPages > 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/85 px-2.5 py-0.5 text-[10px] font-bold text-primary shadow-md backdrop-blur-md">
                  <span>Mão:</span>
                  <span>{safeHandPage + 1} / {totalPages}</span>
                  <span className="text-[9px] text-muted-foreground">({myHand.length} cartas)</span>
                </div>
              )}
            </div>
          )
        })()}
      </footer>

      {/* Ghost da carta arrastada */}
      {drag?.moved && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: drag.pointerX - drag.offsetX,
            top: drag.pointerY - drag.offsetY,
          }}
          aria-hidden="true"
        >
          <GameCard card={drag.card} width={CARD_W} />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="fixed bottom-36 left-1/2 z-50 -translate-x-1/2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white shadow-lg"
        >
          {error}
        </p>
      )}
    </main>
  )
}
