import { z } from "zod"
import { createFullDeck, QUAD_SIZE, RANKS } from "../../domain/cards/card.js"
import type { Card } from "../../domain/cards/card.js"

export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
export const ROOM_CODE_LENGTH = 6

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

const card = z.enum(createFullDeck() as readonly [Card, ...Card[]])

const cardGroup = z.array(card).max(QUAD_SIZE)

export const createRoomSchema = z.strictObject({ nickname })

export const joinRoomSchema = z.strictObject({ code: roomCode, nickname })

export const reconnectSchema = z.strictObject({
  code: roomCode,
  nickname,
  reconnectToken: z.string().min(16).max(128),
})

export const kickSchema = z.strictObject({ playerId })

export const emptySchema = z.undefined()

export const turnActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("draw") }),
  z.strictObject({ type: z.literal("layDown"), cards: cardGroup }),
  z.strictObject({
    type: z.literal("takeFromTable"),
    tableCards: cardGroup,
    handCards: cardGroup,
  }),
  z.strictObject({
    type: z.literal("steal"),
    targetId: playerId,
    rank: z.enum(RANKS),
    handCards: cardGroup,
  }),
  z.strictObject({ type: z.literal("discard"), card }),
])
