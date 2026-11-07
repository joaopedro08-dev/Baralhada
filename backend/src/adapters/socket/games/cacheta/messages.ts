import type { CachetaErrorCode } from "../../../../domain/games/cacheta/errors.js"
import type { CachetaSuggestion } from "../../../../domain/games/cacheta/hints.js"
import { wildRankFor } from "../../../../domain/games/cacheta/melds.js"
import type { CachetaEvent, CachetaGame, PlayerId } from "../../../../domain/games/cacheta/model.js"
import { cardCount, cardName, rankLabel } from "../../card-names.js"

export const CACHETA_ERRORS: Readonly<Record<CachetaErrorCode, string>> = {
  CACHETA_PLAYER_COUNT: "A Cacheta precisa de 2 a 4 jogadores.",
  GAME_FINISHED: "A partida já terminou.",
  NOT_YOUR_TURN: "Não é a sua vez.",
  ROUND_CLOSING: "A rodada está fechando: espere a próxima distribuição.",
  ALREADY_DREW: "Você já comprou neste turno.",
  EMPTY_DISCARD: "O descarte está vazio: compre do monte.",
  PICK_BEFORE_DISCARD: "Compre do monte ou pegue a carta do descarte antes de descartar.",
  PICK_BEFORE_KNOCK: "Para bater, compre uma carta antes: são 9 em jogos e a 10ª no descarte.",
  CARD_NOT_IN_HAND: "Essa carta não está na sua mão.",
  NOT_A_KNOCK:
    "Ainda não dá para bater: sem essa carta, as outras 9 precisam fechar em trincas e sequências.",
}

type Names = (id: PlayerId) => string

const knockText = (clean: boolean): string =>
  clean ? "bateu limpo: os outros perdem 2 pontos" : "bateu: os outros perdem 1 ponto"

const returnedLabel = (count: number): string =>
  `${cardCount(count)} ${count === 1 ? "voltou" : "voltaram"}`

export const describeCachetaEvent = (event: CachetaEvent, nameOf: Names): string => {
  switch (event.type) {
    case "dealt":
      return `Rodada ${event.round}: a vira é ${cardName(event.vira)} e ${rankLabel(wildRankFor(event.vira))} é o coringa`
    case "drew":
      return `${nameOf(event.playerId)} comprou do monte`
    case "tookDiscard":
      return `${nameOf(event.playerId)} pegou ${cardName(event.card)} do descarte`
    case "discarded":
      return `${nameOf(event.playerId)} descartou ${cardName(event.card)}`
    case "knocked":
      return `${nameOf(event.playerId)} ${knockText(event.clean)}`
    case "eliminated":
      return `${nameOf(event.playerId)} ficou sem pontos e foi eliminado`
    case "restocked":
      return `O descarte foi embaralhado e virou o monte de compra (${cardCount(event.count)})`
    case "timedOut":
      return `O tempo de ${nameOf(event.playerId)} acabou`
    case "playerLeft":
      return `${nameOf(event.playerId)} saiu da partida e ${returnedLabel(event.returnedCount)} ao monte`
    case "won":
      return `${nameOf(event.playerId)} venceu a partida`
  }
}

export const describeCachetaHistory = (game: CachetaGame, limit: number): readonly string[] => {
  const nameOf: Names = (id) => game.nicknames[id] ?? "Jogador"
  return game.events
    .slice(-limit)
    .map((event) => describeCachetaEvent(event, nameOf))
    .reverse()
}

export const describeCachetaSuggestion = ({ advice, card }: CachetaSuggestion): string => {
  const name = card ? cardName(card) : ""
  switch (advice) {
    case "knockClean":
      return `Bata limpo descartando ${name}: os outros perdem 2 pontos.`
    case "knock":
      return `Bata descartando ${name}: os outros perdem 1 ponto.`
    case "takeJoker":
      return `Pegue ${name} do descarte: é coringa.`
    case "takeForMeld":
      return `Pegue ${name} do descarte: ela fecha um jogo.`
    case "draw":
      return "Compre do monte: a carta do descarte não ajuda seus jogos."
    case "discard":
      return `Descarte ${name}: é a carta que menos ajuda seus jogos.`
  }
}
