import { countCompleteMelds } from "@/lib/game/domain/cards"
import type { GamePlayer, GameState, PlayerId } from "@/lib/game/domain/types"

const listNames = (names: readonly string[]): string =>
  names.length < 2
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`

export const rankPlayers = (
  players: readonly GamePlayer[]
): readonly GamePlayer[] =>
  [...players].sort(
    (a, b) => countCompleteMelds(b.melds) - countCompleteMelds(a.melds)
  )

export const describeResult = (game: GameState, viewerId: PlayerId): string => {
  const winners = game.players
    .filter((player) => game.winnerIds.includes(player.id))
    .map((player) => player.nickname)
  const viewerWon = game.winnerIds.includes(viewerId)
  if (winners.length > 1) {
    return viewerWon
      ? `Você empatou! Vencem ${listNames(winners)}`
      : `Empate: vencem ${listNames(winners)}`
  }
  return viewerWon ? "Você venceu!" : `${winners[0] ?? "Ninguém"} venceu`
}
