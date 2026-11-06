import type { PokerErrorCode } from "../../../../domain/games/poker/errors.js"
import type { HandCategory } from "../../../../domain/games/poker/hand-ranking.js"
import type { PokerHints } from "../../../../domain/games/poker/hints.js"
import type { PlayerId, PokerEvent, PokerGame } from "../../../../domain/games/poker/model.js"
import { cardName, listNames } from "../../card-names.js"

export const POKER_ERRORS: Readonly<Record<PokerErrorCode, string>> = {
  INVALID_PLAYER_COUNT: "O Poker precisa de 2 a 6 jogadores.",
  GAME_FINISHED: "A partida já terminou.",
  NOT_YOUR_TURN: "Não é a sua vez.",
  CANNOT_FOLD: "Ninguém apostou: passe a vez de graça em vez de desistir.",
  CANNOT_CHECK: "Há aposta na mesa: pague, aumente ou desista.",
  NOTHING_TO_CALL: "Não há aposta para pagar: passe ou aposte.",
  CANNOT_BET: "Já há aposta nesta rodada: pague ou aumente.",
  CANNOT_RAISE: "Você não pode aumentar agora.",
  AMOUNT_TOO_SMALL: "O valor está abaixo do mínimo permitido.",
  AMOUNT_TOO_LARGE: "Você não tem fichas para esse valor.",
}

export const HAND_NAMES: Readonly<Record<HandCategory, string>> = {
  highCard: "carta alta",
  pair: "par",
  twoPair: "dois pares",
  threeOfAKind: "trinca",
  straight: "sequência",
  flush: "flush",
  fullHouse: "full house",
  fourOfAKind: "quadra",
  straightFlush: "straight flush",
  royalFlush: "royal flush",
}

const HAND_ARTICLES: Readonly<Record<HandCategory, string>> = {
  highCard: "só ",
  pair: "um ",
  twoPair: "",
  threeOfAKind: "uma ",
  straight: "uma ",
  flush: "um ",
  fullHouse: "um ",
  fourOfAKind: "uma ",
  straightFlush: "um ",
  royalFlush: "um ",
}

const STREET_NAMES = { preflop: "Pré-flop", flop: "Flop", turn: "Turn", river: "River" } as const

type Names = (id: PlayerId) => string

const describeAction = (event: Extract<PokerEvent, { type: "acted" }>, name: string): string => {
  if (event.allIn && event.move !== "call") return `${name} foi all-in com ${event.amount}`
  const allIn = event.allIn ? " e foi all-in" : ""
  switch (event.move) {
    case "fold":
      return `${name} desistiu`
    case "check":
      return `${name} passou`
    case "call":
      return `${name} pagou ${event.amount}${allIn}`
    case "bet":
      return `${name} apostou ${event.amount}`
    case "raise":
      return `${name} aumentou para ${event.amount}`
  }
}

const describePot = (event: Extract<PokerEvent, { type: "potWon" }>, nameOf: Names): string => {
  const names = listNames(event.playerIds.map(nameOf))
  if (event.category === null) return `${names} levou ${event.amount} sem mostrar as cartas`
  const verb = event.playerIds.length > 1 ? "dividiram" : "ganhou"
  return `${names} ${verb} ${event.amount} com ${HAND_NAMES[event.category]}`
}

export const describePokerEvent = (event: PokerEvent, nameOf: Names): string => {
  switch (event.type) {
    case "handStarted":
      return `Mão ${event.number}: botão com ${nameOf(event.buttonId)} e blinds de ${event.blinds.small} e ${event.blinds.big}`
    case "blindPosted":
      return `${nameOf(event.playerId)} pagou a ${event.big ? "big" : "small"} blind de ${event.amount}`
    case "acted":
      return describeAction(event, nameOf(event.playerId))
    case "streetDealt":
      return `${STREET_NAMES[event.street]}: ${listNames(event.cards.map(cardName))}`
    case "potWon":
      return describePot(event, nameOf)
    case "eliminated":
      return `${nameOf(event.playerId)} foi eliminado em ${event.place}º lugar`
    case "timedOut":
      return `O tempo de ${nameOf(event.playerId)} acabou`
    case "playerLeft":
      return `${nameOf(event.playerId)} saiu da partida`
    case "matchWon":
      return `${nameOf(event.playerId)} venceu a partida com todas as fichas`
  }
}

export const describePokerHistory = (game: PokerGame, limit: number): readonly string[] => {
  const nameOf: Names = (id) => game.nicknames[id] ?? "Jogador"
  return game.events
    .slice(-limit)
    .map((event) => describePokerEvent(event, nameOf))
    .reverse()
}

const percentOf = (part: number, whole: number): number => Math.round((part / whole) * 100)

export const describePokerHints = ({ current, outs }: PokerHints): readonly string[] => {
  if (!current) return []
  const now = `Você tem ${HAND_ARTICLES[current.category]}${HAND_NAMES[current.category]}.`
  if (!outs) return [now]
  if (outs.total === 0) return [now, "Nenhuma carta melhora o seu jogo na próxima carta."]
  const best = outs.byCategory
    .slice(0, 2)
    .map((entry) => `${entry.count} para ${HAND_NAMES[entry.category]}`)
  return [
    now,
    `${outs.total} de ${outs.unseen} cartas melhoram o seu jogo na próxima carta (${percentOf(outs.total, outs.unseen)}%): ${listNames(best)}.`,
  ]
}
