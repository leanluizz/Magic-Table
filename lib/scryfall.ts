export interface ScryfallCard {
  id: string
  name: string
  image: string
  typeLine: string
  manaCost: string
}

export interface ScryfallCardDetail {
  id: string
  name: string
  manaCost: string
  typeLine: string
  oracleText: string
  flavorText: string
  setName: string
  setCode: string
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | string
  power?: string
  toughness?: string
  loyalty?: string
  cmc: number
  image: string
  imageLarge: string
  prices: {
    usd?: string
    usdFoil?: string
    eur?: string
    eurFoil?: string
    tix?: string
  }
  legalities: Record<string, 'legal' | 'not_legal' | 'restricted' | 'banned'>
  scryfallUri: string
  gathererUri?: string
}

interface ScryfallApiCard {
  id: string
  name: string
  type_line?: string
  mana_cost?: string
  oracle_text?: string
  flavor_text?: string
  set_name?: string
  set?: string
  rarity?: string
  power?: string
  toughness?: string
  loyalty?: string
  cmc?: number
  image_uris?: { normal?: string; large?: string }
  card_faces?: { image_uris?: { normal?: string; large?: string }; mana_cost?: string; oracle_text?: string }[]
  prices?: {
    usd?: string
    usd_foil?: string
    eur?: string
    eur_foil?: string
    tix?: string
  }
  legalities?: Record<string, string>
  scryfall_uri?: string
  related_uris?: { gatherer?: string }
}

function getImage(card: ScryfallApiCard): string | null {
  return (
    card.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.normal ??
    null
  )
}

function getImageLarge(card: ScryfallApiCard): string {
  return (
    card.image_uris?.large ??
    card.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.large ??
    card.card_faces?.[0]?.image_uris?.normal ??
    '/placeholder.svg'
  )
}

export async function searchCards(query: string): Promise<ScryfallCard[]> {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=name`
  const res = await fetch(url)
  if (!res.ok) return []
  const json = await res.json()
  const data: ScryfallApiCard[] = json.data ?? []
  return data
    .map((c) => {
      const image = getImage(c)
      if (!image) return null
      return {
        id: c.id,
        name: c.name,
        image,
        typeLine: c.type_line ?? '',
        manaCost: c.mana_cost ?? c.card_faces?.[0]?.mana_cost ?? '',
      }
    })
    .filter((c): c is ScryfallCard => c !== null)
}

export async function getCardByName(name: string): Promise<ScryfallCard | null> {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const c: ScryfallApiCard = await res.json()
  const image = getImage(c)
  if (!image) return null
  return {
    id: c.id,
    name: c.name,
    image,
    typeLine: c.type_line ?? '',
    manaCost: c.mana_cost ?? c.card_faces?.[0]?.mana_cost ?? '',
  }
}

export interface ScryfallCardPrint {
  id: string
  name: string
  setName: string
  setCode: string
  releasedAt: string
  frame: string
  isLegacyFrame: boolean
  image: string
  imageLarge: string
  rarity: string
  collectorNumber: string
}

export async function getCardById(id: string): Promise<ScryfallCardDetail | null> {
  const url = `https://api.scryfall.com/cards/${id}`
  const res = await fetch(url)
  if (!res.ok) return null
  const c: ScryfallApiCard = await res.json()
  const oracleText =
    c.oracle_text ??
    c.card_faces?.map((f) => f.oracle_text ?? '').join('\n—\n') ??
    ''
  return {
    id: c.id,
    name: c.name,
    manaCost: c.mana_cost ?? c.card_faces?.[0]?.mana_cost ?? '',
    typeLine: c.type_line ?? '',
    oracleText,
    flavorText: c.flavor_text ?? '',
    setName: c.set_name ?? '',
    setCode: (c.set ?? '').toUpperCase(),
    rarity: c.rarity ?? 'common',
    power: c.power,
    toughness: c.toughness,
    loyalty: c.loyalty,
    cmc: c.cmc ?? 0,
    image: getImage(c) ?? '/placeholder.svg',
    imageLarge: getImageLarge(c),
    prices: {
      usd: c.prices?.usd ?? undefined,
      usdFoil: c.prices?.usd_foil ?? undefined,
      eur: c.prices?.eur ?? undefined,
      eurFoil: c.prices?.eur_foil ?? undefined,
      tix: c.prices?.tix ?? undefined,
    },
    legalities: (c.legalities ?? {}) as Record<string, 'legal' | 'not_legal' | 'restricted' | 'banned'>,
    scryfallUri: c.scryfall_uri ?? `https://scryfall.com/card/${id}`,
    gathererUri: c.related_uris?.gatherer,
  }
}

export async function getCardPrints(cardName: string): Promise<ScryfallCardPrint[]> {
  const url = `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(cardName)}"&unique=prints&order=released`
  const res = await fetch(url)
  if (!res.ok) return []
  const json = await res.json()
  const data: (ScryfallApiCard & { released_at?: string; frame?: string; collector_number?: string })[] = json.data ?? []
  
  return data
    .map((c) => {
      const img = getImage(c)
      if (!img) return null
      const frame = c.frame ?? '2015'
      const isLegacyFrame = frame === '1993' || frame === '1997'
      return {
        id: c.id,
        name: c.name,
        setName: c.set_name ?? '',
        setCode: (c.set ?? '').toUpperCase(),
        releasedAt: c.released_at ?? '',
        frame,
        isLegacyFrame,
        image: img,
        imageLarge: getImageLarge(c),
        rarity: c.rarity ?? 'common',
        collectorNumber: c.collector_number ?? '',
      }
    })
    .filter((c): c is ScryfallCardPrint => c !== null)
}
