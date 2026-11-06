import type { Card } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import type { TrucoRank } from "./cards.js"
import { strengthOf } from "./cards.js"
import { getPlayer, replacePlayer, seatAfter, teamOf, WINNING_SCORE, withEvents } from "./model.js"
import type {
  HandEnding,
  PlayedCard,
  PlayerId,
  RoundResult,
  RunnerHand,
  Scores,
  TeamIndex,
  TrucoGame,
} from "./model.js"
import { dealHand } from "./setup.js"

export type HandOutcome = TeamIndex | "nobody" | null

export interface RoundVerdict {
  readonly result: RoundResult
  readonly winnerId: PlayerId | null
}

export const handOutcome = (rounds: readonly RoundResult[]): HandOutcome => {
  const [first, second, third] = rounds
  if (first === undefined || second === undefined) return null
  if (first !== "tie" && (second === first || second === "tie")) return first
  if (first === "tie" && second !== "tie") return second
  if (third === undefined) return null
  if (third !== "tie") return third
  return first === "tie" ? "nobody" : first
}

export const COVERED_STRENGTH = -1

export const strengthOfPlay = (played: PlayedCard, manilha: TrucoRank): number =>
  played.covered ? COVERED_STRENGTH : strengthOf(played.card, manilha)

export const resolveRound = (
  table: readonly PlayedCard[],
  manilha: TrucoRank,
  teamOfPlayer: (playerId: PlayerId) => TeamIndex
): RoundVerdict => {
  const best = Math.max(...table.map((played) => strengthOfPlay(played, manilha)))
  const strongest = table.filter((played) => strengthOfPlay(played, manilha) === best)
  const teams = new Set(strongest.map((played) => teamOfPlayer(played.playerId)))
  const [winner] = strongest
  if (!winner || teams.size > 1) return { result: "tie", winnerId: null }
  return { result: teamOfPlayer(winner.playerId), winnerId: winner.playerId }
}

const addPoints = (scores: Scores, team: TeamIndex, points: number): Scores => {
  const capped = Math.min(WINNING_SCORE, scores[team] + points)
  return team === 0 ? [capped, scores[1]] : [scores[0], capped]
}

export const closeHand = (
  game: TrucoGame,
  winnerTeam: TeamIndex | null,
  points: number,
  ending: HandEnding,
  random: RandomSource,
  runner: RunnerHand | null = null
): TrucoGame => {
  const scores = winnerTeam === null ? game.scores : addPoints(game.scores, winnerTeam, points)
  const awarded = winnerTeam === null ? 0 : points
  const closed = withEvents(
    {
      ...game,
      scores,
      lastHand: {
        number: game.hand.number,
        winnerTeam,
        points: awarded,
        ending,
        table: game.hand.table,
        rounds: game.hand.rounds,
        runner,
      },
    },
    { type: "handWon", team: winnerTeam, points: awarded }
  )
  if (winnerTeam !== null && scores[winnerTeam] >= WINNING_SCORE) {
    return withEvents(
      { ...closed, winnerTeam, endReason: "score" },
      { type: "matchWon", team: winnerTeam }
    )
  }
  return dealHand(closed, game.hand.number + 1, seatAfter(game.players, game.hand.openerId), random)
}

const settleRound = (game: TrucoGame, random: RandomSource): TrucoGame => {
  const { hand } = game
  const verdict = resolveRound(hand.table, hand.manilha, (id) => teamOf(game, id))
  const rounds = [...hand.rounds, verdict.result]
  const opener = verdict.winnerId ?? hand.roundOpenerId
  const settled = withEvents(
    {
      ...game,
      hand: { ...hand, rounds },
      lastRound: {
        handNumber: hand.number,
        round: rounds.length,
        table: hand.table,
        result: verdict.result,
        winnerId: verdict.winnerId,
      },
    },
    { type: "roundWon", round: rounds.length, playerId: verdict.winnerId }
  )
  const outcome = handOutcome(rounds)
  if (outcome === "nobody") return closeHand(settled, null, 0, "tied", random)
  if (outcome !== null) return closeHand(settled, outcome, hand.stake, "rounds", random)
  return {
    ...settled,
    hand: { ...settled.hand, table: [], roundOpenerId: opener, currentPlayerId: opener },
  }
}

export const placeCard = (
  game: TrucoGame,
  playerId: PlayerId,
  card: Card,
  random: RandomSource,
  covered = false
): TrucoGame => {
  const player = getPlayer(game, playerId)
  const table = [...game.hand.table, { playerId, card, covered }]
  const placed = withEvents(
    {
      ...game,
      players: replacePlayer(game.players, {
        ...player,
        hand: player.hand.filter((held) => held !== card),
      }),
      hand: { ...game.hand, table, currentPlayerId: seatAfter(game.players, playerId) },
    },
    covered ? { type: "covered", playerId } : { type: "played", playerId, card }
  )
  return table.length === game.players.length ? settleRound(placed, random) : placed
}
