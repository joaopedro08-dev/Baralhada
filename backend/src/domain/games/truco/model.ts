import type { Card } from "../../cards/card.js"
import type { PlayerId } from "../../shared/seat.js"
import type { TrucoRank } from "./cards.js"

export type { PlayerId }

export const TRUCO_ID = "truco-paulista"
export const PLAYER_COUNTS = [2, 4, 6] as const
export const TEAM_COUNT = 2
export const HAND_SIZE = 3
export const ROUNDS_PER_HAND = 3
export const WINNING_SCORE = 12
export const ELEVEN = 11
export const ELEVEN_HAND_STAKE = 3
export const ELEVEN_RUN_POINTS = 1
export const STAKES = [1, 3, 6, 9, 12] as const
export const TURN_DURATION_MS = 30_000
export const EVENT_LOG_LIMIT = 200

export type TeamIndex = 0 | 1
export type Stake = (typeof STAKES)[number]
export type HandMode = "normal" | "eleven" | "iron"
export type RoundResult = TeamIndex | "tie"
export type Scores = readonly [number, number]

export interface TrucoPlayer {
  readonly id: PlayerId
  readonly team: TeamIndex
  readonly hand: readonly Card[]
}

export interface PlayedCard {
  readonly playerId: PlayerId
  readonly card: Card
  readonly covered: boolean
}

export interface RaiseRequest {
  readonly requesterId: PlayerId
  readonly responderId: PlayerId
  readonly stake: Stake
}

export interface Hand {
  readonly number: number
  readonly mode: HandMode
  readonly vira: Card
  readonly manilha: TrucoRank
  readonly openerId: PlayerId
  readonly roundOpenerId: PlayerId
  readonly currentPlayerId: PlayerId
  readonly table: readonly PlayedCard[]
  readonly rounds: readonly RoundResult[]
  readonly stake: Stake
  readonly lastRaiserTeam: TeamIndex | null
  readonly request: RaiseRequest | null
  readonly elevenDeciderId: PlayerId | null
}

export type HandEnding = "rounds" | "ran" | "elevenRan" | "tied"

export interface RunnerHand {
  readonly playerId: PlayerId
  readonly cards: readonly Card[]
  readonly shown: boolean
  readonly untilStep: number
}

export interface RoundSummary {
  readonly handNumber: number
  readonly round: number
  readonly table: readonly PlayedCard[]
  readonly result: RoundResult
  readonly winnerId: PlayerId | null
}

export interface HandSummary {
  readonly number: number
  readonly winnerTeam: TeamIndex | null
  readonly points: number
  readonly ending: HandEnding
  readonly table: readonly PlayedCard[]
  readonly rounds: readonly RoundResult[]
  readonly runner: RunnerHand | null
}

export type TrucoEvent =
  | {
      readonly type: "handDealt"
      readonly number: number
      readonly vira: Card
      readonly mode: HandMode
    }
  | { readonly type: "played"; readonly playerId: PlayerId; readonly card: Card }
  | { readonly type: "covered"; readonly playerId: PlayerId }
  | { readonly type: "showed"; readonly playerId: PlayerId; readonly cards: readonly Card[] }
  | { readonly type: "roundWon"; readonly round: number; readonly playerId: PlayerId | null }
  | { readonly type: "raised"; readonly playerId: PlayerId; readonly stake: Stake }
  | { readonly type: "accepted"; readonly playerId: PlayerId; readonly stake: Stake }
  | { readonly type: "ran"; readonly playerId: PlayerId }
  | { readonly type: "elevenAccepted"; readonly playerId: PlayerId }
  | { readonly type: "handWon"; readonly team: TeamIndex | null; readonly points: number }
  | { readonly type: "timedOut"; readonly playerId: PlayerId }
  | { readonly type: "playerLeft"; readonly playerId: PlayerId }
  | { readonly type: "matchWon"; readonly team: TeamIndex }

export type TrucoEndReason = "score" | "abandoned"

export interface TrucoGame {
  readonly nicknames: Readonly<Record<PlayerId, string>>
  readonly players: readonly TrucoPlayer[]
  readonly scores: Scores
  readonly hand: Hand
  readonly step: number
  readonly events: readonly TrucoEvent[]
  readonly lastHand: HandSummary | null
  readonly lastRound: RoundSummary | null
  readonly winnerTeam: TeamIndex | null
  readonly endReason: TrucoEndReason | null
}

export const otherTeam = (team: TeamIndex): TeamIndex => (team === 0 ? 1 : 0)

export const isFinished = (game: TrucoGame): boolean => game.endReason !== null

export const findPlayer = (game: TrucoGame, playerId: PlayerId): TrucoPlayer | undefined =>
  game.players.find((player) => player.id === playerId)

export const getPlayer = (game: TrucoGame, playerId: PlayerId): TrucoPlayer => {
  const player = findPlayer(game, playerId)
  if (!player) throw new Error(`Unknown player ${playerId}`)
  return player
}

export const teamOf = (game: TrucoGame, playerId: PlayerId): TeamIndex =>
  getPlayer(game, playerId).team

export const seatAfter = (players: readonly TrucoPlayer[], playerId: PlayerId): PlayerId => {
  const index = players.findIndex((player) => player.id === playerId)
  return (players[(index + 1) % players.length] as TrucoPlayer).id
}

export const playOrderFrom = (
  players: readonly TrucoPlayer[],
  playerId: PlayerId
): readonly TrucoPlayer[] => {
  const index = players.findIndex((player) => player.id === playerId)
  return [...players.slice(index), ...players.slice(0, index)]
}

export const actorOf = (hand: Hand): PlayerId =>
  hand.request?.responderId ?? hand.elevenDeciderId ?? hand.currentPlayerId

export const nextStake = (stake: Stake): Stake | null => {
  const next = STAKES[STAKES.indexOf(stake) + 1]
  return next ?? null
}

export const appendEvents = (
  events: readonly TrucoEvent[],
  ...added: readonly TrucoEvent[]
): readonly TrucoEvent[] => [...events, ...added].slice(-EVENT_LOG_LIMIT)

export const withEvents = (game: TrucoGame, ...added: readonly TrucoEvent[]): TrucoGame => ({
  ...game,
  events: appendEvents(game.events, ...added),
})

export const replacePlayer = (
  players: readonly TrucoPlayer[],
  updated: TrucoPlayer
): readonly TrucoPlayer[] => players.map((player) => (player.id === updated.id ? updated : player))
