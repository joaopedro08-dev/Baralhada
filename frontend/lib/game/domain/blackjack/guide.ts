import type {
  BlackjackHand,
  BlackjackSeat,
  BlackjackState,
  HandOutcome,
  HandResult,
  RoundResult,
} from "@/lib/game/domain/blackjack/types"
import type { PlayerId } from "@/lib/game/domain/types"

export const STARTING_CHIPS = 1000
export const TWENTY_ONE = 21
export const BET_CHIPS = [10, 50, 100, 500] as const

const ACE_BONUS = 10

export const formatChips = (chips: number): string =>
  chips.toLocaleString("pt-BR")

export const formatNet = (net: number): string =>
  net > 0 ? `+${formatChips(net)}` : net < 0 ? `−${formatChips(-net)}` : "0"

export const nicknameOf = (game: BlackjackState, playerId: PlayerId): string =>
  game.players.find((seat) => seat.id === playerId)?.nickname ?? "Alguém"

export const seatOf = (
  game: BlackjackState,
  playerId: PlayerId
): BlackjackSeat | undefined =>
  game.players.find((seat) => seat.id === playerId)

export const isNaturalHand = (hand: BlackjackHand): boolean =>
  !hand.fromSplit && hand.cards.length === 2 && hand.total === TWENTY_ONE

export const scoreLabel = (total: number, soft: boolean): string =>
  soft && total < TWENTY_ONE ? `${total - ACE_BONUS} ou ${total}` : `${total}`

export const handLabel = (hand: BlackjackHand): string => {
  if (hand.cards.length === 0) return "..."
  if (isNaturalHand(hand)) return "Blackjack"
  if (hand.total > TWENTY_ONE) return `${hand.total} · estourou`
  return hand.done ? `${hand.total}` : scoreLabel(hand.total, hand.soft)
}

export const dealerLabel = (game: BlackjackState): string => {
  const { dealer } = game
  if (dealer.cards.length === 0) return "Aguardando as apostas"
  if (dealer.hidden > 0)
    return `Mostra ${scoreLabel(dealer.total, dealer.soft)}`
  if (dealer.total > TWENTY_ONE) return `Estourou com ${dealer.total}`
  const natural = dealer.cards.length === 2 && dealer.total === TWENTY_ONE
  return natural ? "Blackjack" : `${dealer.total}`
}

export const roundLabel = (game: BlackjackState): string =>
  game.round === game.rounds
    ? `Última rodada · ${game.round} de ${game.rounds}`
    : `Rodada ${game.round} de ${game.rounds}`

export const resultOf = (game: BlackjackState): RoundResult | null => {
  const result = game.lastRound
  if (!result || result.round !== game.round) return null
  return game.phase === "settled" ? result : null
}

export const resultsFor = (
  game: BlackjackState,
  playerId: PlayerId
): readonly HandResult[] =>
  resultOf(game)?.hands.filter((entry) => entry.playerId === playerId) ?? []

export const OUTCOME_LABELS: Readonly<Record<HandOutcome, string>> = {
  blackjack: "Blackjack!",
  win: "Ganhou",
  push: "Empate",
  lose: "Perdeu",
  bust: "Estourou",
}

export const isWinning = (outcome: HandOutcome): boolean =>
  outcome === "blackjack" || outcome === "win"

export const describeTurn = (
  game: BlackjackState,
  viewerId: PlayerId
): string => {
  switch (game.phase) {
    case "betting":
      return game.moves.bet ? "Faça sua aposta" : "Esperando as apostas"
    case "playing":
      return game.currentPlayerId === viewerId
        ? "Sua vez"
        : `Vez de ${nicknameOf(game, game.currentPlayerId ?? "")}`
    case "dealing":
      return "Distribuindo as cartas"
    case "dealer":
      return "Vez da banca"
    case "settled":
      return "Resultado da rodada"
  }
}

export const describeNextStep = (
  game: BlackjackState,
  viewerId: PlayerId
): string => {
  if (game.endReason !== null) return "A partida terminou."
  const seat = seatOf(game, viewerId)
  if (seat?.status === "broke") return "Você ficou sem fichas e agora assiste."
  if (game.phase === "betting") {
    return game.moves.bet
      ? "Escolha as fichas e aposte antes do tempo acabar."
      : "Aposta feita. Esperando os outros jogadores."
  }
  if (game.phase === "dealing") {
    return "A banca está distribuindo, uma carta por vez."
  }
  if (game.phase === "dealer")
    return "A banca revela e compra até ter 17 ou mais."
  if (game.phase === "settled") return "Próxima rodada em instantes..."
  if (game.currentPlayerId !== viewerId) {
    return `Aguarde a vez de ${nicknameOf(game, game.currentPlayerId ?? "")}.`
  }
  const hands = seat?.hands.length ?? 1
  const which = hands > 1 ? ` (mão ${game.handIndex + 1} de ${hands})` : ""
  return `Peça carta ou pare${which}.`
}

export const clampBet = (amount: number, max: number, min: number): number =>
  Math.max(min, Math.min(max, amount))

export const isValidBet = (amount: number, chips: number): boolean =>
  amount === chips || (amount >= 10 && amount % 10 === 0 && amount <= chips)

export const standingsOf = (game: BlackjackState): readonly BlackjackSeat[] =>
  [...game.players].sort((first, second) => second.chips - first.chips)

export const describeResult = (
  game: BlackjackState,
  viewerId: PlayerId
): string => {
  if (game.players.length === 1) {
    const balance = (seatOf(game, viewerId)?.chips ?? 0) - STARTING_CHIPS
    if (balance === 0) return "Empate com a banca"
    return balance > 0 ? "Você venceu a banca!" : "A banca levou a melhor"
  }
  if (game.winnerIds.length === 0) return "Ninguém ficou com fichas"
  if (game.winnerIds.includes(viewerId)) {
    return game.winnerIds.length > 1
      ? "Você empatou na liderança!"
      : "Você venceu!"
  }
  const names = game.winnerIds.map((id) => nicknameOf(game, id))
  return names.length > 1
    ? `${names.join(" e ")} venceram`
    : `${names[0] ?? "Alguém"} venceu`
}

export const explainEnd = (
  game: BlackjackState,
  viewerId: PlayerId
): string => {
  if (game.players.length === 1) {
    const chips = seatOf(game, viewerId)?.chips ?? 0
    return `Saldo final: ${formatNet(chips - STARTING_CHIPS)} fichas em relação às ${formatChips(STARTING_CHIPS)} iniciais.`
  }
  if (game.endReason === "broke")
    return "Todos ficaram sem fichas antes da 10ª rodada."
  if (game.endReason === "abandoned")
    return "Os jogadores saíram e a partida terminou."
  return `Mais fichas depois de ${game.rounds} rodadas.`
}
