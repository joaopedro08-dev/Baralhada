import { rankOf } from "../../cards/card.js"
import type { Card } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { BlackjackErrorCode } from "./errors.js"
import {
  activeSeats,
  BET_STEP,
  findSeat,
  getSeat,
  isFinished,
  MIN_BET,
  replaceHand,
  replaceSeat,
  withEvents,
} from "./model.js"
import type { BlackjackGame, Hand, PlayerId, Seat } from "./model.js"
import {
  beginRound,
  dealerStep,
  dealStep,
  drawCard,
  finish,
  moveOn,
  settle,
  startDeal,
} from "./round.js"
import { cardValue, isBust, isNatural, scoreOf, TWENTY_ONE } from "./scoring.js"

export type BlackjackAction =
  | { readonly type: "bet"; readonly amount: number }
  | { readonly type: "insurance"; readonly accepted: boolean }
  | { readonly type: "hit" }
  | { readonly type: "stand" }
  | { readonly type: "double" }
  | { readonly type: "split" }

type Outcome = Result<BlackjackGame, BlackjackErrorCode>

export const isValidBet = (amount: number, chips: number): boolean =>
  amount === chips || (amount >= MIN_BET && amount % BET_STEP === 0 && amount <= chips)

export const canDouble = (seat: Seat, hand: Hand): boolean =>
  hand.cards.length === 2 && !hand.fromSplit && seat.chips >= hand.bet

export const canSplit = (seat: Seat, hand: Hand): boolean => {
  const [first, second] = hand.cards
  return (
    seat.hands.length === 1 &&
    hand.cards.length === 2 &&
    first !== undefined &&
    second !== undefined &&
    cardValue(first) === cardValue(second) &&
    seat.chips >= hand.bet
  )
}

export const insuranceBetOf = (seat: Seat): number => Math.floor((seat.bet ?? 0) / 2)

const everyoneBet = (game: BlackjackGame): boolean =>
  activeSeats(game).every((seat) => seat.bet !== null)

const dealWhenReady = (game: BlackjackGame, random: RandomSource): BlackjackGame =>
  everyoneBet(game) && activeSeats(game).length > 0 ? startDeal(game, random) : game

const placeBet = (
  game: BlackjackGame,
  seat: Seat,
  amount: number,
  random: RandomSource
): Outcome => {
  if (seat.status !== "playing") return err("OUT_OF_CHIPS")
  if (seat.bet !== null) return err("ALREADY_BET")
  if (!isValidBet(amount, seat.chips)) return err("INVALID_BET")
  const placed = withEvents(
    replaceSeat(game, { ...seat, bet: amount, chips: seat.chips - amount }),
    { type: "bet", playerId: seat.id, amount }
  )
  return ok(dealWhenReady(placed, random))
}

const allInsuranceChosen = (game: BlackjackGame): boolean =>
  activeSeats(game).every((seat) => seat.insurance !== null)

const chooseInsurance = (
  game: BlackjackGame,
  seat: Seat,
  accepted: boolean
): Outcome => {
  if (game.phase !== "insurance") return err("INSURANCE_NOT_AVAILABLE")
  if (seat.insurance !== null) return err("ALREADY_INSURED")
  const cost = insuranceBetOf(seat)
  if (accepted && seat.chips < cost) return err("CANNOT_INSURE")
  const chosen = {
    ...seat,
    insurance: accepted,
    chips: seat.chips - (accepted ? cost : 0),
  }
  const selected = withEvents(replaceSeat(game, chosen), {
    type: "insurance",
    playerId: seat.id,
    accepted,
    amount: accepted ? cost : 0,
  })
  if (!allInsuranceChosen(selected)) {
    const next = activeSeats(selected).find((current) => current.insurance === null)
    return ok({
      ...selected,
      turn: {
        number: selected.turn.number + 1,
        playerId: next?.id ?? null,
        handIndex: 0,
      },
    })
  }
  if (isNatural(selected.dealer.cards)) {
    return ok(
      settle(withEvents({ ...selected, dealer: { ...selected.dealer, revealed: true } }, {
        type: "dealerRevealed",
        card: selected.dealer.cards[1] as Card,
        total: scoreOf(selected.dealer.cards).total,
      }))
    )
  }
  return ok(moveOn(selected))
}

const closeIfFinal = (game: BlackjackGame, seat: Seat, index: number, hand: Hand) => {
  const total = scoreOf(hand.cards).total
  if (isBust(hand.cards)) {
    return withEvents(replaceSeat(game, replaceHand(seat, index, { ...hand, done: true })), {
      type: "busted",
      playerId: seat.id,
      total,
    })
  }
  const closed = hand.done || total === TWENTY_ONE
  return replaceSeat(game, replaceHand(seat, index, { ...hand, done: closed }))
}

const hit = (game: BlackjackGame, seat: Seat, index: number, random: RandomSource) => {
  const hand = seat.hands[index] as Hand
  const drawn = drawCard(game, random)
  const grown: Hand = { ...hand, cards: [...hand.cards, drawn.card] }
  const logged = withEvents(drawn.game, {
    type: "hit",
    playerId: seat.id,
    card: drawn.card,
    total: scoreOf(grown.cards).total,
  })
  return moveOn(closeIfFinal(logged, getSeat(logged, seat.id), index, grown))
}

const stand = (game: BlackjackGame, seat: Seat, index: number) => {
  const hand = seat.hands[index] as Hand
  const stood = withEvents(replaceSeat(game, replaceHand(seat, index, { ...hand, done: true })), {
    type: "stood",
    playerId: seat.id,
    total: scoreOf(hand.cards).total,
  })
  return moveOn(stood)
}

