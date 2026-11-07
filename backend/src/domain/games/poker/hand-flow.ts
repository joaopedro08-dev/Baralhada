import { createFullDeck } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { shuffle } from "../../shared/random.js"
import { nextActorAfter } from "./betting.js"
import { bestHand, compareHands } from "./hand-ranking.js"
import type { RankedHand } from "./hand-ranking.js"
import {
  blindsFor,
  BOARD_SIZE,
  getPlayer,
  HOLE_CARDS,
  isContender,
  isInGame,
  seatsAfter,
  STREETS,
  withEvents,
} from "./model.js"
import type {
  HandSummary,
  PlayerId,
  PokerEvent,
  PokerGame,
  PokerPlayer,
  Pot,
  PotResult,
  ShownHand,
} from "./model.js"
import { buildPots, splitPot } from "./pots.js"
import type { Contribution } from "./pots.js"

type Outcome = Pick<HandSummary, "showdown" | "shown" | "pots">

export const contendersOf = (game: PokerGame): readonly PokerPlayer[] =>
  game.players.filter(isContender)

export const contributionsOf = (
  game: PokerGame,
  amountOf: (player: PokerPlayer) => number = (player) => player.committed
): readonly Contribution[] =>
  game.players.map((player) => ({
    playerId: player.id,
    amount: amountOf(player),
    live: isContender(player),
  }))

export const potTotalOf = (game: PokerGame): number =>
  game.players.reduce((total, player) => total + player.committed, 0)

const inSeatOrder = (game: PokerGame, ids: readonly PlayerId[]): readonly PlayerId[] =>
  seatsAfter(game.players, game.deal.buttonId)
    .map((player) => player.id)
    .filter((id) => ids.includes(id))

const nextAliveAfter = (game: PokerGame, playerId: PlayerId): PlayerId =>
  (seatsAfter(game.players, playerId).find(isInGame) ?? getPlayer(game, playerId)).id

const blindSeats = (game: PokerGame, buttonId: PlayerId) => {
  const order = seatsAfter(game.players, buttonId).filter(isInGame)
  const [first, second] = order
  if (!first || !second) throw new Error("Mão sem jogadores suficientes")
  return order.length === 2
    ? { smallBlindId: buttonId, bigBlindId: first.id }
    : { smallBlindId: first.id, bigBlindId: second.id }
}

const postBlind = (game: PokerGame, playerId: PlayerId, size: number, big: boolean) => {
  const player = getPlayer(game, playerId)
  const amount = Math.min(size, player.chips)
  const chips = player.chips - amount
  return withEvents(
    {
      ...game,
      players: game.players.map((seated) =>
        seated.id === playerId
          ? {
              ...seated,
              chips,
              bet: amount,
              committed: amount,
              status: chips === 0 ? ("allIn" as const) : seated.status,
            }
          : seated
      ),
    },
    { type: "blindPosted", playerId, amount, big }
  )
}

const seatForHand = (player: PokerPlayer, hole: PokerPlayer["hole"]): PokerPlayer =>
  player.chips > 0
    ? { ...player, hole, bet: 0, committed: 0, status: "active", acted: false }
    : { ...player, hole: [], bet: 0, committed: 0, status: "out", acted: false }

export const dealHand = (
  game: PokerGame,
  number: number,
  buttonId: PlayerId,
  random: RandomSource
): PokerGame => {
  const deck = shuffle(createFullDeck(), random)
  const alive = game.players.filter((player) => player.chips > 0).map((player) => player.id)
  const seated = game.players.map((player) => {
    const index = alive.indexOf(player.id)
    return seatForHand(player, deck.slice(index * HOLE_CARDS, (index + 1) * HOLE_CARDS))
  })
  const blinds = blindsFor(number)
  const positions = blindSeats({ ...game, players: seated }, buttonId)
  const dealt = withEvents(
    {
      ...game,
      players: seated,
      deal: {
        number,
        buttonId,
        ...positions,
        blinds,
        street: "preflop",
        board: [],
        deck: deck.slice(alive.length * HOLE_CARDS),
        currentBet: blinds.big,
        minRaise: blinds.big,
        actorId: positions.bigBlindId,
      },
    },
    { type: "handStarted", number, buttonId, blinds }
  )
  const posted = postBlind(
    postBlind(dealt, positions.smallBlindId, blinds.small, false),
    positions.bigBlindId,
    blinds.big,
    true
  )
  return resolveBetting(posted, positions.bigBlindId)
}

const dealStreet = (game: PokerGame): PokerGame => {
  const { deal } = game
  const street = STREETS[STREETS.indexOf(deal.street) + 1] ?? "river"
  const count = BOARD_SIZE[street] - deal.board.length
  const cards = deal.deck.slice(0, count)
  return withEvents(
    {
      ...game,
      players: game.players.map((player) => ({ ...player, bet: 0, acted: false })),
      deal: {
        ...deal,
        street,
        board: [...deal.board, ...cards],
        deck: deal.deck.slice(count),
        currentBet: 0,
        minRaise: deal.blinds.big,
      },
    },
    { type: "streetDealt", street, cards }
  )
}

