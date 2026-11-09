import { rankOf } from "../../../../domain/cards/card.js"
import type { Card } from "../../../../domain/cards/card.js"
import type { BlackjackErrorCode } from "../../../../domain/games/blackjack/errors.js"
import { ROUNDS } from "../../../../domain/games/blackjack/model.js"
import type {
  BlackjackEvent,
  BlackjackGame,
  HandResult,
  PlayerId,
} from "../../../../domain/games/blackjack/model.js"
import { TWENTY_ONE } from "../../../../domain/games/blackjack/scoring.js"
import { dealerUpValue, isWeakDealer } from "../../../../domain/games/blackjack/strategy.js"
import type { BlackjackAdvice } from "../../../../domain/games/blackjack/strategy.js"
import { cardName, listNames, rankLabel } from "../../card-names.js"
import { setLabel } from "../tres-trincas/messages.js"

export const BLACKJACK_ERRORS: Readonly<Record<BlackjackErrorCode, string>> = {
  BLACKJACK_PLAYER_COUNT: "O Blackjack aceita de 1 a 6 jogadores.",
  GAME_FINISHED: "A partida já terminou.",
  NOT_BETTING: "As apostas desta rodada já fecharam.",
  ALREADY_BET: "Você já apostou nesta rodada.",
  OUT_OF_CHIPS: "Você ficou sem fichas e agora só assiste.",
  INVALID_BET: "Aposte de 10 em 10, de 10 fichas até todas as que você tem.",
  NOT_YOUR_TURN: "Não é a sua vez.",
  DEALER_PLAYING: "Agora é a vez da banca: espere o resultado.",
  TABLE_DEALING: "A banca está distribuindo as cartas: espere a sua vez.",
  INSURANCE_NOT_AVAILABLE: "O seguro não está disponível agora.",
  ALREADY_INSURED: "Você já escolheu o seguro nesta rodada.",
  CANNOT_INSURE: "Você não tem fichas suficientes para o seguro.",
  CANNOT_DOUBLE:
    "Só dá para dobrar com as 2 primeiras cartas, sem ter dividido e com fichas para cobrir a aposta.",
  CANNOT_SPLIT:
    "Só dá para dividir um par nas 2 primeiras cartas, uma vez por rodada e com fichas para cobrir a aposta.",
}

type Names = (id: PlayerId) => string

export const formatChips = (chips: number): string => chips.toLocaleString("pt-BR")

const handLabel = (result: HandResult): string =>
  result.fromSplit ? ` na ${result.handIndex + 1}ª mão` : ""

const describeResult = (result: HandResult, nameOf: Names): string => {
  const who = nameOf(result.playerId)
  const where = handLabel(result)
  switch (result.outcome) {
    case "blackjack":
      return `${who} fez blackjack${where} e ganhou ${formatChips(result.net)}`
    case "win":
      return `${who} ganhou ${formatChips(result.net)}${where}`
    case "push":
      return `${who} empatou com a banca${where} e recebeu a aposta de volta`
    case "lose":
      return `${who} perdeu ${formatChips(result.bet)}${where}`
    case "bust":
      return `${who} estourou${where} e perdeu ${formatChips(result.bet)}`
  }
}

const describeTotal = (total: number): string =>
  total > TWENTY_ONE ? `e estourou com ${total}` : `e foi a ${total}`

const describeFinish = (winnerIds: readonly PlayerId[], nameOf: Names): string => {
  if (winnerIds.length === 0) return "A partida terminou sem fichas na mesa"
  const verb = winnerIds.length === 1 ? "venceu" : "venceram"
  return `${listNames(winnerIds.map(nameOf))} ${verb} com mais fichas`
}

const describeSplit = (cards: readonly Card[]): string => {
  const ranks = cards.map(rankOf)
  const [first, second] = ranks
  if (!first || !second) return "a mão"
  return first === second
    ? `o par ${setLabel(first)}`
    : `${rankLabel(first)} e ${rankLabel(second)}`
}

