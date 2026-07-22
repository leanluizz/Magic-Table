import { NextResponse } from 'next/server'
import { createRoom } from '@/lib/game-store'

export async function POST() {
  const room = createRoom()
  return NextResponse.json({ roomId: room.id })
}
