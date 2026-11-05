import type { ApplicationErrorCode } from "../../application/errors.js"
import { rankOf } from "../../domain/cards/card.js"
import type { Card, Rank, Suit } from "../../domain/cards/card.js"
import type { GameErrorCode } from "../../domain/games/rouba-monte/errors.js"
import type { Play, RiskAlert } from "../../domain/games/rouba-monte/hints.js"
import type { Game, GameEvent, PlayerId } from "../../domain/games/rouba-monte/model.js"

export type TransportErrorCode =
  | "INVALID_PAYLOAD"
  | "NOT_IN_ROOM"
  | "ALREADY_IN_ROOM"
  | "RATE_LIMITED"
  | "TOO_MANY_ROOMS"
  | "INTERNAL_ERROR"

export type ErrorCode = ApplicationErrorCode<GameErrorCode> | TransportErrorCode

const ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  INVALID_PLAYER_COUNT: "A partida precisa de 2 a 6 jogadores.",
  GAME_FINISHED: "A partida já terminou.",
  NOT_YOUR_TURN: "Não é a sua vez.",
  CARD_NOT_IN_HAND: "Essa carta não está na sua mão.",
  CARD_NOT_ON_TABLE: "Essa carta não está na mesa.",
  NO_TABLE_CARDS_SELECTED: "Toque nas cartas da mesa que quer capturar.",
  CARDS_MUST_SHARE_RANK: "As cartas precisam ser do mesmo valor.",
  PILE_EMPTY: "Esse monte ainda está vazio.",
  TOP_MISMATCH: "A carta precisa ter o mesmo valor do topo do monte.",
  CANNOT_STEAL_FROM_SELF: "Você não pode roubar o próprio monte.",
  TARGET_NOT_FOUND: "Esse jogador não está na partida.",
  DECK_EMPTY: "O baralho de compra acabou.",
  ALREADY_DREW: "Você já comprou neste turno.",
  MUST_DRAW_BEFORE_PASSING: "Para passar a vez, compre 1 carta antes.",
  MUST_PLAY_AFTER_DRAW: "Com 5 cartas, descarte, capture, ponha no monte ou roube.",
  MUST_PASS_AFTER_DRAW: "Você comprou e está com até 4 cartas: passe a vez.",
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
  MATCH_STARTING: "A partida está começando.",
  INVALID_PAYLOAD: "Dados inválidos.",
  NOT_IN_ROOM: "Você não está em uma sala.",
  ALREADY_IN_ROOM: "Você já está em uma sala.",
  RATE_LIMITED: "Muitas ações em pouco tempo. Aguarde um instante.",
  TOO_MANY_ROOMS:
    "Já há salas demais abertas nesta conexão. Saia de uma ou aguarde alguns minutos.",
  INTERNAL_ERROR: "Ocorreu um erro inesperado.",
}

export const errorMessage = (code: ErrorCode): string => ERROR_MESSAGES[code]

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

const rankLabel = (rank: Rank): string => RANK_NAMES[rank] ?? `o ${rank}`

const cardName = (card: Card): string =>
  `${rankLabel(rankOf(card))} de ${SUIT_NAMES[card.slice(-1) as Suit]}`

const unseenCards = (count: number): string =>
  count === 1
    ? "1 carta desse valor ainda não apareceu"
    : `${count} cartas desse valor ainda não apareceram`

export const describeEvent = (event: GameEvent, nameOf: (id: PlayerId) => string): string => {
  switch (event.type) {
    case "drew":
      return `${nameOf(event.playerId)} comprou 1 carta`
    case "passed":
      return `${nameOf(event.playerId)} passou a vez`
    case "captured":
      return `${nameOf(event.playerId)} capturou ${cardCount(event.tableCards.length)} da mesa com ${cardName(event.card)}`
    case "stacked":
      return `${nameOf(event.playerId)} pôs ${cardName(event.card)} no próprio monte`
    case "stole":
      return `${nameOf(event.playerId)} roubou o monte de ${nameOf(event.targetId)} (${cardCount(event.stolenCount)})`
    case "discarded":
      return `${nameOf(event.playerId)} descartou ${cardName(event.card)}`
    case "handRefilled":
      return `${nameOf(event.playerId)} recebeu ${cardCount(event.count)}`
    case "tableReplenished":
      return `A mesa recebeu ${cardCount(event.count)} do baralho`
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

export const describePlay = (
  { action, gainedCards }: Play,
  nameOf: (id: PlayerId) => string
): string => {
  const gained = cardCount(gainedCards)
  switch (action.type) {
    case "steal":
      return `Rouba o monte de ${nameOf(action.targetId)} com ${rankLabel(rankOf(action.card))} e leva ${gained}.`
    case "capture":
      return `Captura ${rankLabel(rankOf(action.card))} da mesa e leva ${gained} para o seu monte.`
    case "stack":
      return `Põe ${rankLabel(rankOf(action.card))} no seu monte, que mantém o mesmo topo.`
    case "discard":
      return `Descarta ${rankLabel(rankOf(action.card))}, a carta que menos ajuda os adversários agora.`
    case "draw":
      return "Compra 1 carta do baralho para ter mais opções."
    case "pass":
      return "Passa a vez e guarda as cartas da mão."
  }
}

export const describeRisk = (risk: RiskAlert): string =>
  `Seu monte de ${cardCount(risk.pileSize)} pode ser roubado com ${rankLabel(risk.rank)}: ${unseenCards(risk.unseenCards)}.`
