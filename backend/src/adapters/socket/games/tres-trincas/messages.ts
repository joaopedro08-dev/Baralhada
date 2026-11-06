import type { Rank } from "../../../../domain/cards/card.js"
import type { TrincaErrorCode } from "../../../../domain/games/tres-trincas/errors.js"
import type { TrincaSuggestion } from "../../../../domain/games/tres-trincas/hints.js"
import type {
  PlayerId,
  TrincaEvent,
  TrincaGame,
} from "../../../../domain/games/tres-trincas/model.js"
import { jokersFor, setRankOf } from "../../../../domain/games/tres-trincas/sets.js"
import { cardCount, cardName, listNames, rankLabel } from "../../card-names.js"

export const TRES_TRINCAS_ERRORS: Readonly<Record<TrincaErrorCode, string>> = {
  INVALID_PLAYER_COUNT: "O Três Trincas precisa de 2 a 4 jogadores.",
  GAME_FINISHED: "A partida já terminou.",
  NOT_YOUR_TURN: "Não é a sua vez.",
  CARD_NOT_IN_HAND: "Essa carta não está na sua mão.",
  ALREADY_DREW: "Você já comprou neste turno.",
  DRAW_FIRST: "Compre uma carta do monte antes de descartar.",
  DRAW_BEFORE_MELD: "Com 4 ou 2 cartas, compre antes de baixar a trinca.",
  MELD_ONLY_AT_START: "Com 7 cartas, só dá para baixar no começo da vez, antes de comprar.",
  WRONG_MELD_SIZE:
    "Escolha 3 cartas para baixar uma trinca. Duas trincas juntas só no começo da vez, com 7 cartas.",
  DEAD_CARD: "Cartas do valor do vira estão mortas e não formam trinca.",
  NOT_A_SET: "Essas cartas não formam uma trinca.",
}

const RANK_PLURALS: Partial<Readonly<Record<Rank, string>>> = {
  A: "ases",
  J: "valetes",
  Q: "damas",
  K: "reis",
}

export const setLabel = (rank: Rank): string => `de ${RANK_PLURALS[rank] ?? rank}`

type Names = (id: PlayerId) => string

const describeMeld = (game: TrincaGame, event: Extract<TrincaEvent, { type: "melded" }>) => {
  const jokers = jokersFor(game.vira)
  const labels = event.sets.map((set) => setLabel(setRankOf(set, jokers)))
  return labels.length === 1 ? `uma trinca ${labels[0]}` : `duas trincas: ${listNames(labels)}`
}

export const describeTrincaEvent = (game: TrincaGame, event: TrincaEvent, nameOf: Names) => {
  switch (event.type) {
    case "dealt":
      return `A vira é ${cardName(event.vira)}: esse valor fica morto e ${rankLabel(jokersFor(event.vira).wild)} é o coringa`
    case "drew":
      return `${nameOf(event.playerId)} comprou 1 carta`
    case "discarded":
      return `${nameOf(event.playerId)} descartou ${cardName(event.card)}`
    case "melded":
      return `${nameOf(event.playerId)} baixou ${describeMeld(game, event)}`
    case "restocked":
      return `O descarte foi embaralhado e virou o monte de compra (${cardCount(event.count)})`
    case "timedOut":
      return `O tempo de ${nameOf(event.playerId)} acabou`
    case "playerLeft":
      return `${nameOf(event.playerId)} saiu da partida e ${cardCount(event.returnedCount)} ${event.returnedCount === 1 ? "voltou" : "voltaram"} ao monte`
    case "won":
      return `${nameOf(event.playerId)} venceu a partida`
  }
}

export const describeTrincaHistory = (game: TrincaGame, limit: number): readonly string[] => {
  const nameOf: Names = (id) => game.nicknames[id] ?? "Jogador"
  return game.events
    .slice(-limit)
    .map((event) => describeTrincaEvent(game, event, nameOf))
    .reverse()
}

export const describeTrincaSuggestion = ({ action, advice, ranks }: TrincaSuggestion): string => {
  const labels = ranks.map(setLabel)
  const card = action.type === "discard" ? cardName(action.card) : ""
  switch (advice) {
    case "meldOne":
      return `Baixe a trinca ${labels[0]}.`
    case "meldTwo":
      return `Baixe as duas trincas, ${listNames(labels)}, e compre 1 carta.`
    case "meldLast":
      return `Baixe a trinca ${labels[0]} e vença a partida!`
    case "draw":
      return "Compre uma carta do monte."
    case "discardDead":
      return `Descarte ${card}: o valor do vira está morto.`
    case "discardKeepingSet":
      return `Descarte ${card} e guarde a trinca para baixar no começo da próxima vez.`
    case "discardLoose":
      return `Descarte ${card}: é a carta com menos chance de formar trinca.`
  }
}
