import { z } from "zod"
import type { Card } from "../../../../domain/cards/card.js"
import { createTrucoDeck } from "../../../../domain/games/truco/cards.js"
import { computeTrucoHints } from "../../../../domain/games/truco/hints.js"
import { HAND_SIZE, TRUCO_ID } from "../../../../domain/games/truco/model.js"
import type { PlayerId, TrucoGame } from "../../../../domain/games/truco/model.js"
import { toTrucoView } from "../../../../domain/games/truco/player-view.js"
import type { GameAdapter } from "../../game-adapter.js"
import type { TrucoHintsDto, TrucoStateDto } from "./contract.js"
import { describeSuggestion, describeTrucoHistory, TRUCO_ERRORS } from "./messages.js"

const HISTORY_LIMIT = 50

const card = z.enum(createTrucoDeck() as readonly [Card, ...Card[]])

export const trucoActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("play"), card }),
  z.strictObject({ type: z.literal("cover"), card }),
  z.strictObject({
    type: z.literal("playBlind"),
    slot: z
      .number()
      .int()
      .min(0)
      .max(HAND_SIZE - 1),
  }),
  z.strictObject({ type: z.literal("raise") }),
  z.strictObject({ type: z.literal("accept") }),
  z.strictObject({ type: z.literal("run") }),
  z.strictObject({ type: z.literal("show") }),
])

const presenter = (game: TrucoGame) => {
  const history = describeTrucoHistory(game, HISTORY_LIMIT)
  return (viewerId: PlayerId): TrucoStateDto => {
    const { viewerId: _viewer, events: _events, ...view } = toTrucoView(game, viewerId)
    return { kind: "truco-paulista", ...view, history }
  }
}

const hints = (game: TrucoGame, viewerId: PlayerId): TrucoHintsDto => {
  const { suggestions, ...ruler } = computeTrucoHints(toTrucoView(game, viewerId))
  return {
    kind: "truco-paulista",
    ...ruler,
    suggestions: suggestions.map((suggestion) => ({
      action: suggestion.action,
      sentence: describeSuggestion(suggestion),
    })),
  }
}

export const trucoAdapter: GameAdapter<TrucoGame, TrucoStateDto, TrucoHintsDto> = {
  id: TRUCO_ID,
  actionSchema: trucoActionSchema,
  errorMessages: TRUCO_ERRORS,
  presenter,
  hints,
}