const winnersOf = (
  game: PokerGame,
  pot: Pot,
  ranked: ReadonlyMap<PlayerId, RankedHand>
): PotResult => {
  const hands = pot.eligibleIds.map((id) => ({ id, hand: ranked.get(id) as RankedHand }))
  const best = hands.reduce((top, entry) =>
    compareHands(entry.hand, top.hand) > 0 ? entry : top
  ).hand
  const winners = hands.filter((entry) => compareHands(entry.hand, best) === 0)
  return {
    ...pot,
    winnerIds: inSeatOrder(
      game,
      winners.map((entry) => entry.id)
    ),
    category: best.category,
  }
}

const showdown = (game: PokerGame): PokerGame => {
  const contenders = seatsAfter(game.players, game.deal.buttonId).filter(isContender)
  const ranked = new Map(
    contenders.map((player) => [player.id, bestHand([...player.hole, ...game.deal.board])])
  )
  const shown: readonly ShownHand[] = contenders.map((player) => {
    const hand = ranked.get(player.id) as RankedHand
    return { playerId: player.id, hole: player.hole, category: hand.category, cards: hand.cards }
  })
  const pots = buildPots(contributionsOf(game)).map((pot) => winnersOf(game, pot, ranked))
  return closeHand(game, { showdown: true, shown, pots })
}

const awardUncontested = (game: PokerGame): PokerGame => {
  const winnerIds = contendersOf(game).map((player) => player.id)
  const pot: PotResult = {
    amount: potTotalOf(game),
    eligibleIds: winnerIds,
    winnerIds,
    category: null,
  }
  return closeHand(game, { showdown: false, shown: [], pots: [pot] })
}

export const resolveBetting = (game: PokerGame, afterId: PlayerId): PokerGame => {
  if (contendersOf(game).length === 1) return awardUncontested(game)
  const actorId = nextActorAfter(game, afterId)
  if (actorId) return { ...game, pending: null, deal: { ...game.deal, actorId } }
  return { ...game, pending: game.deal.street === "river" ? "showdown" : "street" }
}

export const advancePending = (game: PokerGame, random: RandomSource): PokerGame => {
  switch (game.pending) {
    case "street": {
      const next = dealStreet(game)
      return resolveBetting(next, next.deal.buttonId)
    }
    case "showdown":
      return showdown(game)
    case "nextHand":
      return dealHand(game, game.deal.number + 1, nextAliveAfter(game, game.deal.buttonId), random)
    case null:
      return game
  }
}

const winningsOf = (pots: readonly PotResult[]): Readonly<Record<PlayerId, number>> => {
  const winnings: Record<PlayerId, number> = {}
  for (const pot of pots) {
    for (const [playerId, amount] of splitPot(pot.amount, pot.winnerIds)) {
      winnings[playerId] = (winnings[playerId] ?? 0) + amount
    }
  }
  return winnings
}

const bustedOf = (players: readonly PokerPlayer[]): readonly PokerPlayer[] =>
  players
    .filter((player) => isInGame(player) && player.chips === 0)
    .sort((first, second) => first.committed - second.committed)

const finish = (game: PokerGame): PokerGame => {
  const [winner] = game.players.filter(isInGame)
  const finished: PokerGame = { ...game, winnerId: winner?.id ?? null, endReason: "chips" }
  return winner ? withEvents(finished, { type: "matchWon", playerId: winner.id }) : finished
}

const closeHand = (game: PokerGame, outcome: Outcome): PokerGame => {
  const winnings = winningsOf(outcome.pots)
  const paid = game.players.map((player) => ({
    ...player,
    chips: player.chips + (winnings[player.id] ?? 0),
  }))
  const busted = bustedOf(paid).map((player) => player.id)
  const eliminatedIds = [...game.eliminatedIds, ...busted]
  const summary: HandSummary = {
    number: game.deal.number,
    board: game.deal.board,
    ...outcome,
    winnings,
    eliminatedIds: busted,
  }
  const events: PokerEvent[] = [
    ...outcome.pots.map((pot) => ({
      type: "potWon" as const,
      playerIds: pot.winnerIds,
      amount: pot.amount,
      category: pot.category,
    })),
    ...busted.map((playerId) => ({
      type: "eliminated" as const,
      playerId,
      place: game.players.length - eliminatedIds.indexOf(playerId),
    })),
  ]
  const closed = withEvents(
    {
      ...game,
      players: paid.map((player) => ({
        ...player,
        bet: 0,
        committed: 0,
        acted: false,
        status: busted.includes(player.id) ? ("out" as const) : player.status,
      })),
      lastHand: summary,
      eliminatedIds,
    },
    ...events
  )
  if (closed.players.filter(isInGame).length < 2) return finish({ ...closed, pending: null })
  return { ...closed, pending: "nextHand" }
}
