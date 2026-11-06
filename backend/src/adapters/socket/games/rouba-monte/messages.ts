import { rankOf } from "../../../../domain/cards/card.js"
import type { GameErrorCode } from "../../../../domain/games/rouba-monte/errors.js"
import type { Play, RiskAlert } from "../../../../domain/games/rouba-monte/hints.js"
import type { Game, GameEvent, PlayerId } from "../../../../domain/games/rouba-monte/model.js"
import { cardCount, cardName, rankLabel } from "../../card-names.js"

export const ROUBA_MONTE_ERRORS: Readonly<Record<GameErrorCode, string>> = {
  INVALID_PLAYER_COUNT: "O Rouba Monte precisa de 2 a 6 jogadores.",
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
}

const unseenCards = (count: number): string =>
  count === 1
    ? "1 carta desse valor ainda não apareceu"
    : `${count} cartas desse valor ainda não apareceram`

export const describeEvent = (event: GameEvent, nameOf: (id: PlayerId) => string): string => {
  switch (event.type) {
    case "drew":
      return `${nameOf(event.playerId)} comprou 1 carta`
    case "captured":
      return `${nameOf(event.playerId)} capturou ${cardCount(event.tableCards.length)} da mesa com ${cardName(event.card)}`
    case "stacked":
      return `${nameOf(event.playerId)} pôs ${cardName(event.card)} no próprio monte`
    case "stole":
      return `${nameOf(event.playerId)} roubou o monte de ${nameOf(event.targetId)} (${cardCount(event.stolenCount)})`
    case "discarded":
      return `${nameOf(event.playerId)} descartou ${cardName(event.card)}`
    case "handRefilled":
      return `${nameOf(event.playerId)} completou a mão com ${cardCount(event.count)}`
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
  }
}

export const describeRisk = (risk: RiskAlert): string =>
  `Seu monte de ${cardCount(risk.pileSize)} pode ser roubado com ${rankLabel(risk.rank)}: ${unseenCards(risk.unseenCards)}.`
