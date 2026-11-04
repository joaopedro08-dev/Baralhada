import { MAX_PLAYERS, MIN_PLAYERS, isFinished } from "../game/model.js"
import type { Game, PlayerId } from "../game/model.js"
import { err, ok } from "../shared/result.js"
import type { Result } from "../shared/result.js"
import type { RoomErrorCode } from "./errors.js"

export interface RoomPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly reconnectToken: string
  readonly connected: boolean
  readonly disconnectedAt: number | null
}

export interface Room {
  readonly code: string
  readonly players: readonly RoomPlayer[]
  readonly game: Game | null
  readonly lastStarterId: PlayerId | null
  readonly matchStartsAt: number | null
  readonly version: number
  readonly timedTurnNumber: number | null
  readonly turnDeadlineAt: number | null
  readonly emptySince: number | null
}

export type RoomStatus = "lobby" | "playing" | "finished"

const normalizeNickname = (nickname: string): string => nickname.trim().toLocaleLowerCase("pt-BR")

export const statusOf = (room: Room): RoomStatus => {
  if (!room.game) return "lobby"
  return isFinished(room.game) ? "finished" : "playing"
}

export const hostIdOf = (room: Room): PlayerId | null => room.players[0]?.id ?? null

export const isHost = (room: Room, playerId: PlayerId): boolean => hostIdOf(room) === playerId

export const canStart = (room: Room): boolean =>
  statusOf(room) !== "playing" &&
  room.players.length >= MIN_PLAYERS &&
  room.players.length <= MAX_PLAYERS

export const findRoomPlayer = (room: Room, playerId: PlayerId): RoomPlayer | undefined =>
  room.players.find((player) => player.id === playerId)

export const createRoom = (code: string, host: RoomPlayer): Room => ({
  code,
  players: [host],
  game: null,
  lastStarterId: null,
  matchStartsAt: null,
  version: 0,
  timedTurnNumber: null,
  turnDeadlineAt: null,
  emptySince: null,
})

export const addPlayer = (room: Room, player: RoomPlayer): Result<Room, RoomErrorCode> => {
  if (statusOf(room) === "playing") return err("GAME_ALREADY_STARTED")
  if (room.players.length >= MAX_PLAYERS) return err("ROOM_FULL")
  const nickname = normalizeNickname(player.nickname)
  if (room.players.some((seated) => normalizeNickname(seated.nickname) === nickname)) {
    return err("NICKNAME_TAKEN")
  }
  return ok({ ...room, players: [...room.players, player], emptySince: null })
}

const updateConnectedState = (room: Room, players: readonly RoomPlayer[], now: number): Room => {
  const anyoneConnected = players.some((player) => player.connected)
  return { ...room, players, emptySince: anyoneConnected ? null : (room.emptySince ?? now) }
}

export const markDisconnected = (room: Room, playerId: PlayerId, now: number): Room =>
  updateConnectedState(
    room,
    room.players.map((player) =>
      player.id === playerId ? { ...player, connected: false, disconnectedAt: now } : player
    ),
    now
  )

export const markReconnected = (room: Room, playerId: PlayerId, now: number): Room =>
  updateConnectedState(
    room,
    room.players.map((player) =>
      player.id === playerId ? { ...player, connected: true, disconnectedAt: null } : player
    ),
    now
  )

export const dropPlayer = (room: Room, playerId: PlayerId, game: Game | null, now: number): Room =>
  updateConnectedState(
    { ...room, game },
    room.players.filter((player) => player.id !== playerId),
    now
  )
