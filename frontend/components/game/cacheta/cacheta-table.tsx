"use client"

import { useRef } from "react"
import { m } from "framer-motion"
import { Hand, Layers, Sparkles, WifiOff } from "lucide-react"

import { PointsMeter } from "@/components/game/cacheta/points-meter"
import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { Badge } from "@/components/ui/badge"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap"
import { cardName, plural, rankName } from "@/lib/game/domain/cards"
import { describeStatus } from "@/lib/game/domain/cacheta/guide"
import type {
  CachetaPlayer,
  CachetaState,
} from "@/lib/game/domain/cacheta/types"
import type { RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const MAX_BACKS = 10

function OpponentPanel({
  player,
  current,
  connected,
}: {
  player: CachetaPlayer
  current: boolean
  connected: boolean
}) {
  const status = describeStatus(player)
  const backs = Math.min(player.handSize, MAX_BACKS)
  return (
    <li
      data-player={player.nickname}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl bg-felt-deep/90 p-2 ring-1 ring-felt-line transition-shadow",
        current && "shadow-[0_0_0_2px_var(--gold)]",
        status && "opacity-60 grayscale"
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
        {current && (
          <Badge className="h-5 bg-gold text-xs font-bold text-gold-foreground">
            Vez
          </Badge>
        )}
        {status && (
          <Badge variant="outline" className="h-5 text-xs text-felt-muted">
            {status}
          </Badge>
        )}
      </div>
      <PointsMeter points={player.points} />
      <div className="flex items-center justify-between gap-2 text-sm text-felt-muted">
        <span
          aria-label={plural(player.handSize, "carta", "cartas")}
          className="flex h-6 items-end pl-2"
        >
          {Array.from({ length: backs }, (_, index) => (
            <CardBack key={index} className="-ml-2 h-6 w-4 shadow-sm" />
          ))}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Hand aria-hidden className="size-3.5" />
          {player.handSize}
          {!connected && <WifiOff aria-label="caiu" className="size-3.5" />}
        </span>
      </div>
    </li>
  )
}

function ViraCard({ game }: { game: CachetaState }) {
  const flipper = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const node = flipper.current
      const chip = document.querySelector("[data-joker-chip]")
      if (!node || !chip || prefersReducedMotion()) return
      gsap
        .timeline()
        .fromTo(
          node,
          { rotateY: 180, y: -24, scale: 0.8 },
          { rotateY: 0, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.6)" }
        )
        .fromTo(
          chip,
          { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.2)" },
          "-=0.25"
        )
    },
    { dependencies: [game.round] }
  )
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="[perspective:700px]">
        <div
          ref={flipper}
          className="relative [transform-style:preserve-3d]"
          role="img"
          aria-label={`Vira: ${cardName(game.vira)}`}
        >
          <CardFace
            card={game.vira}
            size="pile"
            className="ring-2 ring-gold [backface-visibility:hidden]"
          />
          <CardBack className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]" />
        </div>
      </div>
      <span className="text-xs font-medium text-felt-muted">Vira</span>
    </div>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-2 -bottom-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-felt-deep px-1 font-heading text-xs font-bold text-white tabular-nums ring-1 ring-felt-line">
      {count}
    </span>
  )
}

function StockPile({
  game,
  canDraw,
  onDraw,
}: {
  game: CachetaState
  canDraw: boolean
  onDraw: () => void
}) {
  const label = `Monte de compra com ${plural(game.stockSize, "carta", "cartas")}`
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={canDraw ? `Comprar do monte. ${label}` : label}
        disabled={!canDraw}
        onClick={onDraw}
        className={cn(
          "relative block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400 disabled:cursor-default",
          canDraw && "transition-transform hover:-translate-y-1 active:scale-95"
        )}
      >
        <span aria-hidden className="absolute top-1 left-1 block">
          <CardBack className="h-16 w-12 opacity-70 lg:h-20 lg:w-14" />
        </span>
        <CardBack
          className={cn(
            "relative h-16 w-12 lg:h-20 lg:w-14",
            canDraw && "ring-2 ring-gold"
          )}
        />
        <CountBadge count={game.stockSize} />
      </button>
      <span className="text-xs font-medium text-felt-muted">Monte</span>
    </div>
  )
}

function DiscardPile({
  game,
  canTake,
  onTake,
}: {
  game: CachetaState
  canTake: boolean
  onTake: () => void
}) {
  const top = game.discardTop
  const label = top
    ? `Descarte com ${plural(game.discardSize, "carta", "cartas")}, topo ${cardName(top)}`
    : "Descarte vazio"
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={canTake && top ? `Pegar ${cardName(top)}. ${label}` : label}
        disabled={!canTake}
        onClick={onTake}
        className={cn(
          "relative block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400 disabled:cursor-default",
          canTake && "transition-transform hover:-translate-y-1 active:scale-95"
        )}
      >
        {top ? (
          <m.div
            key={`${top}-${game.discardSize}`}
            initial={{ y: -30, rotate: -12, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 20 }}
          >
            <CardFace
              card={top}
              size="pile"
              className={cn(canTake && "ring-2 ring-gold")}
            />
          </m.div>
        ) : (
          <span className="flex h-16 w-12 items-center justify-center rounded-lg border-2 border-dashed border-felt-line lg:h-20 lg:w-14">
            <Layers aria-hidden className="size-4 text-felt-muted" />
          </span>
        )}
        {game.discardSize > 0 && <CountBadge count={game.discardSize} />}
      </button>
      <span className="text-xs font-medium text-felt-muted">Descarte</span>
    </div>
  )
}

export function CachetaTable({
  room,
  game,
  canDraw,
  canTake,
  onDraw,
  onTake,
}: {
  room: RoomState
  game: CachetaState
  canDraw: boolean
  canTake: boolean
  onDraw: () => void
  onTake: () => void
}) {
  const opponents = game.players.filter((player) => player.id !== room.viewerId)
  const moving = game.pending !== null
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Adversários">
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
          {opponents.map((player) => (
            <OpponentPanel
              key={player.id}
              player={player}
              current={!moving && player.id === game.currentPlayerId}
              connected={
                room.players.find((seated) => seated.id === player.id)
                  ?.connected ?? false
              }
            />
          ))}
        </ul>
      </section>

      <section
        aria-label="Mesa"
        className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-felt-deep/40 px-3 pt-3 pb-4 ring-1 ring-felt-line"
      >
        <div className="flex w-full items-center justify-between text-xs font-semibold text-felt-muted">
          <span className="font-heading tracking-[0.2em] uppercase">
            Rodada {game.round}
          </span>
          <span
            data-joker-chip
            className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-sm font-bold text-gold ring-1 ring-gold/50"
          >
            <Sparkles aria-hidden className="size-3.5" />
            Coringa: {rankName(game.wildRank)}
          </span>
        </div>
        <div className="flex items-end justify-center gap-6 sm:gap-10">
          <ViraCard game={game} />
          <StockPile game={game} canDraw={canDraw} onDraw={onDraw} />
          <DiscardPile game={game} canTake={canTake} onTake={onTake} />
        </div>
      </section>
    </div>
  )
}
