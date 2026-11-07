import { z } from "zod"
import { BLACKJACK_ID, STARTING_CHIPS } from "../../../../domain/games/blackjack/model.js"
import type { BlackjackGame, PlayerId } from "../../../../domain/games/blackjack/model.js"
import { toBlackjackView } from "../../../../domain/games/blackjack/player-view.js"
import { computeBlackjackHints } from "../../../../domain/games/blackjack/strategy.js"
import type { GameAdapter } from "../../game-adapter.js"
import type { BlackjackHintsDto, BlackjackStateDto } from "./contract.js"
import { BLACKJACK_ERRORS, describeBlackjackAdvice, describeBlackjackHistory } from "./messages.js"

const HISTORY_LIMIT = 60
const MAX_BET = STARTING_CHIPS * 100

export const blackjackActionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("bet"),
    amount: z.number().int().min(1).max(MAX_BET),
  }),
  z.strictObject({ type: z.literal("hit") }),
  z.strictObject({ type: z.literal("stand") }),
  z.strictObject({ type: z.literal("double") }),
  z.strictObject({ type: z.literal("split") }),
])

const presenter = (game: BlackjackGame) => {
  const history = describeBlackjackHistory(game, HISTORY_LIMIT)
  return (viewerId: PlayerId): BlackjackStateDto => {
    const { viewerId: _viewer, events: _events, ...view } = toBlackjackView(game, viewerId)
    return { kind: "blackjack", ...view, history }
  }
}

const hints = (game: BlackjackGame, viewerId: PlayerId): BlackjackHintsDto => {
  const { advice } = computeBlackjackHints(toBlackjackView(game, viewerId))
  return {
    kind: "blackjack",
    advice: advice && {
      action: advice.action,
      play: advice.play,
      sentence: describeBlackjackAdvice(advice),
    },
  }
}

export const blackjackAdapter: GameAdapter<BlackjackGame, BlackjackStateDto, BlackjackHintsDto> = {
  id: BLACKJACK_ID,
  actionSchema: blackjackActionSchema,
  errorMessages: BLACKJACK_ERRORS,
  presenter,
  hints,
}