const describeLeave = (playerId: PlayerId, bet: number, nameOf: Names): string =>
  bet > 0
    ? `${nameOf(playerId)} saiu da partida e perdeu a aposta de ${formatChips(bet)}`
    : `${nameOf(playerId)} saiu da partida`

type Describers = {
  readonly [Type in BlackjackEvent["type"]]: (
    event: Extract<BlackjackEvent, { readonly type: Type }>,
    nameOf: Names
  ) => string
}

const DESCRIBERS: Describers = {
  roundStarted: (event) => `Rodada ${event.round} de ${ROUNDS}: façam suas apostas`,
  bet: (event, nameOf) => `${nameOf(event.playerId)} apostou ${formatChips(event.amount)}`,
  insurance: (event, nameOf) =>
    event.accepted
      ? `${nameOf(event.playerId)} fez seguro de ${formatChips(event.amount)}`
      : `${nameOf(event.playerId)} recusou o seguro`,
  dealt: () => "As cartas foram distribuídas",
  hit: (event, nameOf) =>
    `${nameOf(event.playerId)} pediu ${cardName(event.card)} ${describeTotal(event.total)}`,
  stood: (event, nameOf) => `${nameOf(event.playerId)} parou com ${event.total}`,
  doubled: (event, nameOf) =>
    `${nameOf(event.playerId)} dobrou com ${event.from} e recebeu ${cardName(event.card)}`,
  split: (event, nameOf) => `${nameOf(event.playerId)} dividiu ${describeSplit(event.cards)}`,
  busted: (event, nameOf) => `${nameOf(event.playerId)} estourou com ${event.total}`,
  dealerRevealed: (event) => `A banca revelou ${cardName(event.card)} e tem ${event.total}`,
  dealerDrew: (event) => `A banca comprou ${cardName(event.card)} ${describeTotal(event.total)}`,
  settled: (event, nameOf) => describeResult(event.result, nameOf),
  restocked: () => "O baralho acabou e um novo foi embaralhado sem as cartas da mesa",
  timedOut: (event, nameOf) => `O tempo de ${nameOf(event.playerId)} acabou`,
  broke: (event, nameOf) => `${nameOf(event.playerId)} ficou sem fichas e passa a assistir`,
  playerLeft: (event, nameOf) => describeLeave(event.playerId, event.bet, nameOf),
  finished: (event, nameOf) => describeFinish(event.winnerIds, nameOf),
}

export const describeBlackjackEvent = (event: BlackjackEvent, nameOf: Names): string =>
  (DESCRIBERS[event.type] as (event: BlackjackEvent, nameOf: Names) => string)(event, nameOf)

export const describeBlackjackHistory = (game: BlackjackGame, limit: number): readonly string[] => {
  const nameOf: Names = (id) => game.nicknames[id] ?? "Jogador"
  return game.events
    .slice(-limit)
    .map((event) => describeBlackjackEvent(event, nameOf))
    .reverse()
}

const totalLabel = ({ total, soft }: BlackjackAdvice): string =>
  soft ? `${total} macio` : String(total)

export const describeBlackjackAdvice = (advice: BlackjackAdvice): string => {
  const up = rankLabel(rankOf(advice.dealerUp))
  const weak = isWeakDealer(dealerUpValue(advice.dealerUp))
  const total = totalLabel(advice)
  switch (advice.play) {
    case "split":
      return `Divida o par ${setLabel(advice.pair ?? "A")}: duas mãos rendem mais que ${total}.`
    case "double":
      return `Dobre com ${total}: a banca mostra ${up} e a chance de ganhar é alta.`
    case "stand":
      return weak
        ? `Pare com ${total}: a banca mostra ${up} e tende a estourar.`
        : `Pare com ${total}: pedir arrisca mais do que ajuda.`
    case "hit":
      return advice.total <= 11
        ? `Peça carta: com ${total} não dá para estourar.`
        : `Peça carta: ${total} perde para a banca, que mostra ${up}.`
  }
}
