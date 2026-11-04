import { appendEvents, TABLE_MINIMUM, TABLE_SIZE } from "./model.js"
import type { Game } from "./model.js"

export const replenishTable = (game: Game): Game => {
  if (game.table.length >= TABLE_MINIMUM || game.deck.length === 0) return game
  const count = Math.min(TABLE_SIZE - game.table.length, game.deck.length)
  return {
    ...game,
    table: [...game.table, ...game.deck.slice(0, count)],
    deck: game.deck.slice(count),
    events: appendEvents(game.events, { type: "tableReplenished", count }),
  }
}
