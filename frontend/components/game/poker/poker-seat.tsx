"use client"

import { useRef } from "react"
import { AnimatePresence, m } from "framer-motion"
import { Crown, WifiOff } from "lucide-react"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { ChipCount } from "@/components/game/poker/chips"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap"
import { cardName } from "@/lib/game/domain/cards"
import {
  formatChips,
  HAND_NAMES,
  positionsOf,
  statusLabel,
} from "@/lib/game/domain/poker/guide"
import type { Position } from "@/lib/game/domain/poker/guide"
import type { SeatSpot } from "@/lib/game/domain/poker/seating"
import type {
  PokerPlayer,
  PokerState,
  ShownHand,
} from "@/lib/game/domain/poker/types"
import type { Card } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const MINI_CARD =
  "h-9 w-[1.6rem] sm:h-11 sm:w-8 [&>span:first-child]:top-0.5 [&>span:first-child]:left-1 [&>span:first-child]:text-[0.7rem] sm:[&>span:first-child]:text-xs [&>svg]:size-3 sm:[&>svg]:size-3.5"

const POSITION_STYLES: Readonly<Record<Position, string>> = {
  D: "bg-white text-black",
  SB: "bg-sky-300 text-sky-950",
  BB: "bg-amber-300 text-amber-950",
}

const POSITION_LABELS: Readonly<Record<Position, string>> = {
  D: "Botão",
  SB: "Small blind",
  BB: "Big blind",
}

