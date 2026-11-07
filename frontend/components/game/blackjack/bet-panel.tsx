"use client"

import { useState } from "react"
import { m } from "framer-motion"
import { Coins, RotateCcw } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { Chip, ChipStack } from "@/components/game/poker/chips"
import type { ChipValue } from "@/lib/game/domain/poker/chips"
import {
  BET_CHIPS,
  clampBet,
  formatChips,
  isValidBet,
} from "@/lib/game/domain/blackjack/guide"
import type { BetRange } from "@/lib/game/domain/blackjack/types"
import { cn } from "@/lib/utils"

const CHIP_FACES: Readonly<Record<(typeof BET_CHIPS)[number], ChipValue>> = {
  10: 5,
  50: 25,
  100: 100,
  500: 500,
}

export function BetPanel({
  range,
  chips,
  lastBet,
  busy,
  onBet,
}: {
  range: BetRange
  chips: number
  lastBet: number | null
  busy: boolean
  onBet: (amount: number) => void
}) {
  const [stake, setStake] = useState(() =>
    clampBet(lastBet ?? range.min, range.max, range.min)
  )
  const add = (value: number) =>
    setStake((current) => clampBet(current + value, range.max, range.min))
  const valid = isValidBet(stake, chips)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <ChipStack amount={stake} label={false} className="scale-150" />
        <m.span
          key={stake}
          initial={{ scale: 1.25, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-heading text-3xl font-extrabold text-gold tabular-nums"
        >
          {formatChips(stake)}
        </m.span>
      </div>
      <ul aria-label="Fichas para apostar" className="flex gap-2">
        {BET_CHIPS.map((value) => (
          <li key={value}>
            <button
              type="button"
              disabled={busy || stake >= range.max}
              onClick={() => add(value)}
              aria-label={`Somar ${value} fichas`}
              className="group relative flex size-12 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400 disabled:opacity-40"
            >
              <Chip
                value={CHIP_FACES[value]}
                className="absolute inset-0 size-12 transition-transform group-hover:-translate-y-1 group-active:scale-90"
              />
              <span className="relative font-heading text-xs font-extrabold text-white drop-shadow">
                +{value}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-wrap justify-center gap-2">
        <GameButton
          disabled={busy || stake === range.min}
          onClick={() => setStake(range.min)}
          className="flex-1 sm:flex-none"
        >
          <RotateCcw aria-hidden />
          Mínima
        </GameButton>
        <GameButton
          disabled={busy || stake === range.max}
          onClick={() => setStake(range.max)}
          className="flex-1 sm:flex-none"
        >
          Tudo
        </GameButton>
        <GameButton
          tone="gold"
          disabled={busy || !valid}
          onClick={() => onBet(stake)}
          className={cn("w-full sm:w-auto")}
        >
          <Coins aria-hidden />
          Apostar {formatChips(stake)}
        </GameButton>
      </div>
    </div>
  )
}
