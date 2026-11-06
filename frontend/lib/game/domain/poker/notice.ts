import {
  describeHandResult,
  formatChips,
  HAND_NAMES,
  nicknameOf,
  winnersOf,
} from "@/lib/game/domain/poker/guide"
import type { HandSummary, PokerState } from "@/lib/game/domain/poker/types"
import type { NoticeTone, ScoreNotice } from "@/lib/game/domain/score-notice"
import type { Card, PlayerId } from "@/lib/game/domain/types"

const toneFor = (summary: HandSummary, viewerId: PlayerId): NoticeTone => {
  if ((summary.winnings[viewerId] ?? 0) > 0) return "good"
  if (summary.eliminatedIds.includes(viewerId)) return "bad"
  return summary.shown.some((hand) => hand.playerId === viewerId)
    ? "bad"
    : "neutral"
}

const winningCards = (summary: HandSummary): readonly Card[] => {
  const winnerId = summary.pots[0]?.winnerIds[0]
  return summary.shown.find((hand) => hand.playerId === winnerId)?.cards ?? []
}

const detailOf = (
  game: PokerState,
  summary: HandSummary,
  viewerId: PlayerId
): string => {
  const sidePots =
    summary.pots.length > 1 ? ` em ${summary.pots.length} potes` : ""
  const total = summary.pots.reduce((sum, pot) => sum + pot.amount, 0)
  const parts = [`${formatChips(total)} fichas${sidePots}.`]
  const shownHands = summary.shown
    .filter((hand) => !(summary.winnings[hand.playerId] ?? 0))
    .map(
      (hand) =>
        `${hand.playerId === viewerId ? "Você" : nicknameOf(game, hand.playerId)}: ${HAND_NAMES[hand.category]}`
    )
  if (shownHands.length > 0) parts.push(`${shownHands.join(" · ")}.`)
  for (const playerId of summary.eliminatedIds) {
    parts.push(
      playerId === viewerId
        ? "Você foi eliminado."
        : `${nicknameOf(game, playerId)} foi eliminado.`
    )
  }
  return parts.join(" ")
}

export const handNotice = (
  game: PokerState,
  summary: HandSummary,
  viewerId: PlayerId
): ScoreNotice => ({
  key: `mao-${summary.number}`,
  tone: toneFor(summary, viewerId),
  title: describeHandResult(game, summary, viewerId),
  detail: detailOf(game, summary, viewerId),
  lines: winnersOf(summary).map((playerId) => ({
    id: playerId,
    label: playerId === viewerId ? "Você" : nicknameOf(game, playerId),
    before: 0,
    value: summary.winnings[playerId] ?? 0,
    lead: true,
    mine: playerId === viewerId,
  })),
  cards: winningCards(summary),
})

export const pokerNotice = (
  previous: PokerState,
  next: PokerState,
  viewerId: PlayerId
): ScoreNotice | null => {
  const summary = next.lastHand
  if (!summary || summary.number === previous.lastHand?.number) return null
  return handNotice(next, summary, viewerId)
}
