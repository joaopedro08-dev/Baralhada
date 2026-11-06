import { z } from "zod"
import { computePokerHints } from "../../../../domain/games/poker/hints.js"
import { POKER_ID } from "../../../../domain/games/poker/model.js"
import type { PlayerId, PokerGame } from "../../../../domain/games/poker/model.js"
import { toPokerView } from "../../../../domain/games/poker/player-view.js"
import type { GameAdapter } from "../../game-adapter.js"
import type { PokerHintsDto, PokerStateDto } from "./contract.js"
import { describePokerHints, describePokerHistory, POKER_ERRORS } from "./messages.js"

const HISTORY_LIMIT = 60
const MAX_AMOUNT = 1_000_000

const amount = z.number().int().positive().max(MAX_AMOUNT)

export const pokerActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("fold") }),
  z.strictObject({ type: z.literal("check") }),
  z.strictObject({ type: z.literal("call") }),
  z.strictObject({ type: z.literal("bet"), amount }),
  z.strictObject({ type: z.literal("raise"), amount }),
])

const presenter = (game: PokerGame) => {
  const history = describePokerHistory(game, HISTORY_LIMIT)
  return (viewerId: PlayerId): PokerStateDto => {
    const { viewerId: _viewer, events: _events, ...view } = toPokerView(game, viewerId)
    return { kind: "poker-texas-holdem", ...view, history }
  }
}

const hints = (game: PokerGame, viewerId: PlayerId): PokerHintsDto => {
  const computed = computePokerHints(toPokerView(game, viewerId))
  return { kind: "poker-texas-holdem", ...computed, sentences: describePokerHints(computed) }
}

export const pokerAdapter: GameAdapter<PokerGame, PokerStateDto, PokerHintsDto> = {
  id: POKER_ID,
  actionSchema: pokerActionSchema,
  errorMessages: POKER_ERRORS,
  presenter,
  hints,
}
