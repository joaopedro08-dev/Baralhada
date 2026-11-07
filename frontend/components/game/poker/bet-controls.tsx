"use client"

import { useState } from "react"
import { AnimatePresence, m } from "framer-motion"
import { ChevronUp, Minus, Plus } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { ChipCount } from "@/components/game/poker/chips"
import { RefusalMessage } from "@/components/game/refusal-message"
import { Slider } from "@/components/ui/slider"
import {
  callLabel,
  clampAmount,
  pressAction,
  pressLabel,
  pressOf,
  quickBets,
  sliderStep,
} from "@/lib/game/domain/poker/betting"
import type { Press } from "@/lib/game/domain/poker/betting"
import { describeNextStep } from "@/lib/game/domain/poker/guide"
import type { PokerAction, PokerState } from "@/lib/game/domain/poker/types"
import type { PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function RaisePanel({
  game,
  viewerId,
  press,
  disabled,
  onConfirm,
}: {
  game: PokerState
  viewerId: PlayerId
  press: Press
  disabled: boolean
  onConfirm: (action: PokerAction) => void
}) {
  const [amount, setAmount] = useState(press.range.min)
  const step = sliderStep(press.range, game.blinds.big)
  const nudge = (direction: number) =>
    setAmount((current) => clampAmount(current + direction * step, press.range))
  const allIn = amount >= press.range.max

  return (
    <m.div
      initial={{ opacity: 0, y: 16, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: 16, height: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-2.5 rounded-xl bg-black/30 p-2.5 ring-1 ring-felt-line">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-felt-muted">
            {press.kind === "bet" ? "Apostar" : "Aumentar para"}
          </span>
          <m.span
            key={allIn ? "all-in" : "valor"}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={cn(
              "font-heading text-2xl font-extrabold text-gold",
              allIn && "text-rose-300"
            )}
          >
            {allIn ? "ALL-IN " : ""}
            <ChipCount value={amount} />
          </m.span>
        </div>

        <div className="flex items-center gap-2">
          <GameButton
            aria-label="Diminuir"
            className="size-11 px-0"
            disabled={amount <= press.range.min}
            onClick={() => nudge(-1)}
          >
            <Minus aria-hidden />
          </GameButton>
          <Slider
            aria-label="Valor da aposta"
            min={press.range.min}
            max={press.range.max}
            step={step}
            value={[amount]}
            onValueChange={([value]) =>
              setAmount(clampAmount(value ?? press.range.min, press.range))
            }
            className="flex-1 py-3 [&_[data-slot=slider-range]]:bg-gold [&_[data-slot=slider-thumb]]:size-6 [&_[data-slot=slider-thumb]]:rounded-full [&_[data-slot=slider-thumb]]:border-gold [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-black/40"
          />
          <GameButton
            aria-label="Aumentar o valor"
            className="size-11 px-0"
            disabled={allIn}
            onClick={() => nudge(1)}
          >
            <Plus aria-hidden />
          </GameButton>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {quickBets(game, viewerId).map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setAmount(option.amount)}
              className={cn(
                "min-h-11 rounded-lg bg-felt-deep px-1 text-xs font-semibold ring-1 ring-felt-line transition-colors hover:bg-felt-line/40 focus-visible:ring-[3px] focus-visible:ring-sky-400 active:scale-95",
                option.amount === amount && "bg-gold/20 ring-gold"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <GameButton
          tone="gold"
          disabled={disabled}
          onClick={() => onConfirm(pressAction(press, amount))}
          className={cn(
            "w-full",
            allIn && "bg-rose-400 text-rose-950 hover:bg-rose-300"
          )}
        >
          {pressLabel(press, amount)}
        </GameButton>
      </div>
    </m.div>
  )
}

export function BetControls({
  game,
  viewerId,
  busy,
  paused,
  refusal,
  onAction,
}: {
  game: PokerState
  viewerId: PlayerId
  busy: boolean
  paused: boolean
  refusal: string | null
  onAction: (action: PokerAction) => void
}) {
  const [raising, setRaising] = useState<number | null>(null)
  const myTurn =
    game.pending === null &&
    game.currentPlayerId === viewerId &&
    game.endReason === null
  const { moves } = game
  const press = pressOf(game)
  const disabled = busy || paused
  const panelOpen = myTurn && press !== null && raising === game.turnNumber

  const act = (action: PokerAction) => {
    setRaising(null)
    onAction(action)
  }

  if (!myTurn) {
    return (
      <p role="status" className="py-3 text-center text-sm text-felt-muted">
        {describeNextStep(game, viewerId)}
      </p>
    )
  }

  return (
    <section aria-label="Suas ações" className="flex flex-col gap-2">
      {refusal && <RefusalMessage>{refusal}</RefusalMessage>}
      <AnimatePresence initial={false}>
        {panelOpen && press && (
          <RaisePanel
            key={game.turnNumber}
            game={game}
            viewerId={viewerId}
            press={press}
            disabled={disabled}
            onConfirm={act}
          />
        )}
      </AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid auto-cols-fr grid-flow-col gap-2"
      >
        {moves.fold && (
          <GameButton disabled={disabled} onClick={() => act({ type: "fold" })}>
            Desistir
          </GameButton>
        )}
        {moves.check && (
          <GameButton
            disabled={disabled}
            onClick={() => act({ type: "check" })}
          >
            Passar
          </GameButton>
        )}
        {moves.call !== null && (
          <GameButton
            tone="gold"
            disabled={disabled}
            onClick={() => act({ type: "call" })}
          >
            {callLabel(game, viewerId)}
          </GameButton>
        )}
        {press && (
          <GameButton
            tone={moves.call === null ? "gold" : "felt"}
            aria-expanded={panelOpen}
            disabled={disabled}
            onClick={() => setRaising(panelOpen ? null : game.turnNumber)}
          >
            {press.kind === "bet" ? "Apostar" : "Aumentar"}
            <ChevronUp
              aria-hidden
              className={cn("transition-transform", !panelOpen && "rotate-180")}
            />
          </GameButton>
        )}
      </m.div>
    </section>
  )
}
