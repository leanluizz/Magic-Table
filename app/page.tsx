import { HomeLobby } from '@/components/home-lobby'

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-10 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
          Protótipo multiplayer
        </p>
        <h1 className="text-balance font-sans text-4xl font-bold tracking-tight md:text-5xl">
          Mesa de Magic
        </h1>
        <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
          Monte seu deck com cartas reais da Scryfall, convide até 4 jogadores
          e jogue em tempo real movendo as cartas livremente pela mesa.
        </p>
      </div>
      <HomeLobby />
    </main>
  )
}
