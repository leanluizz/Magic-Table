import { NextResponse } from 'next/server'
import { getRoom, joinRoom } from '@/lib/game-store'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }
  const room = getRoom(id)
  if (!room) {
    return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
  }
  if (room.status === 'playing') {
    return NextResponse.json({ error: 'A partida já começou' }, { status: 409 })
  }
  const player = joinRoom(id, name)
  if (!player) {
    return NextResponse.json({ error: 'Sala cheia (máx. 4)' }, { status: 409 })
  }
  return NextResponse.json({ playerId: player.id })
}
