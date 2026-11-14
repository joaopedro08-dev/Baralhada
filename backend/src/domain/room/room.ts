import { err, ok } from "../shared/result.js"
import type { Result } from "../shared/result.js"
import type { PlayerId } from "../shared/seat.js"
import type { RoomErrorCode } from "./errors.js"
import { acceptsPlayerCount, maxPlayersOf } from "./game-rules.js"
import type { GameFormat } from "./game-rules.js"
import { areTeamsBalanced, joinSmallestTeam, leaveTeam } from "./teams.js"
import type { TeamAssignments } from "./teams.js"

export interface RoomPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly reconnectToken: string
  readonly connected: boolean
  readonly disconnectedAt: number | null
}

export interface Room<State = unknown> {
  readonly code: string
  readonly gameId: string
  readonly players: readonly RoomPlayer[]
  readonly teamAssignments: TeamAssignments | null
  readonly hintsAllowed: boolean
  readonly matchWins: Readonly<Record<PlayerId, number>>
  readonly game: State | null
  readonly lastStarterId: PlayerId | null
  readonly matchStartsAt: number | null
  readonly pausedUntil: number | null
  readonly pausedAt: number | null
  readonly version: number
  readonly timedTurnNumber: number | null
  readonly turnDeadlineAt: number | null
  readonly turnDurationSeconds: 15 | 30 | 60 | null
  readonly emptySince: number | null
}

export type RoomStatus = "lobby" | "playing" | "finished"

export interface RoomRules<State> extends GameFormat {
  isFinished(state: State): boolean
}

export type StartProblem = Extract<
  RoomErrorCode,
  "GAME_ALREADY_STARTED" | "NOT_ENOUGH_PLAYERS" | "TEAMS_UNBALANCED"
>

const normalizeNickname = (nickname: string): string => nickname.trim().toLocaleLowerCase("pt-BR")

export const statusOf = <State>(room: Room<State>, rules: RoomRules<State>): RoomStatus => {
  if (room.game === null) return "lobby"
  return rules.isFinished(room.game) ? "finished" : "playing"
}

export const hostIdOf = (room: Room): PlayerId | null => room.players[0]?.id ?? null

export const isHost = (room: Room, playerId: PlayerId): boolean => hostIdOf(room) === playerId

export const startProblemOf = <State>(
  room: Room<State>,
  rules: RoomRules<State>
): StartProblem | null => {
  if (statusOf(room, rules) === "playing") return "GAME_ALREADY_STARTED"
  if (!acceptsPlayerCount(rules, room.players.length)) return "NOT_ENOUGH_PLAYERS"
  if (rules.teamCount !== null && !areTeamsBalanced(room, rules.teamCount)) {
    return "TEAMS_UNBALANCED"
  }
  return null
}

export const canStart = <State>(room: Room<State>, rules: RoomRules<State>): boolean =>
  startProblemOf(room, rules) === null

export const findRoomPlayer = (room: Room, playerId: PlayerId): RoomPlayer | undefined =>
  room.players.find((player) => player.id === playerId)

export const createRoom = <State>(code: string, gameId: string, host: RoomPlayer): Room<State> => ({
  code,
  gameId,
  players: [host],
  teamAssignments: null,
  hintsAllowed: true,
  matchWins: {},
  game: null,
  lastStarterId: null,
  matchStartsAt: null,
  pausedUntil: null,
  pausedAt: null,
  version: 0,
  timedTurnNumber: null,
  turnDeadlineAt: null,
  turnDurationSeconds: null,
  emptySince: null,
})

export const addPlayer = <State>(
  room: Room<State>,
  player: RoomPlayer,
  rules: RoomRules<State>
): Result<Room<State>, RoomErrorCode> => {
  if (statusOf(room, rules) === "playing") return err("GAME_ALREADY_STARTED")
  if (room.players.length >= maxPlayersOf(rules)) return err("ROOM_FULL")
  const nickname = normalizeNickname(player.nickname)
  if (room.players.some((seated) => normalizeNickname(seated.nickname) === nickname)) {
    return err("NICKNAME_TAKEN")
  }
  const joined = { ...room, players: [...room.players, player], emptySince: null }
  return ok(
    rules.teamCount === null ? joined : joinSmallestTeam(joined, player.id, rules.teamCount)
  )
}

export const switchGame = <State>(room: Room<State>, gameId: string): Room<State> =>
  room.gameId === gameId
    ? room
    : { ...room, gameId, game: null, teamAssignments: null, lastStarterId: null, matchWins: {} }

export const allowHints = <State>(room: Room<State>, allowed: boolean): Room<State> =>
  room.hintsAllowed === allowed ? room : { ...room, hintsAllowed: allowed }

const updateConnectedState = <State>(
  room: Room<State>,
  players: readonly RoomPlayer[],
  now: number
): Room<State> => {
  const anyoneConnected = players.some((player) => player.connected)
  return { ...room, players, emptySince: anyoneConnected ? null : (room.emptySince ?? now) }
}

export const markDisconnected = <State>(
  room: Room<State>,
  playerId: PlayerId,
  now: number
): Room<State> =>
  updateConnectedState(
    room,
    room.players.map((player) =>
      player.id === playerId ? { ...player, connected: false, disconnectedAt: now } : player
    ),
    now
  )

export const markReconnected = <State>(
  room: Room<State>,
  playerId: PlayerId,
  now: number
): Room<State> =>
  updateConnectedState(
    room,
    room.players.map((player) =>
      player.id === playerId ? { ...player, connected: true, disconnectedAt: null } : player
    ),
    now
  )

export const dropPlayer = <State>(
  room: Room<State>,
  playerId: PlayerId,
  game: State | null,
  now: number
): Room<State> =>
  updateConnectedState(
    {
      ...leaveTeam(room, playerId),
      game,
      matchWins: Object.fromEntries(
        Object.entries(room.matchWins).filter(([id]) => id !== playerId)
      ),
    },
    room.players.filter((player) => player.id !== playerId),
    now
  )
