"use client"

import { AnimatePresence, m } from "framer-motion"

import { DealtCard } from "@/components/game/blackjack/blackjack-cards"
import { BlackjackFlare } from "@/components/game/blackjack/blackjack-flare"
import type { CardSize } from "@/components/game/blackjack/blackjack-cards"
import { ChipStack } from "@/components/game/poker/chips"
import {
  formatNet,
  handLabel,
  isNaturalHand,
  isWinning,
  OUTCOME_LABELS,
  TWENTY_ONE,
} from "@/lib/game/domain/blackjack/guide"
import type {
  BlackjackHand,
  HandResult,
} from "@/lib/game/domain/blackjack/types"
import { cn } from "@/lib/utils"

const OUTCOME_TONES = {
  good: "bg-emerald-400 text-emerald-950",
  bad: "bg-rose-500 text-white",
  even: "bg-white/85 text-felt-deep",
} as const

const toneOf = (result: HandResult) => {
  if (isWinning(result.outcome)) return OUTCOME_TONES.good
  return result.outcome === "push" ? OUTCOME_TONES.even : OUTCOME_TONES.bad
}

function OutcomeBadge({ result }: { result: HandResult }) {
  return (
    <m.span
      initial={{ scale: 0, rotate: -18 }}
      animate={{ scale: 1, rotate: -6 }}
      transition={{ type: "spring", stiffness: 420, damping: 14, delay: 0.2 }}
      className={cn(
        "absolute -top-3 right-0 z-10 rounded-md px-1.5 py-0.5 font-heading text-xs font-extrabold whitespace-nowrap shadow-lg",
        toneOf(result)
      )}
    >
      {OUTCOME_LABELS[result.outcome]}{" "}
      {result.outcome !== "push" && formatNet(result.net)}
    </m.span>
  )
}

export function SeatHands({
  hands,
  round,
  results,
  activeIndex,
  size,
}: {
  hands: readonly BlackjackHand[]
  round: number
  results: readonly HandResult[]
  activeIndex: number | null
  size: CardSize
}) {
  return (
    <ul className="flex max-w-full flex-wrap items-end justify-center gap-4 overflow-x-auto px-1">
      {hands.map((hand, handIndex) => {
        const result = results.find((entry) => entry.handIndex === handIndex)
        const active = activeIndex === handIndex
        const bust = hand.total > TWENTY_ONE
        const natural = isNaturalHand(hand)
        return (
          <li
            key={handIndex}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-shadow",
              active && "shadow-[0_0_0_2px_var(--gold),0_0_18px_var(--gold)]",
              hands.length > 1 && !active && "opacity-80",
              natural && "shadow-[0_0_0_2px_var(--gold),0_0_26px_var(--gold)]"
            )}
          >
            {natural && (
              <BlackjackFlare
                key={`flare-${round}`}
                size={size === "large" ? "large" : "small"}
              />
            )}
            <AnimatePresence>
              {result && <OutcomeBadge result={result} />}
            </AnimatePresence>
            <m.ul
              animate={
                natural
                  ? { y: [0, -14, 0], rotate: [0, -3, 0], scale: [1, 1.08, 1] }
                  : { y: 0, rotate: 0, scale: 1 }
              }
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className={cn(
                "flex items-end",
                bust && "opacity-60 grayscale-[40%]"
              )}
            >
              {hand.cards.map((card, index) => (
                <DealtCard
                  key={`${round}-${handIndex}-${card}`}
                  card={card}
                  index={index}
                  size={size}
                  sideways={hand.doubled && index === 2}
                />
              ))}
            </m.ul>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-heading text-sm font-bold tabular-nums ring-1",
                  bust
                    ? "bg-rose-500/20 text-rose-200 ring-rose-400/50"
                    : "bg-black/45 text-white ring-white/15"
                )}
              >
                {handLabel(hand)}
              </span>
              <ChipStack amount={hand.bet} />
              {hand.doubled && (
                <span className="text-xs font-bold text-gold">dobrou</span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
