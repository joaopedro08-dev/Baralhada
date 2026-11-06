"use client"

import { Check, Clock, Users } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { CardFace } from "@/components/game/cards/card-face"
import { Badge } from "@/components/ui/badge"
import { describePlayerCounts, GAMES } from "@/lib/game/domain/catalog"
import type { GameInfo } from "@/lib/game/domain/catalog"
import type { GameId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function CompactOption({
  game,
  checked,
}: {
  game: GameInfo
  checked: boolean
}) {
  return (
    <>
      <span className="flex w-full items-center gap-2 font-heading text-base font-semibold">
        {game.name}
        {checked && <Check aria-hidden className="ml-auto size-4" />}
      </span>
      <span className="text-xs text-muted-foreground">
        {describePlayerCounts(game)} · {game.deck}
      </span>
    </>
  )
}

function DetailedOption({
  game,
  checked,
}: {
  game: GameInfo
  checked: boolean
}) {
  return (
    <>
      <span className="flex w-full items-center gap-3">
        <span aria-hidden className="flex shrink-0 -space-x-6 pl-1">
          {game.sample.map((card, index) => (
            <CardFace
              key={card}
              card={card}
              size="flying"
              className={cn(
                "h-14 w-10 text-xs shadow-md transition-transform",
                index === 0 && "-rotate-6",
                index === 2 && "rotate-6",
                checked && "-translate-y-0.5"
              )}
            />
          ))}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 font-heading text-lg leading-tight font-bold">
            {game.name}
            {checked && (
              <Check
                aria-hidden
                className="ml-auto size-5 rounded-full bg-gold p-0.5 text-gold-foreground"
              />
            )}
          </span>
          <span className="text-sm text-muted-foreground">{game.tagline}</span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="h-6 gap-1 text-xs">
          <Users aria-hidden className="size-3" />
          {describePlayerCounts(game)}
        </Badge>
        <Badge variant="secondary" className="h-6 gap-1 text-xs">
          <Clock aria-hidden className="size-3" />
          {game.turnSeconds} s por jogada
        </Badge>
        <Badge variant="outline" className="h-6 text-xs">
          {game.mode}
        </Badge>
      </span>
    </>
  )
}

export function GamePicker({
  value,
  onChange,
  disabled = false,
  label = "Escolha o jogo",
  detailed = false,
}: {
  value: GameId
  onChange: (gameId: GameId) => void
  disabled?: boolean
  label?: string
  detailed?: boolean
}) {
  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as GameId)}
      className={cn("grid grid-cols-1 gap-2", !detailed && "sm:grid-cols-2")}
    >
      {GAMES.map((game) => {
        const checked = game.id === value
        return (
          <RadioGroupPrimitive.Item
            key={game.id}
            value={game.id}
            aria-label={`${game.name}: ${describePlayerCounts(game)}, ${game.deck}`}
            className={cn(
              "relative flex min-h-11 flex-col items-start rounded-xl border-2 border-border bg-card text-left transition-all outline-none hover:border-gold/60 focus-visible:ring-[3px] focus-visible:ring-sky-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65",
              detailed ? "gap-3 p-3" : "gap-0.5 px-3 py-2",
              checked && "border-gold bg-gold/15 shadow-md"
            )}
          >
            {detailed ? (
              <DetailedOption game={game} checked={checked} />
            ) : (
              <CompactOption game={game} checked={checked} />
            )}
          </RadioGroupPrimitive.Item>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
