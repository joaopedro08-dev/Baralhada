"use client"

import { useRef } from "react"
import { AnimatePresence, m } from "framer-motion"

import { Chip } from "@/components/game/poker/chips"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap"
import {
  formatChips,
  formatNet,
  isWinning,
  OUTCOME_LABELS,
} from "@/lib/game/domain/blackjack/guide"
import type { HandResult, RoundResult } from "@/lib/game/domain/blackjack/types"
import type { PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const BURST_CHIPS = 12

const describeDealer = (result: RoundResult): string => {
  if (result.dealerBlackjack) return "A banca fez blackjack"
  if (result.dealerBust) return `A banca estourou com ${result.dealerTotal}`
  return `A banca parou com ${result.dealerTotal}`
}

const headlineOf = (mine: readonly HandResult[]): string => {
  if (mine.length === 0) return "Rodada encerrada"
  const net = mine.reduce((total, entry) => total + entry.net, 0)
  if (mine.some((entry) => entry.outcome === "blackjack")) return "Blackjack!"
  if (net > 0) return "Você ganhou!"
  if (net < 0)
    return mine.every((entry) => entry.outcome === "bust")
      ? "Estourou"
      : "Você perdeu"
  return "Empate"
}

function ChipBurst({ active }: { active: boolean }) {
  const burst = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      if (!active || !burst.current || prefersReducedMotion()) return
      gsap.fromTo(
        burst.current.children,
        { x: 0, y: 0, opacity: 1, rotate: 0 },
        {
          duration: 1.6,
          opacity: 0,
          rotate: () => gsap.utils.random(-360, 360),
          physics2D: {
            velocity: () => gsap.utils.random(220, 420),
            angle: () => gsap.utils.random(200, 340),
            gravity: 620,
          },
          stagger: 0.02,
        }
      )
    },
    { dependencies: [active], scope: burst }
  )
  return (
    <div
      ref={burst}
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2"
    >
      {Array.from({ length: active ? BURST_CHIPS : 0 }, (_, index) => (
        <Chip
          key={index}
          value={index % 3 === 0 ? 500 : index % 3 === 1 ? 100 : 25}
          className="absolute size-5"
        />
      ))}
    </div>
  )
}

export function RoundBanner({
  result,
  viewerId,
  finalChips,
}: {
  result: RoundResult | null
  viewerId: PlayerId
  finalChips: number | null
}) {
  const mine =
    result?.hands.filter((entry) => entry.playerId === viewerId) ?? []
  const net = mine.reduce((total, entry) => total + entry.net, 0)
  const won = mine.some((entry) => isWinning(entry.outcome))
  return (
    <>
      <p role="status" className="sr-only">
        {result
          ? `${describeDealer(result)}. ${mine.map((entry) => `${OUTCOME_LABELS[entry.outcome]} ${formatNet(entry.net)}`).join(". ")}`
          : ""}
      </p>
      <div className="flex shrink-0 justify-center empty:hidden">
        <AnimatePresence>
          {result && (
            <m.div
              key={result.round}
              aria-hidden
              initial={{ opacity: 0, y: -24, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className={cn(
                "relative w-full max-w-xs rounded-2xl bg-felt-deep/95 px-4 py-3 text-center text-felt-foreground shadow-2xl ring-2 backdrop-blur",
                won
                  ? "ring-emerald-400/80"
                  : net < 0
                    ? "ring-rose-400/70"
                    : "ring-gold/70"
              )}
            >
              <ChipBurst active={won} />
              <p className="text-xs font-semibold tracking-wide text-felt-muted uppercase">
                {describeDealer(result)}
              </p>
              <p className="sheen font-heading text-2xl font-extrabold tracking-wide">
                {headlineOf(mine)}
              </p>
              {mine.length > 0 && (
                <m.p
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: 0.35,
                    type: "spring",
                    stiffness: 420,
                    damping: 14,
                  }}
                  className={cn(
                    "font-heading text-3xl font-extrabold tabular-nums",
                    net > 0
                      ? "text-emerald-300"
                      : net < 0
                        ? "text-rose-300"
                        : "text-white"
                  )}
                >
                  {formatNet(net)}
                </m.p>
              )}
              {finalChips !== null && (
                <m.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="mt-2 border-t border-felt-line pt-2 text-sm font-semibold text-gold"
                >
                  Fim da partida · você termina com {formatChips(finalChips)}{" "}
                  fichas
                </m.p>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
