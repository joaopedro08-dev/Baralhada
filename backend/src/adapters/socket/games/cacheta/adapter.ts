import { z } from "zod"
import { createFullDeck } from "../../../../domain/cards/card.js"
import type { Card } from "../../../../domain/cards/card.js"
import { computeCachetaHints } from "../../../../domain/games/cacheta/hints.js"
import { CACHETA_ID } from "../../../../domain/games/cacheta/model.js"
import type { CachetaGame, PlayerId } from "../../../../domain/games/cacheta/model.js"
import { toCachetaView } from "../../../../domain/games/cacheta/player-view.js"
import type { GameAdapter } from "../../game-adapter.js"
import type { CachetaHintsDto, CachetaStateDto } from "./contract.js"
import { CACHETA_ERRORS, describeCachetaHistory, describeCachetaSuggestion } from "./messages.js"

const HISTORY_LIMIT = 60

const card = z.enum(createFullDeck() as readonly [Card, ...Card[]])

export const cachetaActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("draw") }),
  z.strictObject({ type: z.literal("take") }),
  z.strictObject({ type: z.literal("discard"), card }),
  z.strictObject({ type: z.literal("knock"), card }),
])

const presenter = (game: CachetaGame) => {
  const history = describeCachetaHistory(game, HISTORY_LIMIT)
  return (viewerId: PlayerId): CachetaStateDto => {
    const { viewerId: _viewer, events: _events, ...view } = toCachetaView(game, viewerId)
    return { kind: "cacheta", ...view, history }
  }
}

const hints = (game: CachetaGame, viewerId: PlayerId): CachetaHintsDto => {
  const { suggestions, ...rest } = computeCachetaHints(toCachetaView(game, viewerId))
  return {
    kind: "cacheta",
    ...rest,
    suggestions: suggestions.map((suggestion) => ({
      action: suggestion.action,
      sentence: describeCachetaSuggestion(suggestion),
    })),
  }
}

export const cachetaAdapter: GameAdapter<CachetaGame, CachetaStateDto, CachetaHintsDto> = {
  id: CACHETA_ID,
  actionSchema: cachetaActionSchema,
  errorMessages: CACHETA_ERRORS,
  presenter,
  hints,
}
