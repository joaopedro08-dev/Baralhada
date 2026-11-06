import { rankName, rankOf } from "@/lib/game/domain/cards"
import type {
  CardSet,
  TresTrincasState,
} from "@/lib/game/domain/tres-trincas/types"
import type { PlayerId, Rank } from "@/lib/game/domain/types"

export const SET_SIZE = 3
export const SETS_TO_WIN = 3

const RANK_PLURALS: Partial<Readonly<Record<Rank, string>>> = {
  A: "ases",
  J: "valetes",
  Q: "damas",
  K: "reis",
}

export const setLabel = (rank: Rank): string =>
  `de ${RANK_PLURALS[rank] ?? rank}`

export const setRankOf = (set: CardSet, wildRank: Rank): Rank =>
  set.map(rankOf).find((rank) => rank !== wildRank) ?? wildRank

export const nicknameOf = (game: TresTrincasState, playerId: PlayerId) =>
  game.players.find((player) => player.id === playerId)?.nickname ?? "Alguém"

export const setsOf = (game: TresTrincasState, playerId: PlayerId) =>
  game.players.find((player) => player.id === playerId)?.sets ?? []

export const describeTurn = (
  game: TresTrincasState,
  viewerId: PlayerId
): string =>
  game.currentPlayerId === viewerId
    ? "Sua vez"
    : `Vez de ${nicknameOf(game, game.currentPlayerId)}`

export const describeNextStep = (
  game: TresTrincasState,
  viewerId: PlayerId
): string => {
  if (game.endReason !== null) return "A partida terminou."
  if (game.currentPlayerId !== viewerId) {
    return `Aguarde a vez de ${nicknameOf(game, game.currentPlayerId)}.`
  }
  const { moves } = game
  if (moves.draw) {
    return moves.meldLimit > 0
      ? "Compre uma carta ou, se já tiver trinca, baixe sem comprar."
      : "Compre uma carta do monte."
  }
  return moves.meldLimit > 0
    ? "Baixe uma trinca ou descarte 1 carta."
    : "Descarte 1 carta para passar a vez."
}

export const meldSizeFits = (selected: number, meldLimit: number): boolean =>
  selected > 0 && selected % SET_SIZE === 0 && selected / SET_SIZE <= meldLimit

export const meldLabel = (selected: number): string =>
  selected > SET_SIZE ? "Baixar as duas trincas" : "Baixar trinca"

export const describeJokers = (game: TresTrincasState): string =>
  `Coringa: ${rankName(game.wildRank)} · Morto: ${rankName(game.deadRank)}`

export const describeResult = (
  game: TresTrincasState,
  viewerId: PlayerId
): string => {
  if (game.winnerId === null) return "Partida encerrada"
  return game.winnerId === viewerId
    ? "Você venceu!"
    : `${nicknameOf(game, game.winnerId)} venceu`
}

export const explainEnd = (game: TresTrincasState): string =>
  game.endReason === "abandoned"
    ? "Os outros jogadores saíram, e a partida terminou."
    : "Baixou as 3 trincas primeiro e ficou com a mão vazia."