const double = (game: BlackjackGame, seat: Seat, index: number, random: RandomSource): Outcome => {
  const hand = seat.hands[index] as Hand
  if (!canDouble(seat, hand)) return err("CANNOT_DOUBLE")
  const drawn = drawCard(game, random)
  const doubled: Hand = {
    cards: [...hand.cards, drawn.card],
    bet: hand.bet * 2,
    doubled: true,
    fromSplit: false,
    done: true,
  }
  const paid: Seat = { ...seat, chips: seat.chips - hand.bet }
  const logged = withEvents(drawn.game, {
    type: "doubled",
    playerId: seat.id,
    from: scoreOf(hand.cards).total,
    card: drawn.card,
    total: scoreOf(doubled.cards).total,
  })
  return ok(moveOn(closeIfFinal(logged, paid, index, doubled)))
}

const split = (game: BlackjackGame, seat: Seat, index: number, random: RandomSource): Outcome => {
  const hand = seat.hands[index] as Hand
  if (!canSplit(seat, hand)) return err("CANNOT_SPLIT")
  const [first, second] = hand.cards as [Hand["cards"][number], Hand["cards"][number]]
  const aces = rankOf(first) === "A"
  const firstDraw = drawCard(game, random)
  const secondDraw = drawCard(firstDraw.game, random)
  const makeHand = (cards: Hand["cards"]): Hand => ({
    cards,
    bet: hand.bet,
    doubled: false,
    fromSplit: true,
    done: aces || scoreOf(cards).total === TWENTY_ONE,
  })
  const splitSeat: Seat = {
    ...seat,
    chips: seat.chips - hand.bet,
    hands: [makeHand([first, firstDraw.card]), makeHand([second, secondDraw.card])],
  }
  const logged = withEvents(replaceSeat(secondDraw.game, splitSeat), {
    type: "split",
    playerId: seat.id,
    cards: [first, second],
  })
  return ok(moveOn(logged))
}

const refusalOf = (
  game: BlackjackGame,
  playerId: PlayerId,
  action: BlackjackAction
) => {
  if (isFinished(game)) return "GAME_FINISHED"
  if (action.type === "bet") return game.phase === "betting" ? null : "NOT_BETTING"
  if (action.type === "insurance") {
    return game.phase === "insurance" && game.turn.playerId === playerId
      ? null
      : "INSURANCE_NOT_AVAILABLE"
  }
  if (game.phase === "dealing") return "TABLE_DEALING"
  if (game.phase === "dealer" || game.phase === "settled") return "DEALER_PLAYING"
  return game.phase === "playing" && game.turn.playerId === playerId ? null : "NOT_YOUR_TURN"
}

export const playBlackjack = (
  game: BlackjackGame,
  playerId: PlayerId,
  action: BlackjackAction,
  random: RandomSource
): Outcome => {
  const refusal = refusalOf(game, playerId, action)
  if (refusal) return err(refusal)
  const seat = findSeat(game, playerId)
  if (!seat) return err("NOT_YOUR_TURN")
  const index = game.turn.handIndex
  switch (action.type) {
    case "bet":
      return placeBet(game, seat, action.amount, random)
    case "insurance":
      return chooseInsurance(game, seat, action.accepted)
    case "hit":
      return ok(hit(game, seat, index, random))
    case "stand":
      return ok(stand(game, seat, index))
    case "double":
      return double(game, seat, index, random)
    case "split":
      return split(game, seat, index, random)
  }
}

const autoBet = (game: BlackjackGame): BlackjackGame =>
  activeSeats(game)
    .filter((seat) => seat.bet === null)
    .reduce((current, seat) => {
      const amount = Math.min(MIN_BET, seat.chips)
      return withEvents(
        replaceSeat(current, { ...seat, bet: amount, chips: seat.chips - amount }),
        { type: "timedOut", playerId: seat.id },
        { type: "bet", playerId: seat.id, amount }
      )
    }, game)

export const expireBlackjack = (game: BlackjackGame, random: RandomSource): BlackjackGame => {
  if (isFinished(game)) return game
  switch (game.phase) {
    case "betting":
      return dealWhenReady(autoBet(game), random)
    case "playing": {
      const playerId = game.turn.playerId as PlayerId
      const timedOut = withEvents(game, { type: "timedOut", playerId })
      return stand(timedOut, getSeat(timedOut, playerId), game.turn.handIndex)
    }
    case "insurance": {
      const playerId = game.turn.playerId as PlayerId
      return unwrapInsurance(playBlackjack(game, playerId, { type: "insurance", accepted: false }, random))
    }
    case "dealing":
      return dealStep(game, random)
    case "dealer":
      return dealerStep(game, random)
    case "settled":
      return beginRound(game, game.round + 1)
  }

  function unwrapInsurance(result: Outcome): BlackjackGame {
    if (!result.ok) throw new Error(result.error)
    return result.value
  }
}

const stakeOf = (seat: Seat): number =>
  seat.hands.length > 0 ? seat.hands.reduce((total, hand) => total + hand.bet, 0) : (seat.bet ?? 0)

export const removeBlackjackPlayer = (
  game: BlackjackGame,
  playerId: PlayerId,
  random: RandomSource
): BlackjackGame => {
  const leaving = findSeat(game, playerId)
  if (isFinished(game) || !leaving) return game
  const reduced = withEvents(
    { ...game, players: game.players.filter((seat) => seat.id !== playerId) },
    { type: "playerLeft", playerId, bet: stakeOf(leaving) }
  )
  if (reduced.players.length === 0) return finish(reduced, "abandoned")
  if (reduced.phase === "betting") {
    return activeSeats(reduced).length === 0
      ? finish(reduced, "broke")
      : dealWhenReady(reduced, random)
  }
  if (reduced.phase === "playing" && game.turn.playerId === playerId) return moveOn(reduced)
  return reduced
}
