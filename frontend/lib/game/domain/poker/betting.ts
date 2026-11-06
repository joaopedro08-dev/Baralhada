import { formatChips, playerOf } from "@/lib/game/domain/poker/guide"
import type {
  BetRange,
  PokerAction,
  PokerState,
} from "@/lib/game/domain/poker/types"
import type { PlayerId } from "@/lib/game/domain/types"

export type PressKind = "bet" | "raise"

export interface Press {
  readonly kind: PressKind
  readonly range: BetRange
}

export interface QuickBet {
  readonly label: string
  readonly amount: number
}

export const pressOf = (game: PokerState): Press | null => {
  const { bet, raise } = game.moves
  if (bet) return { kind: "bet", range: bet }
  return raise ? { kind: "raise", range: raise } : null
}

export const clampAmount = (amount: number, range: BetRange): number =>
  Math.min(range.max, Math.max(range.min, Math.round(amount)))

const potSizedTotal = (
  game: PokerState,
  viewerId: PlayerId,
  fraction: number
): number => {
  const myBet = playerOf(game, viewerId)?.bet ?? 0
  const toCall = Math.max(0, game.currentBet - myBet)
  return game.currentBet + (game.potTotal + toCall) * fraction
}

export const quickBets = (
  game: PokerState,
  viewerId: PlayerId
): readonly QuickBet[] => {
  const press = pressOf(game)
  if (!press) return []
  const { range } = press
  const options: readonly QuickBet[] = [
    { label: "Mín.", amount: range.min },
    {
      label: "½ pote",
      amount: clampAmount(potSizedTotal(game, viewerId, 0.5), range),
    },
    {
      label: "Pote",
      amount: clampAmount(potSizedTotal(game, viewerId, 1), range),
    },
    { label: "All-in", amount: range.max },
  ]
  return options.filter(
    (option, index) =>
      options.findIndex((other) => other.amount === option.amount) === index
  )
}

export const pressAction = (press: Press, amount: number): PokerAction =>
  press.kind === "bet"
    ? { type: "bet", amount: clampAmount(amount, press.range) }
    : { type: "raise", amount: clampAmount(amount, press.range) }

export const pressLabel = (press: Press, amount: number): string => {
  if (amount >= press.range.max) return `All-in ${formatChips(amount)}`
  return press.kind === "bet"
    ? `Apostar ${formatChips(amount)}`
    : `Aumentar para ${formatChips(amount)}`
}

export const callLabel = (game: PokerState, viewerId: PlayerId): string => {
  const amount = game.moves.call ?? 0
  const chips = playerOf(game, viewerId)?.chips ?? 0
  return amount >= chips
    ? `Pagar ${formatChips(amount)} (all-in)`
    : `Pagar ${formatChips(amount)}`
}

export const sliderStep = (range: BetRange, bigBlind: number): number =>
  range.max - range.min <= bigBlind ? 1 : Math.max(1, Math.floor(bigBlind / 2))
