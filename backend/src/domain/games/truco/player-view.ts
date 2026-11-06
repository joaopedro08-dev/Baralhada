import type { Card } from "../../cards/card.js"
import { canShow } from "./actions.js"
import type { TrucoRank } from "./cards.js"
import { actorOf, findPlayer, isFinished, nextStake, teamOf } from "./model.js"
import type {
  HandMode,
  HandSummary,
  PlayedCard,
  PlayerId,
  RaiseRequest,
  RoundResult,
  RoundSummary,
  Scores,
  Stake,
  TeamIndex,
  TrucoEndReason,
  TrucoEvent,
  TrucoGame,
} from "./model.js"

export interface TrucoPublicPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly team: TeamIndex
  readonly handSize: number
}

export interface VisiblePlay {
  readonly playerId: PlayerId
  readonly card: Card | null
  readonly covered: boolean
}

export interface ShownHand {
  readonly playerId: PlayerId
  readonly cards: readonly Card[] | null
  readonly shown: boolean
}

export interface HandSummaryView extends Omit<HandSummary, "table" | "runner"> {
  readonly table: readonly VisiblePlay[]
  readonly runner: ShownHand | null
}

export interface RoundSummaryView extends Omit<RoundSummary, "table"> {
  readonly table: readonly VisiblePlay[]
}

export interface PartnerHand {
  readonly playerId: PlayerId
  readonly cards: readonly Card[]
}

export interface TrucoMoves {
  readonly play: boolean
  readonly raiseTo: Stake | null
  readonly answer: boolean
  readonly decideEleven: boolean
  readonly cover: boolean
  readonly fold: boolean
}

export interface TrucoView {
  readonly viewerId: PlayerId
  readonly viewerTeam: TeamIndex | null
  readonly hand: readonly Card[]
  readonly handSize: number
  readonly blind: boolean
  readonly partnerHands: readonly PartnerHand[]
  readonly players: readonly TrucoPublicPlayer[]
  readonly scores: Scores
  readonly handNumber: number
  readonly mode: HandMode
  readonly vira: Card
  readonly manilha: TrucoRank
  readonly stake: Stake
  readonly table: readonly VisiblePlay[]
  readonly rounds: readonly RoundResult[]
  readonly currentPlayerId: PlayerId
  readonly actorId: PlayerId
  readonly request: RaiseRequest | null
  readonly elevenDeciderId: PlayerId | null
  readonly moves: TrucoMoves
  readonly lastHand: HandSummaryView | null
  readonly lastRound: RoundSummaryView | null
  readonly canShowHand: boolean
  readonly winnerTeam: TeamIndex | null
  readonly endReason: TrucoEndReason | null
  readonly turnNumber: number
  readonly events: readonly TrucoEvent[]
}

const NO_MOVES: TrucoMoves = {
  play: false,
  raiseTo: null,
  answer: false,
  decideEleven: false,
  cover: false,
  fold: false,
}

const raiseTarget = (game: TrucoGame, viewerTeam: TeamIndex): Stake | null => {
  const { hand } = game
  if (hand.mode !== "normal" || hand.elevenDeciderId !== null) return null
  if (hand.request) return nextStake(hand.request.stake)
  return hand.lastRaiserTeam === viewerTeam ? null : nextStake(hand.stake)
}

export const movesOf = (game: TrucoGame, viewerId: PlayerId): TrucoMoves => {
  const viewer = findPlayer(game, viewerId)
  if (!viewer || isFinished(game) || actorOf(game.hand) !== viewerId) return NO_MOVES
  const { hand } = game
  const deciding = hand.elevenDeciderId === viewerId
  const answering = hand.request?.responderId === viewerId
  const playing = !deciding && !answering
  return {
    play: playing,
    raiseTo: deciding ? null : raiseTarget(game, viewer.team),
    answer: answering,
    decideEleven: deciding,
    cover: playing && hand.mode !== "iron" && hand.rounds.length > 0,
    fold: playing,
  }
}

const visiblePlays = (table: readonly PlayedCard[], viewerId: PlayerId): readonly VisiblePlay[] =>
  table.map(({ playerId, card, covered }) => ({
    playerId,
    card: covered && playerId !== viewerId ? null : card,
    covered,
  }))

const summaryView = (summary: HandSummary | null, viewerId: PlayerId): HandSummaryView | null => {
  if (!summary) return null
  const { runner, table, ...rest } = summary
  return {
    ...rest,
    table: visiblePlays(table, viewerId),
    runner: runner && {
      playerId: runner.playerId,
      cards: runner.shown || runner.playerId === viewerId ? runner.cards : null,
      shown: runner.shown,
    },
  }
}

const roundView = (round: RoundSummary | null, viewerId: PlayerId): RoundSummaryView | null =>
  round && { ...round, table: visiblePlays(round.table, viewerId) }

const canShowHand = (game: TrucoGame, viewerId: PlayerId): boolean => {
  const runner = game.lastHand?.runner
  return (
    !isFinished(game) && runner !== undefined && runner !== null && canShow(game, runner, viewerId)
  )
}

const sharesElevenHand = (game: TrucoGame, viewerTeam: TeamIndex | null): boolean =>
  game.hand.mode === "eleven" &&
  viewerTeam !== null &&
  game.scores[viewerTeam] > game.scores[viewerTeam === 0 ? 1 : 0]

const partnerHandsOf = (game: TrucoGame, viewerId: PlayerId): readonly PartnerHand[] => {
  const viewerTeam = findPlayer(game, viewerId)?.team ?? null
  if (!sharesElevenHand(game, viewerTeam)) return []
  return game.players
    .filter((player) => player.team === viewerTeam && player.id !== viewerId)
    .map((player) => ({ playerId: player.id, cards: player.hand }))
}

export const toTrucoView = (game: TrucoGame, viewerId: PlayerId): TrucoView => {
  const viewer = findPlayer(game, viewerId)
  const blind = game.hand.mode === "iron" && !isFinished(game)
  const { hand } = game
  return {
    viewerId,
    viewerTeam: viewer ? teamOf(game, viewerId) : null,
    hand: blind ? [] : (viewer?.hand ?? []),
    handSize: viewer?.hand.length ?? 0,
    blind,
    partnerHands: partnerHandsOf(game, viewerId),
    players: game.players.map((player) => ({
      id: player.id,
      nickname: game.nicknames[player.id] ?? "",
      team: player.team,
      handSize: player.hand.length,
    })),
    scores: game.scores,
    handNumber: hand.number,
    mode: hand.mode,
    vira: hand.vira,
    manilha: hand.manilha,
    stake: hand.stake,
    table: visiblePlays(hand.table, viewerId),
    rounds: hand.rounds,
    currentPlayerId: hand.currentPlayerId,
    actorId: actorOf(hand),
    request: hand.request,
    elevenDeciderId: hand.elevenDeciderId,
    moves: movesOf(game, viewerId),
    lastHand: summaryView(game.lastHand, viewerId),
    lastRound: roundView(game.lastRound, viewerId),
    canShowHand: canShowHand(game, viewerId),
    winnerTeam: game.winnerTeam,
    endReason: game.endReason,
    turnNumber: game.step,
    events: game.events,
  }
}
