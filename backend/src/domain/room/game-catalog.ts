import type { AnyGameRules } from "./game-rules.js"

export interface GameCatalog {
  readonly defaultGameId: string
  readonly games: readonly AnyGameRules[]
  find(gameId: string): AnyGameRules | undefined
}

export const createGameCatalog = (games: readonly AnyGameRules[]): GameCatalog => {
  const [first] = games
  if (!first) throw new Error("O catálogo precisa de pelo menos um jogo")
  const byId = new Map(games.map((game) => [game.id, game]))
  if (byId.size !== games.length) throw new Error("Há jogos repetidos no catálogo")
  return {
    defaultGameId: first.id,
    games,
    find: (gameId) => byId.get(gameId),
  }
}
