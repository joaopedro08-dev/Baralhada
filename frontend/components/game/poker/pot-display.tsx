"use client"

import { AnimatePresence, m } from "framer-motion"
import { Crown } from "lucide-react"

import { ChipCount, ChipStack } from "@/components/game/poker/chips"
import { formatChips, nicknameOf } from "@/lib/game/domain/poker/guide"
import type { PokerState, Pot, PotResult } from "@/lib/game/domain/poker/types"
import { cn } from "@/lib/utils"

const isResult = (pot: Pot | PotResult): pot is PotResult => "winnerIds" in pot

const potName = (index: number, count: number): string => {
  if (count === 1) return "Pote"
  return index === 0 ? "Pote principal" : `Pote paralelo ${index}`
}

const describeEligible = (game: PokerState, pot: Pot | PotResult): string => {
  if (isResult(pot)) {
    return `para ${pot.winnerIds.map((id) => nicknameOf(game, id)).join(" e ")}`
  }
  return pot.eligibleIds.map((id) => nicknameOf(game, id)).join(", ")
}

export function PotDisplay({
  game,
  pots,
  total,
}: {
  game: PokerState
  pots: readonly (Pot | PotResult)[]
  total: number | null
}) {
  const many = pots.length > 1
  return (
    <div data-pot className="flex min-h-9 flex-col items-center gap-1">
      <AnimatePresence initial={false}>
        {total !== null && total > 0 && (
          <m.p
            key="total"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-full bg-black/35 px-2.5 py-0.5 text-xs font-semibold text-felt-muted"
          >
            Pote total{" "}
            <ChipCount value={total} className="text-felt-foreground" />
          </m.p>
        )}
      </AnimatePresence>
      <ul
        className={cn(
          "flex flex-wrap items-center justify-center gap-x-3 gap-y-1",
          many && "max-w-60"
        )}
      >
        <AnimatePresence initial={false}>
          {pots.map((pot, index) => (
            <m.li
              key={`${index}-${pot.eligibleIds.join("-")}`}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="flex flex-col items-center"
              aria-label={`${potName(index, pots.length)}: ${formatChips(pot.amount)} fichas, ${describeEligible(game, pot)}`}
            >
              <ChipStack amount={pot.amount} />
              {(many || isResult(pot)) && (
                <span className="flex max-w-36 items-center gap-0.5 truncate text-[0.65rem] leading-tight text-felt-muted">
                  {isResult(pot) && (
                    <Crown aria-hidden className="size-3 shrink-0 text-gold" />
                  )}
                  <span className="truncate">
                    {many && `${potName(index, pots.length)} · `}
                    {describeEligible(game, pot)}
                  </span>
                </span>
              )}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
