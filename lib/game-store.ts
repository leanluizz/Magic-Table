import type {
  CardInstance,
  ClientState,
  GameAction,
  Player,
  Room,
} from './types'

type Subscriber = {
  playerId: string
  send: (state: ClientState) => void
}

interface Store {
  rooms: Map<string, Room>
  subscribers: Map<string, Set<Subscriber>>
}

const globalStore = globalThis as unknown as { __mtgStore?: Store }

function getStore(): Store {
  if (!globalStore.__mtgStore) {
    globalStore.__mtgStore = {
      rooms: new Map(),
      subscribers: new Map(),
    }
  }
  return globalStore.__mtgStore
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createRoom(): Room {
  const store = getStore()
  let id = generateRoomCode()
  while (store.rooms.has(id)) id = generateRoomCode()
  const room: Room = {
    id,
    status: 'lobby',
    players: [],
    cards: [],
    libraries: {},
    createdAt: Date.now(),
  }
  store.rooms.set(id, room)
  return room
}

export function getRoom(id: string): Room | undefined {
  return getStore().rooms.get(id.toUpperCase())
}

export function joinRoom(roomId: string, name: string): Player | null {
  const room = getRoom(roomId)
  if (!room) return null
  if (room.players.length >= 4) return null
  const player: Player = {
    id: crypto.randomUUID(),
    name: name.slice(0, 20),
    seat: room.players.length,
    life: 20,
    ready: false,
    mulligans: 0,
    deck: [],
  }
  room.players.push(player)
  broadcast(room)
  return player
}

/** Estado personalizado: esconde mãos alheias e bibliotecas */
export function serializeState(room: Room, playerId: string): ClientState {
  const visibleCards = room.cards.filter((c) => {
    if (c.zone === 'library') return false
    if (c.zone === 'hand') return c.ownerId === playerId
    return true
  })
  return {
    roomId: room.id,
    status: room.status,
    playerId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      life: p.life,
      ready: p.ready,
      mulligans: p.mulligans,
      deckCount: p.deck.reduce((s, d) => s + d.quantity, 0),
      handCount: room.cards.filter(
        (c) => c.zone === 'hand' && c.ownerId === p.id,
      ).length,
      libraryCount: room.libraries[p.id]?.length ?? 0,
    })),
    cards: visibleCards,
  }
}

export function subscribe(
  roomId: string,
  playerId: string,
  send: (state: ClientState) => void,
): () => void {
  const store = getStore()
  const key = roomId.toUpperCase()
  if (!store.subscribers.has(key)) store.subscribers.set(key, new Set())
  const sub: Subscriber = { playerId, send }
  store.subscribers.get(key)!.add(sub)
  return () => {
    store.subscribers.get(key)?.delete(sub)
  }
}

export function broadcast(room: Room) {
  const subs = getStore().subscribers.get(room.id)
  if (!subs) return
  for (const sub of subs) {
    try {
      sub.send(serializeState(room, sub.playerId))
    } catch {
      subs.delete(sub)
    }
  }
}

function drawCards(room: Room, playerId: string, count: number) {
  const lib = room.libraries[playerId]
  if (!lib) return
  for (let i = 0; i < count; i++) {
    const cardId = lib.shift()
    if (!cardId) break
    const card = room.cards.find((c) => c.id === cardId)
    if (card) {
      card.zone = 'hand'
      card.tapped = false
      card.faceDown = false
    }
  }
}

function buildLibrary(room: Room, player: Player) {
  // Remove cartas antigas do jogador
  room.cards = room.cards.filter((c) => c.ownerId !== player.id)
  const instances: CardInstance[] = []
  for (const deckCard of player.deck) {
    for (let i = 0; i < deckCard.quantity; i++) {
      instances.push({
        id: crypto.randomUUID(),
        scryfallId: deckCard.scryfallId,
        name: deckCard.name,
        image: deckCard.image,
        ownerId: player.id,
        zone: 'library',
        x: 50,
        y: 50,
        tapped: false,
        faceDown: false,
      })
    }
  }
  room.cards.push(...instances)
  room.libraries[player.id] = shuffle(instances.map((c) => c.id))
}

export function applyAction(
  roomId: string,
  playerId: string,
  action: GameAction,
): { ok: boolean; error?: string } {
  const room = getRoom(roomId)
  if (!room) return { ok: false, error: 'Sala não encontrada' }
  const player = room.players.find((p) => p.id === playerId)
  if (!player) return { ok: false, error: 'Jogador não está na sala' }

  switch (action.type) {
    case 'set-deck': {
      player.deck = action.deck
      player.ready = false
      break
    }
    case 'toggle-ready': {
      const deckSize = player.deck.reduce((s, d) => s + d.quantity, 0)
      if (deckSize < 7) return { ok: false, error: 'Deck precisa de ao menos 7 cartas' }
      player.ready = !player.ready
      break
    }
    case 'start-game': {
      if (room.status === 'playing') break
      const readyPlayers = room.players.filter((p) => p.ready)
      if (readyPlayers.length < 2)
        return { ok: false, error: 'São necessários ao menos 2 jogadores prontos' }
      room.status = 'playing'
      room.players = room.players.filter((p) => p.ready)
      room.players.forEach((p, i) => {
        p.seat = i
        p.life = room.players.length > 2 ? 40 : 20
        p.mulligans = 0
        buildLibrary(room, p)
        drawCards(room, p.id, 7)
      })
      break
    }
    case 'draw': {
      drawCards(room, playerId, action.count ?? 1)
      break
    }
    case 'mulligan': {
      // Devolve a mão à biblioteca, embaralha e compra 7 novamente (London)
      const handCards = room.cards.filter(
        (c) => c.zone === 'hand' && c.ownerId === playerId,
      )
      const lib = room.libraries[playerId] ?? []
      for (const c of handCards) {
        c.zone = 'library'
        lib.push(c.id)
      }
      room.libraries[playerId] = shuffle(lib)
      player.mulligans += 1
      drawCards(room, playerId, 7)
      break
    }
    case 'shuffle-library': {
      room.libraries[playerId] = shuffle(room.libraries[playerId] ?? [])
      break
    }
    case 'move-card': {
      const card = room.cards.find((c) => c.id === action.cardId)
      if (!card) return { ok: false, error: 'Carta não encontrada' }
      // Se a carta sai da biblioteca de alguém, remove da ordem
      for (const pid of Object.keys(room.libraries)) {
        room.libraries[pid] = room.libraries[pid].filter(
          (id) => id !== card.id,
        )
      }
      card.zone = action.zone
      if (action.zone === 'battlefield') {
        card.x = Math.min(100, Math.max(0, action.x ?? 50))
        card.y = Math.min(100, Math.max(0, action.y ?? 50))
      } else {
        card.tapped = false
        card.faceDown = false
      }
      if (action.zone === 'library') {
        const lib = room.libraries[card.ownerId] ?? []
        lib.push(card.id)
        room.libraries[card.ownerId] = lib
      }
      break
    }
    case 'toggle-tap': {
      const card = room.cards.find((c) => c.id === action.cardId)
      if (!card || card.zone !== 'battlefield')
        return { ok: false, error: 'Carta não está no campo' }
      card.tapped = !card.tapped
      break
    }
    case 'untap-all': {
      for (const c of room.cards) {
        if (c.zone === 'battlefield' && c.ownerId === playerId) c.tapped = false
      }
      break
    }
    case 'set-life': {
      player.life += action.delta
      break
    }
  }

  broadcast(room)
  return { ok: true }
}
