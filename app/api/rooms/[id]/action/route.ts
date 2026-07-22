import { NextResponse } from 'next/server'
import { applyAction } from '@/lib/game-store'
import type { GameAction } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const playerId = typeof body?.playerId === 'string' ? body.playerId : ''
  const action = body?.action as GameAction | undefined
  if (!playerId || !action?.type) {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }
  const result = applyAction(id, playerId, action)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
