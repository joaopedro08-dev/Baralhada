import {
  formatChips,
  HAND_NAMES,
  nicknameOf,
} from "@/lib/game/domain/poker/guide"
import type {
  HandCategory,
  HandSummary,
  PokerState,
} from "@/lib/game/domain/poker/types"
import type { Card, PlayerId } from "@/lib/game/domain/types"

export const HAND_LADDER: readonly HandCategory[] = [
  "highCard",
  "pair",
  "twoPair",
  "threeOfAKind",
  "straight",
  "flush",
  "fullHouse",
  "fourOfAKind",
  "straightFlush",
  "royalFlush",
]

export type ShowcaseTone = "good" | "bad" | "neutral"

export interface ShowcaseWinner {
  readonly id: PlayerId
  readonly label: string
  readonly amount: number
}

export interface Showcase {
  readonly key: string
  readonly tone: ShowcaseTone
  readonly headline: string
  readonly category: HandCategory | null
  readonly level: number | null
  readonly cards: readonly Card[]
  readonly winners: readonly ShowcaseWinner[]
  readonly notes: readonly string[]
}

export const handResultOf = (game: PokerState): HandSummary | null => {
  const summary = game.lastHand
  if (!summary || summary.number !== game.handNumber) return null
  return game.pending === "nextHand" || game.endReason !== null ? summary : null
}

const labelOf = (game: PokerState, playerId: PlayerId, viewerId: PlayerId) =>
  playerId === viewerId ? "Você" : nicknameOf(game, playerId)

const joinNames = (names: readonly string[]): string =>
  names.length > 1
    ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`
    : (names[0] ?? "Alguém")

const toneOf = (summary: HandSummary, viewerId: PlayerId): ShowcaseTone => {
  if ((summary.winnings[viewerId] ?? 0) > 0) return "good"
  if (summary.eliminatedIds.includes(viewerId)) return "bad"
  return summary.shown.some((hand) => hand.playerId === viewerId)
    ? "bad"
    : "neutral"
}

const headlineOf = (
  names: readonly string[],
  summary: HandSummary,
  viewerWon: boolean
): string => {
  const who = joinNames(names)
  if (names.length > 1) return `${who} dividiram o pote`
  if (!summary.showdown) return `${who} levou o pote`
  return viewerWon ? "Você ganhou a mão!" : `${who} ganhou a mão`
}

const notesOf = (
  game: PokerState,
  summary: HandSummary,
  viewerId: PlayerId
): readonly string[] => {
  const notes: string[] = []
  if (!summary.showdown) notes.push("Todos os outros desistiram.")
  if (summary.pots.length > 1) {
    notes.push(`O pote foi dividido em ${summary.pots.length} partes.`)
  }
  for (const playerId of summary.eliminatedIds) {
    notes.push(
      playerId === viewerId
        ? "Você foi eliminado."
        : `${nicknameOf(game, playerId)} foi eliminado.`
    )
  }
  return notes
}

export const winnerShowcase = (
  game: PokerState,
  summary: HandSummary,
  viewerId: PlayerId
): Showcase => {
  const [main] = summary.pots
  const winnerIds = main?.winnerIds ?? []
  const category = summary.showdown ? (main?.category ?? null) : null
  const leader = summary.shown.find((hand) => hand.playerId === winnerIds[0])
  return {
    key: `mao-${summary.number}`,
    tone: toneOf(summary, viewerId),
    headline: headlineOf(
      winnerIds.map((id) => labelOf(game, id, viewerId)),
      summary,
      winnerIds.includes(viewerId)
    ),
    category,
    level: category ? HAND_LADDER.indexOf(category) + 1 : null,
    cards: summary.showdown ? (leader?.cards ?? []) : [],
    winners: Object.entries(summary.winnings)
      .sort(([, first], [, second]) => second - first)
      .map(([id, amount]) => ({
        id,
        label: labelOf(game, id, viewerId),
        amount,
      })),
    notes: notesOf(game, summary, viewerId),
  }
}

export const describeLevel = (level: number): string =>
  `${level}º de ${HAND_LADDER.length} na hierarquia`

export const describeWinnings = (winner: ShowcaseWinner): string =>
  `${winner.label} +${formatChips(winner.amount)}`

export const categoryTitle = (category: HandCategory | null): string =>
  category ? HAND_NAMES[category] : "pote levado"
