import { z } from "zod"

export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
export const ROOM_CODE_LENGTH = 6
export const MAX_TEAMS = 8

const nickname = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[^\p{C}<>]+$/u)

const roomCode = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH)
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`))

const playerId = z.string().min(1).max(64)

const gameId = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9-]+$/)

export const createRoomSchema = z.strictObject({ nickname, gameId: gameId.optional() })

export const joinRoomSchema = z.strictObject({ code: roomCode, nickname })

export const reconnectSchema = z.strictObject({
  code: roomCode,
  nickname,
  reconnectToken: z.string().min(16).max(128),
})

export const kickSchema = z.strictObject({ playerId })

export const chooseGameSchema = z.strictObject({ gameId })

export const moveTeamSchema = z.strictObject({
  playerId,
  team: z
    .number()
    .int()
    .min(0)
    .max(MAX_TEAMS - 1),
})

export const hintsSettingSchema = z.strictObject({ allowed: z.boolean() })

export const emptySchema = z.undefined()

export const anyPayloadSchema = z.unknown()
