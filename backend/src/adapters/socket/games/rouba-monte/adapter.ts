import { z } from "zod"
import { COPIES_PER_RANK, createFullDeck } from "../../../../domain/cards/card.js"
import type { Card } from "../../../../domain/cards/card.js"
import { computeHints } from "../../../../domain/games/rouba-monte/hints.js"
import type { Game, PlayerId } from "../../../../domain/games/rouba-monte/model.js"
import {
  countRanksInPiles,
  toPlayerView,
} from "../../../../domain/games/rouba-monte/player-view.js"
import { ROUBA_MONTE_ID } from "../../../../domain/games/rouba-monte/rules.js"
import type { GameAdapter } from "../../game-adapter.js"
import type { RoubaMonteHintsDto, RoubaMonteStateDto } from "./contract.js"
import { describeHistory, describePlay, describeRisk, ROUBA_MONTE_ERRORS } from "./messages.js"

const HISTORY_LIMIT = 50

const card = z.enum(createFullDeck() as readonly [Card, ...Card[]])
const playerId = z.string().min(1).max(64)

export const roubaMonteActionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("capture"),
    card,
    tableCards: z
      .array(card)
      .min(1)
      .max(COPIES_PER_RANK - 1),
  }),
  z.strictObject({ type: z.literal("stack"), card }),
  z.strictObject({ type: z.literal("steal"), card, targetId: playerId }),
  z.strictObject({ type: z.literal("discard"), card }),
  z.strictObject({ type: z.literal("draw") }),
])

const presenter = (game: Game) => {
  const history = describeHistory(game, HISTORY_LIMIT)
  return (viewerId: PlayerId): RoubaMonteStateDto => {
    const { viewerId: _viewer, events: _events, ...view } = toPlayerView(game, viewerId)
    return { kind: "rouba-monte", ...view, history }
  }
}

const hints = (game: Game, viewerId: PlayerId): RoubaMonteHintsDto => {
  const view = toPlayerView(game, viewerId)
  const computed = computeHints(view, countRanksInPiles(game))
  const nameOf = (id: PlayerId) =>
    view.players.find((player) => player.id === id)?.nickname ?? "Jogador"
  return {
    kind: "rouba-monte",
    plays: computed.plays.map((play) => ({
      action: play.action,
      sentence: describePlay(play, nameOf),
    })),
    highlights: computed.highlights,
    risk: computed.risk && { ...computed.risk, sentence: describeRisk(computed.risk) },
    cardCounts: computed.cardCounts,
  }
}

export const roubaMonteAdapter: GameAdapter<Game, RoubaMonteStateDto, RoubaMonteHintsDto> = {
  id: ROUBA_MONTE_ID,
  actionSchema: roubaMonteActionSchema,
  errorMessages: ROUBA_MONTE_ERRORS,
  presenter,
  hints,
}
