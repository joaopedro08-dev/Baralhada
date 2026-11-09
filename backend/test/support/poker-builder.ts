import type { Card } from "../../src/domain/cards/card.js"
import type { Deal, PokerGame, PokerPlayer } from "../../src/domain/games/poker/model.js"

type PlayerSpec = Partial<Omit<PokerPlayer, "id">>

interface PokerSpec {
  readonly players: Readonly<Record<string, PlayerSpec>>
  readonly deal?: Partial<Deal>
}

export const buildPoker = (spec: PokerSpec): PokerGame => {
  const ids = Object.keys(spec.players)
  const [first = "a", second = first, third = second] = ids
  const players = ids.map((id) => {
    const player = spec.players[id] ?? {}
    return {
      id,
      chips: 1000,
      hole: [] as readonly Card[],
      bet: 0,
      committed: player.bet ?? 0,
      status: "active" as const,
      acted: false,
      ...player,
    }
  })
  const headsUp = ids.length === 2
  return {
    nicknames: Object.fromEntries(ids.map((id) => [id, id.toUpperCase()])),
    players,
    deal: {
      number: 1,
      buttonId: first,
      smallBlindId: headsUp ? first : second,
      bigBlindId: headsUp ? second : third,
      blinds: { small: 10, big: 20 },
      street: "flop",
      board: [],
      deck: [],
      currentBet: Math.max(0, ...players.map((player) => player.bet)),
      minRaise: 20,
      actorId: headsUp ? second : first,
      ...spec.deal,
    },
    step: 1,
    pending: null,
    events: [],
    lastHand: null,
    eliminatedIds: [],
    winnerId: null,
    endReason: null,
  }
}

export const chipsInPlay = (game: PokerGame): number =>
  game.players.reduce((total, player) => total + player.chips + player.committed, 0)

export const cardsInPlay = (game: PokerGame): readonly Card[] => [
  ...game.players.flatMap((player) => player.hole),
  ...game.deal.board,
  ...game.deal.deck,
]
