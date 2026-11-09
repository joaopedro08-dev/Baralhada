"use client"

import { useState } from "react"
import Link from "next/link"
import { m } from "framer-motion"
import { BookOpen, Clock, Layers, Play, Swords, Users } from "lucide-react"

import { SuitIcon } from "@/components/game/cards/card-face"
import { GAME_IDENTITY } from "@/components/game/game-identity"
import { GameButton } from "@/components/game/game-button"
import { GamePreview } from "@/components/game/home/game-previews"
import { Reveal } from "@/components/game/home/reveal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { describePlayerCounts, GAMES } from "@/lib/game/domain/catalog"
import type { GameInfo } from "@/lib/game/domain/catalog"
import type { GameId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function GameFacts({ game }: { game: GameInfo }) {
  const facts = [
    { icon: Users, label: "Jogadores", value: describePlayerCounts(game) },
    { icon: Swords, label: "Modo", value: game.mode },
    { icon: Layers, label: "Baralho", value: game.deck },
    { icon: Clock, label: "Por jogada", value: `${game.turnSeconds} segundos` },
  ]
  return (
    <dl className="grid grid-cols-2 gap-2">
      {facts.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex flex-col gap-0.5 rounded-xl bg-felt/70 p-3 ring-1 ring-felt-line"
        >
          <dt className="flex items-center gap-1.5 text-xs font-medium text-felt-muted">
            <Icon aria-hidden className="size-3.5 text-gold" />
            {label}
          </dt>
          <dd className="text-sm font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function GameStage({
  game,
  onPick,
}: {
  game: GameInfo
  onPick: (gameId: GameId) => void
}) {
  const { accent, glow } = GAME_IDENTITY[game.id]
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn(
        "grid gap-6 rounded-3xl bg-gradient-to-br to-transparent p-4 ring-1 ring-felt-line sm:p-6 xl:grid-cols-[1.15fr_1fr]",
        glow
      )}
    >
      <GamePreview gameId={game.id} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className={cn("font-heading text-3xl font-bold", accent)}>
            {game.name}
          </h3>
          <p className="text-base/relaxed text-felt-foreground">
            {game.tagline}
          </p>
        </div>
        <ul className="flex flex-col gap-2 text-sm/relaxed">
          {game.highlights.map((highlight, index) => (
            <li key={highlight} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gold font-heading text-[0.7rem] font-bold text-gold-foreground"
              >
                {index + 1}
              </span>
              {highlight}
            </li>
          ))}
        </ul>
        <GameFacts game={game} />
        <div className="mt-auto flex flex-wrap gap-2">
          <GameButton
            tone="gold"
            onClick={() => onPick(game.id)}
            className="h-12 flex-1 text-base"
          >
            <Play aria-hidden />
            Jogar {GAME_IDENTITY[game.id].short}
          </GameButton>
          <GameButton asChild className="h-12">
            <Link href={`/informacoes#${game.rulesAnchor}`}>
              <BookOpen aria-hidden />
              Ver regras
            </Link>
          </GameButton>
        </div>
      </div>
    </m.div>
  )
}

export function GameShowcase({ onPick }: { onPick: (gameId: GameId) => void }) {
  const [active, setActive] = useState<GameId>(GAMES[0]?.id ?? "rouba-monte")

  return (
    <section
      id="jogos"
      aria-labelledby="jogos-titulo"
      className="flex scroll-mt-20 flex-col gap-6"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-heading text-sm font-semibold tracking-widest text-gold uppercase">
          A vitrine
        </p>
        <h2
          id="jogos-titulo"
          className="font-heading text-3xl font-bold text-balance sm:text-4xl"
        >
          Quatro mesas, um só link
        </h2>
        <p className="max-w-2xl text-felt-muted">
          Espie uma rodada de cada jogo. O anfitrião escolhe antes de começar e
          pode trocar enquanto todos esperam no saguão.
        </p>
      </Reveal>

      <Reveal>
        <Tabs
          value={active}
          onValueChange={(value) => setActive(value as GameId)}
          className="gap-4"
        >
          <TabsList
            aria-label="Jogos disponíveis"
            className="grid h-auto w-full grid-cols-2 gap-1.5 bg-felt-deep/80 p-1.5 ring-1 ring-felt-line group-data-horizontal/tabs:h-auto md:grid-cols-4"
          >
            {GAMES.map((game) => {
              const { suit, short } = GAME_IDENTITY[game.id]
              return (
                <TabsTrigger
                  key={game.id}
                  value={game.id}
                  className="min-h-14 flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left whitespace-normal text-felt-muted hover:text-felt-foreground dark:text-felt-muted dark:hover:text-felt-foreground data-active:bg-playing-card data-active:text-suit-black data-active:shadow-md dark:data-active:bg-playing-card dark:data-active:text-suit-black"
                >
                  <span className="flex items-center gap-1.5 font-heading text-base font-bold">
                    <span className="flex size-5 items-center justify-center rounded-sm bg-playing-card">
                      <SuitIcon suit={suit} className="size-3.5" />
                    </span>
                    {short}
                  </span>
                  <span className="text-xs font-medium opacity-80">
                    {describePlayerCounts(game)}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
          {GAMES.map((game) => (
            <TabsContent key={game.id} value={game.id}>
              <GameStage game={game} onPick={onPick} />
            </TabsContent>
          ))}
        </Tabs>
      </Reveal>
    </section>
  )
}
