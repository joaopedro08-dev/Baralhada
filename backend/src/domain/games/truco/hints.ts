import { suitOf } from "../../cards/card.js"
import type { Card } from "../../cards/card.js"
import { isManilha, MANILHA_SUITS, strengthOf, TRUCO_RANKS, trucoRankOf } from "./cards.js"
import type { ManilhaSuit, TrucoRank } from "./cards.js"
import type { TrucoAction } from "./actions.js"
import type { Stake, TeamIndex } from "./model.js"
import type { TrucoView, VisiblePlay } from "./player-view.js"

const STRONG_STRENGTH = TRUCO_RANKS.indexOf("2")

export type TrucoAdvice =
  | "leadStrongest"
  | "beatCheapest"
  | "partnerWinning"
  | "cannotBeat"
  | "blindPick"
  | "raise"
  | "accept"
  | "raiseBack"
  | "run"
  | "playEleven"
  | "runEleven"

export interface TrucoSuggestion {
  readonly action: TrucoAction
  readonly advice: TrucoAdvice
  readonly stake: Stake | null
}

export interface RulerCard {
  readonly card: Card
  readonly position: number
  readonly manilha: boolean
}

export interface TrucoHints {
  readonly order: readonly TrucoRank[]
  readonly manilha: TrucoRank
  readonly manilhaSuits: typeof MANILHA_SUITS
  readonly hand: readonly RulerCard[]
  readonly suggestions: readonly TrucoSuggestion[]
}

const byStrength = (cards: readonly Card[], manilha: TrucoRank): readonly Card[] =>
  [...cards].sort((a, b) => strengthOf(a, manilha) - strengthOf(b, manilha))

const strongCards = (view: TrucoView): number =>
  view.hand.filter((card) => strengthOf(card, view.manilha) >= STRONG_STRENGTH).length

const COVERED_STRENGTH = -1

const playStrength = (play: VisiblePlay, manilha: TrucoRank): number =>
  play.covered || play.card === null ? COVERED_STRENGTH : strengthOf(play.card, manilha)

const winningPlay = (view: TrucoView): VisiblePlay | null => {
  const sorted = [...view.table].sort(
    (a, b) => playStrength(b, view.manilha) - playStrength(a, view.manilha)
  )
  return sorted[0] ?? null
}

const teamOfPlay = (view: TrucoView, play: VisiblePlay): TeamIndex | null =>
  view.players.find((player) => player.id === play.playerId)?.team ?? null

const suggestCard = (view: TrucoView): TrucoSuggestion => {
  const sorted = byStrength(view.hand, view.manilha)
  const weakest = sorted[0] as Card
  const strongest = sorted.at(-1) as Card
  const best = winningPlay(view)
  const play = (card: Card, advice: TrucoAdvice): TrucoSuggestion => ({
    action: { type: "play", card },
    advice,
    stake: null,
  })
  if (!best) return play(strongest, "leadStrongest")
  if (teamOfPlay(view, best) === view.viewerTeam) return play(weakest, "partnerWinning")
  const bestStrength = playStrength(best, view.manilha)
  const beater = sorted.find((card) => strengthOf(card, view.manilha) > bestStrength)
  return beater ? play(beater, "beatCheapest") : play(weakest, "cannotBeat")
}

const answerSuggestions = (view: TrucoView): readonly TrucoSuggestion[] => {
  const strong = strongCards(view)
  const wonFirst = view.rounds[0] === view.viewerTeam
  const accept: TrucoSuggestion = { action: { type: "accept" }, advice: "accept", stake: null }
  const run: TrucoSuggestion = { action: { type: "run" }, advice: "run", stake: null }
  const raiseBack: TrucoSuggestion | null =
    view.moves.raiseTo === null
      ? null
      : { action: { type: "raise" }, advice: "raiseBack", stake: view.moves.raiseTo }
  if (strong >= 2 && raiseBack) return [raiseBack, accept, run]
  if (strong >= 1 || wonFirst) return [accept, run]
  return [run, accept]
}

const elevenSuggestions = (view: TrucoView): readonly TrucoSuggestion[] => {
  const teamCards = [...view.hand, ...view.partnerHands.flatMap((partner) => partner.cards)]
  const strong = teamCards.filter((card) => strengthOf(card, view.manilha) >= STRONG_STRENGTH)
  const play: TrucoSuggestion = { action: { type: "accept" }, advice: "playEleven", stake: null }
  const run: TrucoSuggestion = { action: { type: "run" }, advice: "runEleven", stake: null }
  return strong.length >= view.players.length / 2 ? [play, run] : [run, play]
}

const playSuggestions = (view: TrucoView): readonly TrucoSuggestion[] => {
  if (view.blind) {
    return [{ action: { type: "playBlind", slot: 0 }, advice: "blindPick", stake: null }]
  }
  const card = suggestCard(view)
  const raiseTo = view.moves.raiseTo
  if (raiseTo === null || strongCards(view) < 2) return [card]
  return [{ action: { type: "raise" }, advice: "raise", stake: raiseTo }, card]
}

const suggestionsOf = (view: TrucoView): readonly TrucoSuggestion[] => {
  if (view.moves.decideEleven) return elevenSuggestions(view)
  if (view.moves.answer) return answerSuggestions(view)
  return view.moves.play ? playSuggestions(view) : []
}

export const computeTrucoHints = (view: TrucoView): TrucoHints => {
  const order = TRUCO_RANKS.filter((rank) => rank !== view.manilha)
  const levelOf = (card: Card): number =>
    isManilha(card, view.manilha)
      ? order.length + MANILHA_SUITS.indexOf(suitOf(card) as ManilhaSuit)
      : order.indexOf(trucoRankOf(card))
  return {
    order,
    manilha: view.manilha,
    manilhaSuits: MANILHA_SUITS,
    hand: byStrength(view.hand, view.manilha)
      .map((card) => ({
        card,
        position: levelOf(card) + 1,
        manilha: isManilha(card, view.manilha),
      }))
      .reverse(),
    suggestions: suggestionsOf(view),
  }
}
