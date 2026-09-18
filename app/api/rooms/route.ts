import { NextResponse } from 'next/server'
import { createRoom, listPublicRooms } from '@/lib/game-store'

export async function GET() {
  const rooms = listPublicRooms()
  return NextResponse.json(rooms)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const isPublic = body?.isPublic === true
  const room = createRoom(isPublic)
  return NextResponse.json({ roomId: room.id })
}
