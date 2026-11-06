import type { TrucoErrorCode } from "../../../../domain/games/truco/errors.js"
import type { TrucoAdvice, TrucoSuggestion } from "../../../../domain/games/truco/hints.js"
import type {
  PlayerId,
  Stake,
  TeamIndex,
  TrucoEvent,
  TrucoGame,
} from "../../../../domain/games/truco/model.js"
import { cardName, listNames } from "../../card-names.js"

export const TRUCO_ERRORS: Readonly<Record<TrucoErrorCode, string>> = {
  INVALID_PLAYER_COUNT: "O Truco precisa de 2, 4 ou 6 jogadores.",
  INVALID_TEAMS: "Os times precisam ter o mesmo número de jogadores.",
  GAME_FINISHED: "A partida já terminou.",
  NOT_YOUR_TURN: "Não é a sua vez.",
  CARD_NOT_IN_HAND: "Essa carta não está na sua mão.",
  CARD_HIDDEN: "Na mão de ferro as cartas ficam viradas: escolha uma delas.",
  NOT_BLIND_HAND: "Só na mão de ferro se joga carta virada.",
  REQUEST_PENDING: "Espere a resposta ao pedido de aumento.",
  ELEVEN_DECISION_PENDING: "Espere o time com 11 pontos decidir se joga a mão.",
  NOTHING_TO_ANSWER: "Não há pedido para responder.",
  RAISE_NOT_ALLOWED: "Nesta mão ninguém pode pedir aumento.",
  NOT_YOUR_RAISE: "Seu time fez o último pedido: agora só o outro time pode aumentar.",
  MAX_STAKE: "A mão já vale 12 pontos.",
  COVER_NOT_ALLOWED: "Na primeira rodada não dá para esconder a carta.",
  NOTHING_TO_SHOW: "Não há cartas para mostrar agora.",
}

const STAKE_NAMES: Readonly<Record<Stake, string>> = {
  1: "um",
  3: "truco",
  6: "seis",
  9: "nove",
  12: "doze",
}

export const stakeName = (stake: Stake): string => STAKE_NAMES[stake]

const points = (count: number): string => (count === 1 ? "1 ponto" : `${count} pontos`)

export interface TrucoNames {
  readonly player: (id: PlayerId) => string
  readonly team: (team: TeamIndex) => string
  readonly isPair: boolean
}

export const namesOf = (game: TrucoGame): TrucoNames => ({
  player: (id) => game.nicknames[id] ?? "Jogador",
  team: (team) =>
    listNames(
      game.players
        .filter((player) => player.team === team)
        .map((player) => game.nicknames[player.id] ?? "Jogador")
    ),
  isPair: game.players.length > 2,
})

const agree = (names: TrucoNames, one: string, many: string): string => (names.isPair ? many : one)

const MODE_NOTES = { normal: "", eleven: " (mão de onze)", iron: " (mão de ferro)" } as const

type EventSentences = {
  readonly [Type in TrucoEvent["type"]]: (
    event: Extract<TrucoEvent, { readonly type: Type }>,
    names: TrucoNames
  ) => string
}

const EVENT_SENTENCES: EventSentences = {
  handDealt: (event) =>
    `Mão ${event.number}${MODE_NOTES[event.mode]}: a vira é ${cardName(event.vira)}`,
  played: (event, names) => `${names.player(event.playerId)} jogou ${cardName(event.card)}`,
  covered: (event, names) => `${names.player(event.playerId)} jogou uma carta escondida`,
  showed: (event, names) =>
    `${names.player(event.playerId)} mostrou as cartas: ${listNames(event.cards.map(cardName))}`,
  roundWon: (event, names) =>
    event.playerId === null
      ? `A ${event.round}ª rodada empatou`
      : `${names.player(event.playerId)} venceu a ${event.round}ª rodada`,
  raised: (event, names) => `${names.player(event.playerId)} pediu ${stakeName(event.stake)}`,
  accepted: (event, names) =>
    `${names.player(event.playerId)} aceitou: a mão vale ${points(event.stake)}`,
  ran: (event, names) => `${names.player(event.playerId)} correu`,
  elevenAccepted: (event, names) => `${names.player(event.playerId)} decidiu jogar a mão de onze`,
  handWon: (event, names) =>
    event.team === null
      ? "Ninguém marcou ponto nesta mão"
      : `${names.team(event.team)} ${agree(names, "marcou", "marcaram")} ${points(event.points)}`,
  timedOut: (event, names) => `O tempo de ${names.player(event.playerId)} acabou`,
  playerLeft: (event, names) => `${names.player(event.playerId)} saiu da partida`,
  matchWon: (event, names) =>
    `${names.team(event.team)} ${agree(names, "venceu", "venceram")} a partida`,
}

export const describeTrucoEvent = (event: TrucoEvent, names: TrucoNames): string =>
  (EVENT_SENTENCES[event.type] as (event: TrucoEvent, names: TrucoNames) => string)(event, names)

export const describeTrucoHistory = (game: TrucoGame, limit: number): readonly string[] => {
  const names = namesOf(game)
  return game.events
    .slice(-limit)
    .map((event) => describeTrucoEvent(event, names))
    .reverse()
}

const ADVICE_SENTENCES: Readonly<Record<TrucoAdvice, (card: string, stake: string) => string>> = {
  leadStrongest: (card) => `Abra a rodada com ${card}, sua carta mais forte.`,
  beatCheapest: (card) => `Jogue ${card}: é a carta mais fraca que ganha a rodada.`,
  partnerWinning: (card) => `Seu time já está ganhando a rodada: guarde as fortes e jogue ${card}.`,
  cannotBeat: (card) => `Nenhuma carta sua ganha esta rodada: jogue ${card}, a mais fraca.`,
  blindPick: () => "Na mão de ferro ninguém vê as cartas: escolha qualquer uma.",
  raise: (_card, stake) => `Você tem cartas fortes: peça ${stake}.`,
  accept: () => "Aceite: sua mão tem chance de ganhar.",
  raiseBack: (_card, stake) => `Sua mão é forte: aumente para ${stake}.`,
  run: () => "Corra: sua mão está fraca para esse valor.",
  playEleven: () => "Jogue a mão de onze: o time tem cartas fortes.",
  runEleven: () => "Corra da mão de onze: com cartas fracas o time perde só 1 ponto.",
}

export const describeSuggestion = ({ action, advice, stake }: TrucoSuggestion): string =>
  ADVICE_SENTENCES[advice](
    action.type === "play" ? cardName(action.card) : "",
    stake === null ? "" : stakeName(stake)
  )
