import { rankName, rankOf, suitOf } from "@/lib/game/domain/cards"
import type {
  CachetaPlayer,
  CachetaState,
  Meld,
  RoundResult,
} from "@/lib/game/domain/cacheta/types"
import type { Card, PlayerId, Rank, Suit } from "@/lib/game/domain/types"

export const STARTING_POINTS = 10

const SUIT_TITLES: Readonly<Record<Suit, string>> = {
  C: "paus",
  D: "ouros",
  H: "copas",
  S: "espadas",
}

const RANK_PLURALS: Partial<Readonly<Record<Rank, string>>> = {
  A: "ases",
  J: "valetes",
  Q: "damas",
  K: "reis",
}

export const isWildCard = (card: Card, wildRank: Rank): boolean =>
  rankOf(card) === wildRank

export const nicknameOf = (game: CachetaState, playerId: PlayerId): string =>
  game.players.find((player) => player.id === playerId)?.nickname ?? "Alguém"

export const labelOf = (
  game: CachetaState,
  playerId: PlayerId,
  viewerId: PlayerId
): string => (playerId === viewerId ? "Você" : nicknameOf(game, playerId))

export const roundResultOf = (game: CachetaState): RoundResult | null => {
  const result = game.lastRound
  if (!result || result.round !== game.round) return null
  const showing = game.pending === "nextRound" || game.endReason === "knockout"
  return showing ? result : null
}

export const describeTurn = (
  game: CachetaState,
  viewerId: PlayerId
): string => {
  if (roundResultOf(game)) return "Resultado da rodada"
  return game.currentPlayerId === viewerId
    ? "Sua vez"
    : `Vez de ${nicknameOf(game, game.currentPlayerId)}`
}

export const describeNextStep = (
  game: CachetaState,
  viewerId: PlayerId
): string => {
  if (game.endReason !== null) return "A partida terminou."
  if (game.pending !== null) return "Nova rodada em instantes..."
  const viewer = game.players.find((player) => player.id === viewerId)
  if (viewer && viewer.status !== "playing") {
    return "Você foi eliminado e agora assiste à partida."
  }
  if (game.currentPlayerId !== viewerId) {
    return `Aguarde a vez de ${nicknameOf(game, game.currentPlayerId)}.`
  }
  if (game.moves.draw) {
    return game.moves.take
      ? "Compre do monte ou pegue a carta do descarte."
      : "Compre uma carta do monte."
  }
  return "Toque numa carta para descartar, ou bata se as outras 9 fecham em jogos."
}

export const describeJoker = (game: CachetaState): string =>
  `Coringa: ${rankName(game.wildRank)}`

export const meldTitle = (meld: Meld): string => {
  const natural = meld.cards.find((_, index) => !meld.jokers[index])
  if (!natural) return meld.kind === "trinca" ? "Trinca" : "Sequência"
  if (meld.kind === "trinca") {
    const rank = rankOf(natural)
    return `Trinca de ${RANK_PLURALS[rank] ?? rank}`
  }
  return `Sequência de ${SUIT_TITLES[suitOf(natural)]}`
}

export const knockTitle = (result: RoundResult): string =>
  result.clean ? "Bateu limpo" : "Bateu"

export const describeLoss = (result: RoundResult): string =>
  result.clean
    ? "Sem coringa: cada adversário perde 2 pontos."
    : "Com coringa: cada adversário perde 1 ponto."

export const standingsOf = (game: CachetaState): readonly CachetaPlayer[] => {
  const order = [...game.eliminations].reverse()
  const rankOfPlayer = (player: CachetaPlayer): number => {
    if (player.id === game.winnerId) return -1
    const position = order.indexOf(player.id)
    return position < 0 ? -1 : position
  }
  return [...game.players].sort(
    (first, second) =>
      rankOfPlayer(first) - rankOfPlayer(second) || second.points - first.points
  )
}

export const describeStatus = (player: CachetaPlayer): string | null => {
  if (player.status === "left") return "saiu"
  return player.status === "out" ? "eliminado" : null
}

export const describeResult = (
  game: CachetaState,
  viewerId: PlayerId
): string => {
  if (game.winnerId === null) return "Partida encerrada"
  return game.winnerId === viewerId
    ? "Você venceu!"
    : `${nicknameOf(game, game.winnerId)} venceu`
}

export const explainEnd = (game: CachetaState): string => {
  if (game.endReason === "abandoned") {
    return "Os outros jogadores saíram, e a partida terminou."
  }
  const rounds = game.round === 1 ? "1 rodada" : `${game.round} rodadas`
  return `Foi o último com pontos depois de ${rounds}.`
}
