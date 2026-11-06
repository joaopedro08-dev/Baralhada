"use client"

import { m } from "framer-motion"
import { Hand, Layers, WifiOff } from "lucide-react"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import {
  MeldedSets,
  trincaCardLayoutId,
} from "@/components/game/tres-trincas/melded-sets"
import { Badge } from "@/components/ui/badge"
import { cardName, plural } from "@/lib/game/domain/cards"
import {
  describeJokers,
  SETS_TO_WIN,
} from "@/lib/game/domain/tres-trincas/guide"
import type {
  TresTrincasState,
  TrincaPlayer,
} from "@/lib/game/domain/tres-trincas/types"
import type { RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function OpponentPanel({
  player,
  game,
  connected,
}: {
  player: TrincaPlayer
  game: TresTrincasState
  connected: boolean
}) {
  const isCurrent = player.id === game.currentPlayerId
  return (
    <li
      data-player={player.nickname}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl bg-felt-deep/90 p-2 ring-1 ring-felt-line transition-shadow",
        isCurrent && "shadow-[0_0_0_2px_var(--gold)]"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <PlayerAvatar
          playerId={player.id}
          nickname={player.nickname}
          size="sm"
        />
        <span className="min-w-0 truncate text-sm font-semibold">
          {player.nickname}
        </span>
        {isCurrent && (
          <Badge className="h-5 bg-gold text-xs font-bold text-gold-foreground">
            Vez
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-felt-muted">
        <span className="inline-flex items-center gap-1">
          <Hand aria-hidden className="size-3.5" />
          {plural(player.handSize, "carta", "cartas")}
        </span>
        <span className="tabular-nums">
          {player.sets.length}/{SETS_TO_WIN} trincas
        </span>
        {!connected && (
          <span className="inline-flex items-center gap-1">
            <WifiOff aria-hidden className="size-3.5" />
            caiu
          </span>
        )}
      </div>
      {player.sets.length > 0 && (
        <MeldedSets sets={player.sets} wildRank={game.wildRank} />
      )}
    </li>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-2 -bottom-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-felt-deep px-1 font-heading text-xs font-bold text-white tabular-nums ring-1 ring-felt-line">
      {count}
    </span>
  )
}

function PileSpot({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="text-xs font-medium text-felt-muted">{label}</span>
    </div>
  )
}

function CenterRow({
  game,
  canDraw,
  onDraw,
}: {
  game: TresTrincasState
  canDraw: boolean
  onDraw: () => void
}) {
  const stockLabel = `Monte de compra com ${plural(game.stockSize, "carta", "cartas")}`
  return (
    <section
      aria-label="Mesa"
      className="flex flex-col items-center gap-2 rounded-2xl bg-felt-deep/40 p-3 ring-1 ring-felt-line"
    >
      <div className="flex items-end justify-center gap-6 sm:gap-10">
        <PileSpot label="Vira">
          <CardFace
            card={game.vira}
            size="pile"
            role="img"
            aria-label={`Vira: ${cardName(game.vira)}`}
            className="ring-2 ring-gold"
          />
        </PileSpot>

        <PileSpot label="Monte">
          <button
            type="button"
            aria-label={
              canDraw ? `Comprar do monte. ${stockLabel}` : stockLabel
            }
            disabled={!canDraw}
            onClick={onDraw}
            className={cn(
              "relative block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400 disabled:cursor-default",
              canDraw &&
                "transition-transform hover:-translate-y-1 active:scale-95"
            )}
          >
            {game.stockSize > 0 ? (
              <CardBack
                className={cn(
                  "h-16 w-12 lg:h-20 lg:w-14",
                  canDraw && "ring-2 ring-gold"
                )}
              />
            ) : (
              <span className="flex h-16 w-12 items-center justify-center rounded-lg border-2 border-dashed border-felt-line lg:h-20 lg:w-14">
                <Layers aria-hidden className="size-4 text-felt-muted" />
              </span>
            )}
            <CountBadge count={game.stockSize} />
          </button>
        </PileSpot>

        <PileSpot label="Descarte">
          <span
            role="img"
            aria-label={
              game.discardTop
                ? `Descarte com ${plural(game.discardSize, "carta", "cartas")}, topo ${cardName(game.discardTop)}`
                : "Descarte vazio"
            }
            className="relative block"
          >
            {game.discardTop ? (
              <m.div layoutId={trincaCardLayoutId(game.discardTop)}>
                <CardFace card={game.discardTop} size="pile" />
              </m.div>
            ) : (
              <span className="flex h-16 w-12 items-center justify-center rounded-lg border-2 border-dashed border-felt-line lg:h-20 lg:w-14" />
            )}
            {game.discardSize > 0 && <CountBadge count={game.discardSize} />}
          </span>
        </PileSpot>
      </div>
      <p className="text-sm font-semibold text-gold">{describeJokers(game)}</p>
    </section>
  )
}

export function TrincaTable({
  room,
  game,
  canDraw,
  onDraw,
}: {
  room: RoomState
  game: TresTrincasState
  canDraw: boolean
  onDraw: () => void
}) {
  const opponents = game.players.filter((player) => player.id !== room.viewerId)
  const mine = game.players.find((player) => player.id === room.viewerId)
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Adversários">
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
          {opponents.map((player) => (
            <OpponentPanel
              key={player.id}
              player={player}
              game={game}
              connected={
                room.players.find((seated) => seated.id === player.id)
                  ?.connected ?? false
              }
            />
          ))}
        </ul>
      </section>

      <CenterRow game={game} canDraw={canDraw} onDraw={onDraw} />

      {mine && (
        <section
          aria-labelledby="minhas-trincas"
          className="flex flex-col gap-2"
        >
          <h2
            id="minhas-trincas"
            className="font-heading text-sm font-semibold text-felt-muted"
          >
            Suas trincas · {mine.sets.length}/{SETS_TO_WIN}
          </h2>
          <MeldedSets
            sets={mine.sets}
            wildRank={game.wildRank}
            size="large"
            showSlots
          />
        </section>
      )}
    </div>
  )
}
