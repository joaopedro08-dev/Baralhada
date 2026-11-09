import { createFullDeck } from "../../cards/card.js"
import { rankOf } from "../../cards/card.js"
import type { Card } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { shuffle } from "../../shared/random.js"
import { ROUNDS, withEvents } from "./model.js"
import type {
  BlackjackEndReason,
  BlackjackGame,
  Hand,
  HandOutcome,
  HandResult,
  PlayerId,
  Seat,
} from "./model.js"
import { dealerKeepsDrawing, isBlackjackHand, isBust, isNatural, scoreOf } from "./scoring.js"

const BLACKJACK_PAYOUT = 1.5

const cardsOnTable = (game: BlackjackGame): readonly Card[] => [
  ...game.players.flatMap((seat) => seat.hands.flatMap((hand) => hand.cards)),
  ...game.dealer.cards,
]

const freshDeck = (game: BlackjackGame, random: RandomSource): readonly Card[] => {
  const onTable = new Set(cardsOnTable(game))
  const unseen = createFullDeck().filter((card) => !onTable.has(card))
  return shuffle(unseen.length > 0 ? unseen : createFullDeck(), random)
}

export const drawCard = (
  game: BlackjackGame,
  random: RandomSource
): { readonly game: BlackjackGame; readonly card: Card } => {
  const stocked =
    game.deck.length > 0
      ? game
      : withEvents({ ...game, deck: freshDeck(game, random) }, { type: "restocked" })
  const [card, ...deck] = stocked.deck
  if (!card) throw new Error("O baralho não pode ficar vazio")
  return { game: { ...stocked, deck }, card }
}

const nextTurnNumber = (game: BlackjackGame): number => game.turn.number + 1

export const beginRound = (game: BlackjackGame, round: number): BlackjackGame => {
  const players = game.players.map((seat): Seat => ({
    ...seat,
    bet: null,
    insurance: null,
    hands: [],
    status: seat.chips > 0 ? "playing" : "broke",
  }))
  const broke = players.filter(
    (seat) =>
      seat.status === "broke" &&
      game.players.find((before) => before.id === seat.id)?.status === "playing"
  )
  return withEvents(
    {
      ...game,
      players,
      round,
      phase: "betting",
      dealer: { cards: [], revealed: false },
      turn: { number: nextTurnNumber(game), playerId: null, handIndex: 0 },
    },
    ...broke.map((seat) => ({ type: "broke" as const, playerId: seat.id })),
    { type: "roundStarted", round }
  )
}

const pendingHand = (
  game: BlackjackGame
): { readonly playerId: PlayerId; readonly handIndex: number } | null => {
  for (const seat of game.players) {
    if (seat.status !== "playing") continue
    const handIndex = seat.hands.findIndex((hand) => !hand.done)
    if (handIndex >= 0) return { playerId: seat.id, handIndex }
  }
  return null
}

export const moveOn = (game: BlackjackGame): BlackjackGame => {
  const next = pendingHand(game)
  if (next) return { ...game, phase: "playing", turn: { number: nextTurnNumber(game), ...next } }
  return {
    ...game,
    phase: "dealer",
    turn: { number: nextTurnNumber(game), playerId: null, handIndex: 0 },
  }
}

const beginInsurance = (game: BlackjackGame): BlackjackGame => {
  const prepared = {
    ...game,
    phase: "insurance" as const,
    players: game.players.map((seat) => {
      const cost = Math.floor((seat.bet ?? 0) / 2)
      return seat.status === "playing" && seat.chips < cost
        ? { ...seat, insurance: false }
        : seat
    }),
  }
  const next = prepared.players.find(
    (seat) => seat.status === "playing" && seat.insurance === null
  )
  if (next) {
    return {
      ...prepared,
      turn: {
        number: nextTurnNumber(game),
        playerId: next.id,
        handIndex: 0,
      },
    }
  }
  if (!isNatural(prepared.dealer.cards)) return moveOn(prepared)
  return settle(
    withEvents({ ...prepared, dealer: { ...prepared.dealer, revealed: true } }, {
      type: "dealerRevealed",
      card: prepared.dealer.cards[1] as Card,
      total: scoreOf(prepared.dealer.cards).total,
    })
  )
}

const outcomeOf = (hand: Hand, dealerCards: readonly Card[]): HandOutcome => {
  if (isBust(hand.cards)) return "bust"
  const dealerNatural = isNatural(dealerCards)
  if (isBlackjackHand(hand)) return dealerNatural ? "push" : "blackjack"
  if (dealerNatural) return "lose"
  const dealer = scoreOf(dealerCards).total
  if (isBust(dealerCards)) return "win"
  const mine = scoreOf(hand.cards).total
  if (mine === dealer) return "push"
  return mine > dealer ? "win" : "lose"
}

const RETURNS: Readonly<Record<HandOutcome, (bet: number) => number>> = {
  blackjack: (bet) => bet + Math.floor(bet * BLACKJACK_PAYOUT),
  win: (bet) => bet * 2,
  push: (bet) => bet,
  lose: () => 0,
  bust: () => 0,
}

const winnersOf = (players: readonly Seat[]): readonly PlayerId[] => {
  const best = Math.max(0, ...players.map((seat) => seat.chips))
  return best === 0 ? [] : players.filter((seat) => seat.chips === best).map((seat) => seat.id)
}

export const finish = (game: BlackjackGame, reason: BlackjackEndReason): BlackjackGame => {
  const winnerIds =
    reason === "abandoned" && game.players.length === 0 ? [] : winnersOf(game.players)
  return withEvents({ ...game, endReason: reason, winnerIds }, { type: "finished", winnerIds })
}

