import type { Card } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { pickOne } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { TrucoErrorCode } from "./errors.js"
import { closeHand, placeCard } from "./hand-flow.js"
import {
  actorOf,
  ELEVEN_HAND_STAKE,
  ELEVEN_RUN_POINTS,
  findPlayer,
  getPlayer,
  isFinished,
  nextStake,
  otherTeam,
  seatAfter,
  teamOf,
  withEvents,
} from "./model.js"
import type { PlayerId, RunnerHand, Stake, TrucoGame, TrucoPlayer } from "./model.js"

export type TrucoAction =
  | { readonly type: "play"; readonly card: Card }
  | { readonly type: "cover"; readonly card: Card }
  | { readonly type: "playBlind"; readonly slot: number }
  | { readonly type: "raise" }
  | { readonly type: "accept" }
  | { readonly type: "run" }
  | { readonly type: "show" }

export type TrucoActionKind = TrucoAction["type"]

type Outcome = Result<TrucoGame, TrucoErrorCode>

const raiseRefusal = (game: TrucoGame, playerId: PlayerId): TrucoErrorCode | null => {
  const { hand } = game
  if (hand.mode !== "normal") return "RAISE_NOT_ALLOWED"
  const base = hand.request?.stake ?? hand.stake
  if (nextStake(base) === null) return "MAX_STAKE"
  if (hand.request === null && hand.lastRaiserTeam === teamOf(game, playerId)) {
    return "NOT_YOUR_RAISE"
  }
  return null
}

const raise = (game: TrucoGame, playerId: PlayerId): Outcome => {
  const refusal = raiseRefusal(game, playerId)
  if (refusal) return err(refusal)
  const { hand } = game
  const stake = hand.request?.stake ?? hand.stake
  const requested = nextStake(stake) as Stake
  return ok(
    withEvents(
      {
        ...game,
        hand: {
          ...hand,
          stake,
          lastRaiserTeam: hand.request
            ? teamOf(game, hand.request.requesterId)
            : hand.lastRaiserTeam,
          request: {
            requesterId: playerId,
            responderId: seatAfter(game.players, playerId),
            stake: requested,
          },
        },
      },
      { type: "raised", playerId, stake: requested }
    )
  )
}

const accept = (game: TrucoGame, playerId: PlayerId): Outcome => {
  const { hand } = game
  if (hand.elevenDeciderId !== null) {
    return ok(
      withEvents(
        { ...game, hand: { ...hand, stake: ELEVEN_HAND_STAKE, elevenDeciderId: null } },
        { type: "elevenAccepted", playerId }
      )
    )
  }
  if (!hand.request) return err("NOTHING_TO_ANSWER")
  const { stake, requesterId } = hand.request
  return ok(
    withEvents(
      {
        ...game,
        hand: { ...hand, stake, lastRaiserTeam: teamOf(game, requesterId), request: null },
      },
      { type: "accepted", playerId, stake }
    )
  )
}

const run = (game: TrucoGame, player: TrucoPlayer, random: RandomSource): Outcome => {
  const { hand } = game
  const ran = withEvents(game, { type: "ran", playerId: player.id })
  const opponents = otherTeam(player.team)
  const runner = { playerId: player.id, cards: player.hand, shown: false, untilStep: game.step + 1 }
  if (hand.elevenDeciderId !== null) {
    return ok(closeHand(ran, opponents, ELEVEN_RUN_POINTS, "elevenRan", random, runner))
  }
  return ok(closeHand(ran, opponents, hand.stake, "ran", random, runner))
}

const coverRefusal = (game: TrucoGame): TrucoErrorCode | null => {
  if (game.hand.mode === "iron") return "NOT_BLIND_HAND"
  return game.hand.rounds.length === 0 ? "COVER_NOT_ALLOWED" : null
}

export const canShow = (game: TrucoGame, runner: RunnerHand, playerId: PlayerId): boolean =>
  runner.playerId === playerId &&
  !runner.shown &&
  runner.cards.length > 0 &&
  game.step === runner.untilStep

