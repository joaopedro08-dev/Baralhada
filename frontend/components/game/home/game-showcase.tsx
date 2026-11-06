"use client"

import Link from "next/link"
import { BookOpen, Clock, Play, Users } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import { GameButton } from "@/components/game/game-button"
import { Reveal } from "@/components/game/home/reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { describePlayerCounts, GAMES } from "@/lib/game/domain/catalog"
import type { GameId } from "@/lib/game/domain/types"

export function GameShowcase({ onPick }: { onPick: (gameId: GameId) => void }) {
  return (
    <section
      id="jogos"
      aria-labelledby="jogos-titulo"
      className="flex scroll-mt-20 flex-col gap-6"
    >
      <Reveal className="flex flex-col gap-2">
        <h2 id="jogos-titulo" className="font-heading text-3xl font-bold">
          Escolha o seu jogo
        </h2>
        <p className="max-w-2xl text-felt-muted">
          Cada sala joga um jogo. O anfitrião escolhe antes de começar e pode
          trocar enquanto todos estão no saguão.
        </p>
      </Reveal>

      <ul className="grid gap-4 md:grid-cols-2">
        {GAMES.map((game, index) => (
          <li key={game.id}>
            <Reveal delay={index * 0.1} className="h-full">
              <Card className="h-full transition-transform duration-200 hover:-translate-y-1">
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-heading text-2xl font-bold">
                        {game.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {game.tagline}
                      </p>
                    </div>
                    <div
                      aria-hidden
                      className="flex shrink-0 -space-x-7 pr-1 pl-2"
                    >
                      {game.sample.map((card, position) => (
                        <CardFace
                          key={card}
                          card={card}
                          size="flying"
                          className={
                            position === 0
                              ? "-rotate-8"
                              : position === 2
                                ? "rotate-8"
                                : "z-10 -translate-y-1"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="h-6 gap-1">
                      <Users aria-hidden className="size-3" />
                      {describePlayerCounts(game)}
                    </Badge>
                    <Badge variant="secondary" className="h-6 gap-1">
                      <Clock aria-hidden className="size-3" />
                      {game.turnSeconds} s por jogada
                    </Badge>
                    <Badge variant="outline" className="h-6">
                      {game.deck}
                    </Badge>
                  </div>

                  <ul className="flex flex-1 flex-col gap-1.5 text-sm/relaxed">
                    {game.highlights.map((highlight) => (
                      <li key={highlight} className="flex gap-2">
                        <span aria-hidden className="text-gold-foreground">
                          ♠
                        </span>
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2">
                    <GameButton
                      tone="gold"
                      onClick={() => onPick(game.id)}
                      className="flex-1"
                    >
                      <Play aria-hidden />
                      Jogar {game.name}
                    </GameButton>
                    <GameButton
                      asChild
                      className="border-border bg-card text-card-foreground hover:bg-muted"
                    >
                      <Link href={`/informacoes#${game.rulesAnchor}`}>
                        <BookOpen aria-hidden />
                        Regras
                      </Link>
                    </GameButton>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
