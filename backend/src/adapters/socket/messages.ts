import type { ApplicationErrorCode } from "../../application/errors.js"
import { rankOf } from "../../domain/cards/card.js"
import type { Card, Rank, Suit } from "../../domain/cards/card.js"
import type { Play, RiskAlert } from "../../domain/game/hints.js"
import type { Game, GameEvent, PlayerId } from "../../domain/game/model.js"

export type TransportErrorCode =
  "INVALID_PAYLOAD" | "NOT_IN_ROOM" | "ALREADY_IN_ROOM" | "RATE_LIMITED" | "INTERNAL_ERROR"

export type ErrorCode = ApplicationErrorCode | TransportErrorCode

const ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  INVALID_PLAYER_COUNT: "A partida precisa de 2 a 6 jogadores.",
  GAME_FINISHED: "A partida já terminou.",
  NOT_YOUR_TURN: "Não é a sua vez.",
  ACTION_ALREADY_USED: "Você já fez sua jogada neste turno.",
  DECK_EMPTY: "O monte de compra acabou.",
  NO_CARDS_SELECTED: "Selecione ao menos uma carta da sua mão.",
  CARD_NOT_IN_HAND: "Essa carta não está na sua mão.",
  CARD_NOT_ON_TABLE: "Essa carta não está na mesa.",
  CARDS_MUST_SHARE_RANK: "As cartas precisam ser do mesmo valor.",
  MELD_REQUIRES_TWO_CARDS: "Para abrir uma quadra, baixe ao menos 2 cartas iguais.",
  CANNOT_STEAL_FROM_SELF: "Você não pode roubar de si mesmo.",
  TARGET_NOT_FOUND: "Esse jogador não está na partida.",
  MELD_NOT_STEALABLE: "Só quadras incompletas podem ser roubadas.",
  MUST_DISCARD: "Descarte 1 carta ou pegue da mesa para fechar o turno.",
  ROOM_FULL: "A sala está cheia.",
  GAME_ALREADY_STARTED: "A partida está em andamento. Entre quando ela terminar.",
  NICKNAME_TAKEN: "Esse apelido já está em uso na sala.",
  NOT_HOST: "Só o anfitrião pode fazer isso.",
  NOT_ENOUGH_PLAYERS: "A partida precisa de 2 a 6 jogadores.",
  PLAYER_NOT_IN_ROOM: "Esse jogador não está na sala.",
  CANNOT_KICK_SELF: "Você não pode remover a si mesmo.",
  ROOM_NOT_FOUND: "Sala não encontrada.",
  SERVER_FULL: "O servidor está cheio. Tente de novo em alguns minutos.",
  ROOM_CODE_UNAVAILABLE: "Não foi possível criar a sala. Tente de novo.",
  INVALID_RECONNECT: "Não foi possível voltar para a sala.",
  GAME_NOT_RUNNING: "Não há partida em andamento.",
  INVALID_PAYLOAD: "Dados inválidos.",
  NOT_IN_ROOM: "Você não está em uma sala.",
  ALREADY_IN_ROOM: "Você já está em uma sala.",
  RATE_LIMITED: "Muitas ações em pouco tempo. Aguarde um instante.",
  INTERNAL_ERROR: "Ocorreu um erro inesperado.",
}

export const errorMessage = (code: ErrorCode): string => ERROR_MESSAGES[code]

const MELD_NAMES: Readonly<Record<number, string>> = {
  2: "o par",
  3: "a trinca",
  4: "a quadra",
}

const meldName = (size: number, rank: Rank): string =>
  `${MELD_NAMES[size] ?? "as cartas"} de ${rank}`

const cardCount = (count: number): string => (count === 1 ? "1 carta" : `${count} cartas`)

const SUIT_NAMES: Readonly<Record<Suit, string>> = {
  C: "paus",
  D: "ouros",
  H: "copas",
  S: "espadas",
}

const RANK_NAMES: Partial<Readonly<Record<Rank, string>>> = {
  A: "o ás",
  J: "o valete",
  Q: "a dama",
  K: "o rei",
}

const cardName = (card: Card): string => {
  const rank = rankOf(card)
  return `${RANK_NAMES[rank] ?? `o ${rank}`} de ${SUIT_NAMES[card.slice(-1) as Suit]}`
}

const unseenCards = (count: number): string =>
  count === 1
    ? "1 carta desse valor ainda não apareceu"
    : `${count} cartas desse valor ainda não apareceram`

const completion = (completed: boolean): string => (completed ? " e fechou a quadra" : "")

export const describeEvent = (event: GameEvent, nameOf: (id: PlayerId) => string): string => {
  switch (event.type) {
    case "drew":
      return `${nameOf(event.playerId)} comprou 1 carta`
    case "laidDown":
      return `${nameOf(event.playerId)} baixou ${cardCount(event.count)} de ${event.rank}${completion(event.completed)}`
    case "tookFromTable":
      return `${nameOf(event.playerId)} pegou ${cardCount(event.tableCount)} de ${event.rank} da mesa${completion(event.completed)}`
    case "stole":
      return `${nameOf(event.playerId)} roubou ${meldName(event.stolenCount, event.rank)} de ${nameOf(event.targetId)}${completion(event.completed)}`
    case "discarded":
      return `${nameOf(event.playerId)} descartou ${cardName(event.card)}`
    case "handRefilled":
      return `${nameOf(event.playerId)} repôs ${cardCount(event.count)}`
    case "tableReplenished":
      return `A mesa recebeu ${cardCount(event.count)} do monte`
    case "pileRecycled":
      return event.count === 1
        ? "1 carta voltou para o monte"
        : `${event.count} cartas voltaram para o monte`
    case "turnTimedOut":
      return `O tempo de ${nameOf(event.playerId)} acabou`
    case "playerLeft":
      return `${nameOf(event.playerId)} saiu da partida`
  }
}

export const describeHistory = (game: Game, limit: number): readonly string[] => {
  const nameOf = (id: PlayerId) => game.nicknames[id] ?? "Jogador"
  return game.events
    .slice(-limit)
    .map((event) => describeEvent(event, nameOf))
    .reverse()
}

export const describePlay = (play: Play, nameOf: (id: PlayerId) => string): string => {
  const rank = play.rank ?? ""
  switch (play.kind) {
    case "complete":
      return `Fecha a quadra de ${rank} e garante 1 ponto.`
    case "steal":
      return `Rouba as cartas de ${rank} de ${nameOf(play.targetId ?? "")} e tira a jogada dele.`
    case "advance":
      return `Avança sua quadra de ${rank}.`
    case "open":
      return `Abre uma quadra de ${rank} na sua área, mas ela pode ser roubada.`
    case "draw":
      return "Compra 1 carta do monte para ter mais opções."
    case "discard":
      return `Descarta um ${rank}, que é a carta menos útil agora.`
  }
}

export const describeRisk = (risk: RiskAlert): string =>
  `Sua quadra de ${risk.rank} pode ser roubada: ${unseenCards(risk.unseenCards)}.`