const show = (game: TrucoGame, playerId: PlayerId): Outcome => {
  const summary = game.lastHand
  const runner = summary?.runner
  if (!summary || !runner || !canShow(game, runner, playerId)) return err("NOTHING_TO_SHOW")
  return ok(
    withEvents(
      { ...game, lastHand: { ...summary, runner: { ...runner, shown: true } } },
      { type: "showed", playerId, cards: runner.cards }
    )
  )
}

const pendingRefusal = (game: TrucoGame): TrucoErrorCode | null => {
  if (game.hand.elevenDeciderId !== null) return "ELEVEN_DECISION_PENDING"
  return game.hand.request ? "REQUEST_PENDING" : null
}

const play = (
  game: TrucoGame,
  player: TrucoPlayer,
  card: Card,
  random: RandomSource,
  covered = false
): Outcome => {
  const refusal = pendingRefusal(game) ?? (covered ? coverRefusal(game) : null)
  if (refusal) return err(refusal)
  if (game.hand.mode === "iron") return err("CARD_HIDDEN")
  if (!player.hand.includes(card)) return err("CARD_NOT_IN_HAND")
  return ok(placeCard(game, player.id, card, random, covered))
}

const playBlind = (
  game: TrucoGame,
  player: TrucoPlayer,
  slot: number,
  random: RandomSource
): Outcome => {
  const refusal = pendingRefusal(game)
  if (refusal) return err(refusal)
  if (game.hand.mode !== "iron") return err("NOT_BLIND_HAND")
  const card = player.hand[slot]
  if (!Number.isInteger(slot) || card === undefined) return err("CARD_NOT_IN_HAND")
  return ok(placeCard(game, player.id, card, random))
}

const execute = (
  game: TrucoGame,
  player: TrucoPlayer,
  action: TrucoAction,
  random: RandomSource
): Outcome => {
  switch (action.type) {
    case "play":
      return play(game, player, action.card, random)
    case "cover":
      return play(game, player, action.card, random, true)
    case "playBlind":
      return playBlind(game, player, action.slot, random)
    case "raise":
      return game.hand.elevenDeciderId === null
        ? raise(game, player.id)
        : err("ELEVEN_DECISION_PENDING")
    case "accept":
      return accept(game, player.id)
    case "run":
      return run(game, player, random)
    case "show":
      return show(game, player.id)
  }
}

const nextStep = (game: TrucoGame, previous: TrucoGame): TrucoGame => ({
  ...game,
  step: previous.step + 1,
})

export const playTruco = (
  game: TrucoGame,
  playerId: PlayerId,
  action: TrucoAction,
  random: RandomSource
): Outcome => {
  if (isFinished(game)) return err("GAME_FINISHED")
  if (action.type === "show") return show(game, playerId)
  if (actorOf(game.hand) !== playerId) return err("NOT_YOUR_TURN")
  const played = execute(game, getPlayer(game, playerId), action, random)
  return played.ok ? ok(nextStep(played.value, game)) : played
}

const timeoutAction = (game: TrucoGame, player: TrucoPlayer, random: RandomSource): TrucoAction => {
  if (game.hand.elevenDeciderId !== null || game.hand.request) return { type: "run" }
  if (game.hand.mode === "iron")
    return { type: "playBlind", slot: random.nextInt(player.hand.length) }
  return { type: "play", card: pickOne(player.hand, random) }
}

export const expireTruco = (game: TrucoGame, random: RandomSource): TrucoGame => {
  if (isFinished(game)) return game
  const player = getPlayer(game, actorOf(game.hand))
  const timedOut = withEvents(game, { type: "timedOut", playerId: player.id })
  const played = execute(timedOut, player, timeoutAction(game, player, random), random)
  return nextStep(played.ok ? played.value : timedOut, game)
}

export const playsDuringPause = (action: TrucoAction): boolean => action.type === "show"

export const removeTrucoPlayer = (game: TrucoGame, playerId: PlayerId): TrucoGame => {
  const leaving = findPlayer(game, playerId)
  if (isFinished(game) || !leaving) return game
  const winnerTeam = otherTeam(leaving.team)
  return withEvents(
    { ...game, winnerTeam, endReason: "abandoned", step: game.step + 1 },
    { type: "playerLeft", playerId },
    { type: "matchWon", team: winnerTeam }
  )
}
