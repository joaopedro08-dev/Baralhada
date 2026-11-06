import type { RandomSource } from "../../shared/random.js"
import { shuffle } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { PlayerId, Seat } from "../../shared/seat.js"
import { createTrucoDeck, manilhaOf } from "./cards.js"
import type { TrucoErrorCode } from "./errors.js"
import { appendEvents, ELEVEN, HAND_SIZE, PLAYER_COUNTS, playOrderFrom } from "./model.js"
import type { HandMode, Scores, TeamIndex, TrucoGame, TrucoPlayer } from "./model.js"

type DealtTable = Omit<TrucoGame, "hand">

const elevenTeamOf = (scores: Scores): TeamIndex | null => {
  const [first, second] = scores
  if (first === ELEVEN && second !== ELEVEN) return 0
  if (second === ELEVEN && first !== ELEVEN) return 1
  return null
}

export const modeFor = (scores: Scores): HandMode => {
  if (scores[0] === ELEVEN && scores[1] === ELEVEN) return "iron"
  return elevenTeamOf(scores) === null ? "normal" : "eleven"
}

export const dealHand = (
  table: DealtTable,
  number: number,
  openerId: PlayerId,
  random: RandomSource
): TrucoGame => {
  const deck = shuffle(createTrucoDeck(), random)
  const players: TrucoPlayer[] = table.players.map((player, seat) => ({
    ...player,
    hand: deck.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE),
  }))
  const vira = deck[players.length * HAND_SIZE] as TrucoGame["hand"]["vira"]
  const mode = modeFor(table.scores)
  const elevenTeam = elevenTeamOf(table.scores)
  const decider =
    elevenTeam === null
      ? null
      : (playOrderFrom(players, openerId).find((player) => player.team === elevenTeam)?.id ?? null)

  return {
    ...table,
    players,
    hand: {
      number,
      mode,
      vira,
      manilha: manilhaOf(vira),
      openerId,
      roundOpenerId: openerId,
      currentPlayerId: openerId,
      table: [],
      rounds: [],
      stake: 1,
      lastRaiserTeam: null,
      request: null,
      elevenDeciderId: decider,
    },
    events: appendEvents(table.events, { type: "handDealt", number, vira, mode }),
  }
}

const isTeam = (team: number | null): team is TeamIndex => team === 0 || team === 1

const alternateSeats = (seats: readonly Seat[]): readonly TrucoPlayer[] | null => {
  if (!seats.every((seat) => isTeam(seat.team))) return null
  const first = seats.filter((seat) => seat.team === 0)
  const second = seats.filter((seat) => seat.team === 1)
  if (first.length !== second.length) return null
  return first.flatMap((seat, position) =>
    [seat, second[position] as Seat].map((member) => ({
      id: member.id,
      team: member.team as TeamIndex,
      hand: [],
    }))
  )
}

export const startGame = (
  seats: readonly Seat[],
  starterId: PlayerId,
  random: RandomSource
): Result<TrucoGame, TrucoErrorCode> => {
  if (!(PLAYER_COUNTS as readonly number[]).includes(seats.length)) {
    return err("INVALID_PLAYER_COUNT")
  }
  const players = alternateSeats(seats)
  if (!players) return err("INVALID_TEAMS")
  if (!players.some((player) => player.id === starterId)) return err("INVALID_TEAMS")

  const table: DealtTable = {
    nicknames: Object.fromEntries(seats.map((seat) => [seat.id, seat.nickname])),
    players,
    scores: [0, 0],
    step: 1,
    events: [],
    lastHand: null,
    lastRound: null,
    winnerTeam: null,
    endReason: null,
  }
  return ok(dealHand(table, 1, starterId, random))
}