function SeatCards({
  player,
  shown,
  highlight,
}: {
  player: PokerPlayer
  shown: ShownHand | undefined
  highlight: readonly Card[] | null
}) {
  if (shown) {
    return (
      <span className="flex -space-x-2.5 [perspective:400px]">
        {shown.hole.map((card, index) => (
          <m.span
            key={card}
            initial={{ rotateY: 180, y: 6 }}
            animate={{ rotateY: 0, y: 0 }}
            transition={{ delay: 0.15 + index * 0.12, duration: 0.45 }}
            style={{ rotate: index === 0 ? -6 : 6 }}
          >
            <CardFace
              card={card}
              size="pile"
              aria-label={cardName(card)}
              className={cn(
                MINI_CARD,
                highlight?.includes(card) && "hint-best",
                highlight && !highlight.includes(card) && "opacity-60"
              )}
            />
          </m.span>
        ))}
      </span>
    )
  }
  if (player.holeCount === 0 || player.status === "folded") {
    return <span className="h-9 sm:h-11" />
  }
  return (
    <span className="flex -space-x-3">
      {[0, 1].map((index) => (
        <m.span
          key={index}
          initial={{ y: -30, opacity: 0, rotate: 0 }}
          animate={{ y: 0, opacity: 1, rotate: index === 0 ? -7 : 7 }}
          transition={{
            delay: index * 0.1,
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        >
          <CardBack className="h-9 w-[1.6rem] sm:h-11 sm:w-8" />
        </m.span>
      ))}
    </span>
  )
}

const useAllInShock = (status: PokerPlayer["status"]) => {
  const plate = useRef<HTMLDivElement>(null)
  const wave = useRef<HTMLSpanElement>(null)
  const previous = useRef(status)

  useGSAP(
    () => {
      const wentAllIn = status === "allIn" && previous.current !== "allIn"
      previous.current = status
      if (!wentAllIn || prefersReducedMotion()) return
      gsap
        .timeline()
        .fromTo(
          wave.current,
          { scale: 0.6, opacity: 0.9 },
          { scale: 2.2, opacity: 0, duration: 0.8, ease: "power2.out" }
        )
        .fromTo(
          plate.current,
          { scale: 1 },
          {
            scale: 1.12,
            duration: 0.14,
            yoyo: true,
            repeat: 3,
            ease: "power1.inOut",
          },
          0
        )
    },
    { dependencies: [status] }
  )

  return { plate, wave }
}

export function PokerSeat({
  game,
  player,
  spot,
  isViewer,
  connected,
  shown,
  winnings,
  highlight,
  held,
}: {
  game: PokerState
  player: PokerPlayer
  spot: SeatSpot
  isViewer: boolean
  connected: boolean
  shown: ShownHand | undefined
  winnings: number
  highlight: readonly Card[] | null
  held: boolean
}) {
  const acting =
    !held && game.currentPlayerId === player.id && game.endReason === null
  const status = statusLabel(player.status)
  const positions = held ? [] : positionsOf(game, player.id)
  const { plate, wave } = useAllInShock(player.status)
  const won = winnings > 0

  return (
    <div
      data-seat={player.id}
      className="absolute flex w-[4.6rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center sm:w-24"
      style={{ left: `${spot.seat.x}%`, top: `${spot.seat.y}%` }}
    >
      {(!isViewer || shown) && (
        <SeatCards player={player} shown={shown} highlight={highlight} />
      )}

      <m.div
        ref={plate}
        animate={
          acting
            ? {
                boxShadow: [
                  "0 0 0 2px var(--gold), 0 0 0px 0px var(--gold)",
                  "0 0 0 2px var(--gold), 0 0 16px 3px var(--gold)",
                ],
              }
            : {
                boxShadow: won
                  ? "0 0 0 2px var(--gold), 0 0 22px 4px var(--gold)"
                  : "0 0 0 1px var(--felt-line)",
              }
        }
        transition={
          acting
            ? { duration: 0.9, repeat: Infinity, repeatType: "reverse" }
            : { duration: 0.3 }
        }
        className={cn(
          "relative -mt-2 flex w-full flex-col gap-0.5 rounded-xl bg-felt-deep/95 px-1.5 py-1 text-left",
          player.status === "folded" && !held && "opacity-55",
          player.status === "out" && "opacity-40 grayscale"
        )}
      >
        <span
          ref={wave}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-rose-400"
        />
        <span className="flex min-w-0 items-center gap-1">
          <PlayerAvatar
            playerId={player.id}
            nickname={player.nickname}
            size="sm"
          />
          <span className="min-w-0 truncate text-xs font-semibold sm:text-sm">
            {isViewer ? "Você" : player.nickname}
          </span>
          {!connected && (
            <WifiOff
              aria-label="Sem conexão"
              className="size-3 shrink-0 text-felt-muted"
            />
          )}
        </span>
        <span className="flex items-center justify-between gap-1 text-xs">
          <ChipCount
            value={player.chips}
            className="font-heading font-bold text-gold"
          />
          {status && !held && (
            <span
              className={cn(
                "rounded px-1 text-[0.6rem] font-bold uppercase",
                player.status === "allIn"
                  ? "bg-rose-500 text-white"
                  : "bg-white/15"
              )}
            >
              {status}
            </span>
          )}
        </span>
        {shown && (
          <span className="truncate text-[0.65rem] font-semibold text-felt-muted">
            {HAND_NAMES[shown.category]}
          </span>
        )}
        {positions.length > 0 && (
          <span className="absolute -top-2 -right-2 flex gap-0.5">
            {positions.map((position) => (
              <m.span
                key={position}
                layoutId={`posicao-${position}`}
                aria-label={POSITION_LABELS[position]}
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.6rem] font-extrabold shadow ring-1 ring-black/30",
                  POSITION_STYLES[position]
                )}
              >
                {position}
              </m.span>
            ))}
          </span>
        )}
      </m.div>

      <AnimatePresence>
        {won && (
          <m.span
            key="ganhou"
            initial={{ opacity: 0, y: 6, scale: 0.6 }}
            animate={{ opacity: 1, y: -6, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              delay: 0.9,
              type: "spring",
              stiffness: 300,
              damping: 16,
            }}
            className="absolute -bottom-5 flex items-center gap-0.5 rounded-full bg-gold px-1.5 text-xs font-extrabold text-gold-foreground shadow-lg"
          >
            <Crown aria-hidden className="size-3" />+{formatChips(winnings)}
          </m.span>
        )}
      </AnimatePresence>
    </div>
  )
}
