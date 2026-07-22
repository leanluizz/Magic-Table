import { getRoom, serializeState, subscribe } from '@/lib/game-store'
import type { ClientState } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(request.url)
  const playerId = url.searchParams.get('playerId') ?? ''
  const room = getRoom(id)
  if (!room || !playerId) {
    return new Response('Sala não encontrada', { status: 404 })
  }

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let keepAlive: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (state: ClientState) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(state)}\n\n`),
        )
      }
      unsubscribe = subscribe(id, playerId, send)
      // Estado inicial imediato
      send(serializeState(room, playerId))
      // Keep-alive a cada 20s
      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          if (keepAlive) clearInterval(keepAlive)
        }
      }, 20000)
    },
    cancel() {
      unsubscribe?.()
      if (keepAlive) clearInterval(keepAlive)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