export const settle = (game: BlackjackGame): BlackjackGame => {
  const results: HandResult[] = []
  const players = game.players.map((seat): Seat => {
    const returns = seat.hands.map((hand, handIndex) => {
      const outcome = outcomeOf(hand, game.dealer.cards)
      const insuranceBet = seat.insurance === true ? Math.floor(hand.bet / 2) : 0
      const insuranceNet = isNatural(game.dealer.cards) ? insuranceBet * 2 : -insuranceBet
      const paid = RETURNS[outcome](hand.bet)
      results.push({
        playerId: seat.id,
        handIndex,
        outcome,
        bet: hand.bet,
        net: paid - hand.bet,
        fromSplit: hand.fromSplit,
        insuranceBet,
        insuranceNet,
      })
      return paid + (isNatural(game.dealer.cards) ? insuranceBet * 3 : 0)
    })
    return { ...seat, chips: seat.chips + returns.reduce((total, paid) => total + paid, 0) }
  })
  const settled = withEvents(
    {
      ...game,
      players,
      phase: "settled",
      dealer: { ...game.dealer, revealed: true },
      turn: { number: nextTurnNumber(game), playerId: null, handIndex: 0 },
      lastRound: {
        round: game.round,
        dealerTotal: scoreOf(game.dealer.cards).total,
        dealerBlackjack: isNatural(game.dealer.cards),
        dealerBust: isBust(game.dealer.cards),
        hands: results,
      },
    },
    ...results.map((result) => ({ type: "settled" as const, result }))
  )
  if (players.every((seat) => seat.chips === 0)) return finish(settled, "broke")
  return game.round >= ROUNDS ? finish(settled, "rounds") : settled
}

export const startDeal = (game: BlackjackGame, random: RandomSource): BlackjackGame => ({
  ...game,
  phase: "dealing",
  deck: shuffle(createFullDeck(), random),
  dealer: { cards: [], revealed: false },
  players: game.players.map((seat): Seat => {
    if (seat.status !== "playing") return seat
    return {
      ...seat,
      hands: [{ cards: [], bet: seat.bet ?? 0, doubled: false, fromSplit: false, done: false }],
    }
  }),
  turn: { number: nextTurnNumber(game), playerId: null, handIndex: 0 },
})

const DEALER_SLOT = null

const dealOrder = (game: BlackjackGame): readonly (PlayerId | null)[] => {
  const seated = game.players.filter((seat) => seat.status === "playing").map((seat) => seat.id)
  return [...seated, DEALER_SLOT, ...seated, DEALER_SLOT]
}

const cardsDealt = (game: BlackjackGame): number =>
  game.players.reduce(
    (total, seat) => total + seat.hands.reduce((sum, hand) => sum + hand.cards.length, 0),
    game.dealer.cards.length
  )

const finishDeal = (game: BlackjackGame): BlackjackGame => {
  const dealt = withEvents(
    {
      ...game,
      players: game.players.map((seat) => ({
        ...seat,
        hands: seat.hands.map((hand) => ({ ...hand, done: isNatural(hand.cards) })),
      })),
    },
    { type: "dealt", round: game.round }
  )
  if (dealt.dealer.cards[0] && rankOf(dealt.dealer.cards[0]) === "A") {
    return beginInsurance(dealt)
  }
  if (!isNatural(dealt.dealer.cards)) return moveOn(dealt)
  return settle(
    withEvents(
      { ...dealt, dealer: { ...dealt.dealer, revealed: true } },
      {
        type: "dealerRevealed",
        card: dealt.dealer.cards[1] as Card,
        total: scoreOf(dealt.dealer.cards).total,
      }
    )
  )
}

const giveCard = (game: BlackjackGame, recipient: PlayerId | null, card: Card): BlackjackGame => {
  if (recipient === DEALER_SLOT) {
    return { ...game, dealer: { ...game.dealer, cards: [...game.dealer.cards, card] } }
  }
  return {
    ...game,
    players: game.players.map((seat) =>
      seat.id === recipient
        ? {
            ...seat,
            hands: seat.hands.map((hand, index) =>
              index === 0 ? { ...hand, cards: [...hand.cards, card] } : hand
            ),
          }
        : seat
    ),
  }
}

export const dealStep = (game: BlackjackGame, random: RandomSource): BlackjackGame => {
  const order = dealOrder(game)
  const position = cardsDealt(game)
  if (position >= order.length) return finishDeal(game)
  const drawn = drawCard(game, random)
  const given = {
    ...giveCard(drawn.game, order[position] ?? DEALER_SLOT, drawn.card),
    turn: { ...game.turn, number: nextTurnNumber(game) },
  }
  return position + 1 >= order.length ? finishDeal(given) : given
}

const hasContenders = (game: BlackjackGame): boolean =>
  game.players.some((seat) =>
    seat.hands.some((hand) => !isBust(hand.cards) && !isBlackjackHand(hand))
  )

export const dealerStep = (game: BlackjackGame, random: RandomSource): BlackjackGame => {
  const { dealer } = game
  if (!dealer.revealed) {
    return withEvents(
      {
        ...game,
        dealer: { ...dealer, revealed: true },
        turn: { ...game.turn, number: nextTurnNumber(game) },
      },
      {
        type: "dealerRevealed",
        card: dealer.cards[1] as Card,
        total: scoreOf(dealer.cards).total,
      }
    )
  }
  if (!hasContenders(game) || !dealerKeepsDrawing(dealer.cards)) return settle(game)
  const drawn = drawCard(game, random)
  const cards = [...dealer.cards, drawn.card]
  return withEvents(
    {
      ...drawn.game,
      dealer: { ...dealer, cards },
      turn: { ...game.turn, number: nextTurnNumber(game) },
    },
    { type: "dealerDrew", card: drawn.card, total: scoreOf(cards).total }
  )
}
