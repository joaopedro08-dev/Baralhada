"use client"

import { useRef } from "react"
import { AnimatePresence, m } from "framer-motion"
import { Crown, Sparkles } from "lucide-react"

import { PointsMeter } from "@/components/game/cacheta/points-meter"
import { CardFace } from "@/components/game/cards/card-face"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap"
import { cardName } from "@/lib/game/domain/cards"
import {
  describeLoss,
  knockTitle,
  labelOf,
  meldTitle,
  nicknameOf,
} from "@/lib/game/domain/cacheta/guide"
import type {
  CachetaState,
  Meld,
  RoundResult,
} from "@/lib/game/domain/cacheta/types"
import type { PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const MELDS_DELAY_S = 0.7
const CARD_STEP_S = 0.07
const LOSSES_DELAY_S = 2.2

function Marquee({ title, clean }: { title: string; clean: boolean }) {
  const letters = [...`${title}!`.toUpperCase()]
  return (
    <m.div
      initial={{ scaleX: 0.3, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
      className={cn(
        "relative overflow-hidden rounded-xl bg-black/50 px-3 py-2 ring-2",
        clean ? "ring-emerald-300/80" : "ring-gold/80"
      )}
    >
      <span
        aria-hidden
        className="marquee-bulbs absolute inset-x-1 top-0.5 h-1.5"
      />
      <span
        aria-hidden
        className="marquee-bulbs absolute inset-x-1 bottom-0.5 h-1.5"
      />
      <p className="sheen text-center font-heading text-2xl leading-tight font-extrabold tracking-[0.18em] sm:text-3xl">
        {letters.map((letter, index) => (
          <m.span
            key={`${letter}-${index}`}
            initial={{ opacity: 0, y: 12, rotate: -8 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.3 + index * 0.04 }}
            className="inline-block whitespace-pre"
          >
            {letter}
          </m.span>
        ))}
      </p>
    </m.div>
  )
}

function MeldRow({ meld, offset }: { meld: Meld; offset: number }) {
  return (
    <li className="flex flex-col items-center gap-1">
      <ul
        aria-label={`${meldTitle(meld)}: ${meld.cards.map(cardName).join(", ")}`}
        className="flex [perspective:600px]"
      >
        {meld.cards.map((card, index) => (
          <m.li
            key={`${card}-${index}`}
            initial={{ rotateY: 90, y: 16, opacity: 0 }}
            animate={{ rotateY: 0, y: 0, opacity: 1 }}
            transition={{
              delay: MELDS_DELAY_S + (offset + index) * CARD_STEP_S,
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className={cn("relative", index > 0 && "-ml-4")}
          >
            <CardFace
              card={card}
              size="pile"
              className={cn(
                "h-14 w-10 lg:h-14 lg:w-10 [&>span]:text-base lg:[&>span]:text-base [&>svg]:size-4 lg:[&>svg]:size-4",
                meld.jokers[index] && "ring-2 ring-gold"
              )}
            />
            {meld.jokers[index] && (
              <Sparkles
                aria-hidden
                className="absolute -top-1.5 -right-1 size-3.5 text-gold"
              />
            )}
          </m.li>
        ))}
      </ul>
      <span className="text-[0.65rem] font-semibold text-felt-muted">
        {meldTitle(meld)}
      </span>
    </li>
  )
}

function Losses({
  game,
  result,
  viewerId,
}: {
  game: CachetaState
  result: RoundResult
  viewerId: PlayerId
}) {
  const board = useRef<HTMLUListElement>(null)
  useGSAP(
    () => {
      const node = board.current
      if (!node || prefersReducedMotion()) return
      const rows = node.querySelectorAll("[data-loss]")
      const stamps = node.querySelectorAll("[data-stamp]")
      if (rows.length > 0) {
        gsap.to(rows, {
          keyframes: { x: [-4, 4, -3, 3, 0] },
          duration: 0.4,
          delay: LOSSES_DELAY_S + 0.4,
          stagger: 0.12,
        })
      }
      if (stamps.length > 0) {
        gsap.fromTo(
          stamps,
          { scale: 2.6, rotate: -28, opacity: 0 },
          {
            scale: 1,
            rotate: -10,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(2.4)",
            delay: LOSSES_DELAY_S + 0.9,
            stagger: 0.2,
          }
        )
      }
    },
    { scope: board }
  )
  return (
    <ul ref={board} className="flex flex-col gap-1.5">
      {result.losses.map((loss) => {
        const out = result.eliminatedIds.includes(loss.playerId)
        return (
          <li
            key={loss.playerId}
            data-loss
            className="relative flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5"
          >
            <PlayerAvatar
              playerId={loss.playerId}
              nickname={nicknameOf(game, loss.playerId)}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {labelOf(game, loss.playerId, viewerId)}
            </span>
            <PointsMeter
              points={loss.after}
              from={loss.before}
              delay={LOSSES_DELAY_S}
            />
            <m.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: LOSSES_DELAY_S }}
              className="w-7 text-right font-heading text-sm font-bold text-rose-300 tabular-nums"
            >
              −{loss.before - loss.after}
            </m.span>
            {out && (
              <span
                data-stamp
                className="absolute top-1/2 left-1/3 -translate-y-1/2 rounded border-2 border-rose-400 px-1.5 font-heading text-sm font-extrabold tracking-widest text-rose-300 uppercase opacity-0"
              >
                Eliminado
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ShowcaseBody({
  game,
  result,
  viewerId,
}: {
  game: CachetaState
  result: RoundResult
  viewerId: PlayerId
}) {
  const knocker = labelOf(game, result.knockerId, viewerId)
  const offsets = result.melds.map((_, index) =>
    result.melds
      .slice(0, index)
      .reduce((total, meld) => total + meld.cards.length, 0)
  )
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <m.span
          initial={{ rotate: -40, scale: 0.2 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 480, damping: 12 }}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-gold-foreground"
        >
          <Crown aria-hidden className="size-5" />
        </m.span>
        <div className="min-w-0">
          <p className="font-heading text-lg leading-tight font-bold">
            {result.knockerId === viewerId ? "Você bateu!" : `${knocker} bateu`}
          </p>
          <p className="text-sm text-felt-muted">{describeLoss(result)}</p>
        </div>
      </div>
      <Marquee title={knockTitle(result)} clean={result.clean} />
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-2">
        {result.melds.map((meld, index) => (
          <MeldRow
            key={meld.cards.join("-")}
            meld={meld}
            offset={offsets[index] ?? 0}
          />
        ))}
      </ul>
      <div className="flex items-center justify-center gap-2 text-xs text-felt-muted">
        Descartou
        <CardFace
          card={result.discard}
          size="pile"
          className="h-9 w-7 lg:h-9 lg:w-7 [&>span]:text-xs lg:[&>span]:text-xs [&>svg]:size-3 lg:[&>svg]:size-3"
        />
      </div>
      <Losses game={game} result={result} viewerId={viewerId} />
    </div>
  )
}

const describeForReaders = (
  game: CachetaState,
  result: RoundResult,
  viewerId: PlayerId
): string =>
  [
    `${labelOf(game, result.knockerId, viewerId)} ${knockTitle(result).toLowerCase()}.`,
    describeLoss(result),
    ...result.eliminatedIds.map(
      (id) => `${labelOf(game, id, viewerId)} foi eliminado.`
    ),
  ].join(" ")

export function KnockShowcase({
  game,
  result,
  viewerId,
}: {
  game: CachetaState
  result: RoundResult | null
  viewerId: PlayerId
}) {
  return (
    <>
      <p role="status" className="sr-only">
        {result ? describeForReaders(game, result, viewerId) : ""}
      </p>
      <AnimatePresence>
        {result && (
          <m.div
            key={`${result.round}-${result.knockerId}`}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]"
          >
            <m.div
              initial={{ y: 40, scale: 0.85 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className={cn(
                "max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-felt-deep/95 p-4 text-felt-foreground shadow-2xl ring-2",
                result.knockerId === viewerId
                  ? "ring-emerald-400/80"
                  : "ring-gold/70"
              )}
            >
              <ShowcaseBody game={game} result={result} viewerId={viewerId} />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
