export interface ScryfallCard {
  id: string
  name: string
  image: string
  typeLine: string
  manaCost: string
}

interface ScryfallApiCard {
  id: string
  name: string
  type_line?: string
  mana_cost?: string
  image_uris?: { normal?: string; large?: string }
  card_faces?: { image_uris?: { normal?: string; large?: string }; mana_cost?: string }[]
}

function getImage(card: ScryfallApiCard): string | null {
  return (
    card.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.normal ??
    null
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
