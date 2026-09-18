export type Zone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile'

export interface DeckCard {
  scryfallId: string
  name: string
  image: string
  quantity: number
  typeLine?: string
}

export interface CardInstance {
  id: string
  scryfallId: string
  name: string
  image: string
  ownerId: string
  zone: Zone
  /** Posição percentual no campo de batalha (0-100) */
  x: number
  y: number
  tapped: boolean
  faceDown: boolean
  typeLine?: string
}

/** Carta oculta (mão de outro jogador) */
export interface HiddenCard {
  id: string
  ownerId: string
  zone: 'hand'
  hidden: true
}

export interface Player {
  id: string
  name: string
  seat: number
  life: number
  ready: boolean
  mulligans: number
  deck: DeckCard[]
}

export interface Room {
  id: string
  status: 'lobby' | 'playing'
  isPublic: boolean
  players: Player[]
  cards: CardInstance[]
  /** Ordem das bibliotecas: playerId -> ids das cartas (topo primeiro) */
  libraries: Record<string, string[]>
  createdAt: number
}

export interface PublicPlayer {
  id: string
  name: string
  seat: number
  life: number
  ready: boolean
  mulligans: number
  deckCount: number
  handCount: number
  libraryCount: number
}

/** Estado personalizado enviado a cada jogador */
export interface ClientState {
  roomId: string
  status: 'lobby' | 'playing'
  isPublic: boolean
  playerId: string
  players: PublicPlayer[]
  /** Cartas visíveis: campo, cemitérios, exílios e a própria mão */
  cards: CardInstance[]
}

export type GameAction =
  | { type: 'set-deck'; deck: DeckCard[] }
  | { type: 'toggle-ready' }
  | { type: 'start-game' }
  | { type: 'draw'; count?: number }
  | { type: 'mulligan' }
  | { type: 'shuffle-library' }
  | { type: 'move-card'; cardId: string; zone: Zone; x?: number; y?: number }
  | { type: 'toggle-tap'; cardId: string }
  | { type: 'untap-all' }
  | { type: 'set-life'; delta: number }
