import { z } from "zod"
import { createFullDeck } from "../../../../domain/cards/card.js"
import type { Card } from "../../../../domain/cards/card.js"
import { computeTrincaHints } from "../../../../domain/games/tres-trincas/hints.js"
import {
  HAND_SIZE,
  SET_SIZE,
  TRES_TRINCAS_ID,
} from "../../../../domain/games/tres-trincas/model.js"
import type { PlayerId, TrincaGame } from "../../../../domain/games/tres-trincas/model.js"
import { toTrincaView } from "../../../../domain/games/tres-trincas/player-view.js"
import type { GameAdapter } from "../../game-adapter.js"
import type { TresTrincasHintsDto, TresTrincasStateDto } from "./contract.js"
import { describeTrincaHistory, describeTrincaSuggestion, TRES_TRINCAS_ERRORS } from "./messages.js"

const HISTORY_LIMIT = 50
const MOST_MELDED = 2 * SET_SIZE

const card = z.enum(createFullDeck() as readonly [Card, ...Card[]])

export const tresTrincasActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("draw") }),
  z.strictObject({ type: z.literal("discard"), card }),
  z.strictObject({
    type: z.literal("meld"),
    cards: z.array(card).min(SET_SIZE).max(Math.min(MOST_MELDED, HAND_SIZE)),
  }),
])

const presenter = (game: TrincaGame) => {
  const history = describeTrincaHistory(game, HISTORY_LIMIT)
  return (viewerId: PlayerId): TresTrincasStateDto => {
    const { viewerId: _viewer, events: _events, ...view } = toTrincaView(game, viewerId)
    return { kind: "tres-trincas", ...view, history }
  }
}

const hints = (game: TrincaGame, viewerId: PlayerId): TresTrincasHintsDto => {
  const { suggestions, ...rest } = computeTrincaHints(toTrincaView(game, viewerId))
  return {
    kind: "tres-trincas",
    ...rest,
    suggestions: suggestions.map((suggestion) => ({
      action: suggestion.action,
      sentence: describeTrincaSuggestion(suggestion),
    })),
  }
}

export const tresTrincasAdapter: GameAdapter<TrincaGame, TresTrincasStateDto, TresTrincasHintsDto> =
  {
    id: TRES_TRINCAS_ID,
    actionSchema: tresTrincasActionSchema,
    errorMessages: TRES_TRINCAS_ERRORS,
    presenter,
    hints,
  }
