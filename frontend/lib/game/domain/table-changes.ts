import { isCompleteMeld } from "@/lib/game/domain/cards"
import type {
  Card,
  GamePlayer,
  GameState,
  PlayerId,
  Rank,
} from "@/lib/game/domain/types"

export const HAND_ANCHOR = "hand"
export const TABLE_ANCHOR = "table"
export const DECK_ANCHOR = "deck"
export const playerAnchor = (playerId: PlayerId): string => `player:${playerId}`

export interface CardMove {
  readonly card: Card | null
  readonly from: string
  readonly to: string
}

export type TableEvent =
  | {
      readonly kind: "quadCompleted"
      readonly playerId: PlayerId
      readonly rank: Rank
    }
  | {
      readonly kind: "stolen"
      readonly thiefId: PlayerId
      readonly victimId: PlayerId
      readonly rank: Rank
    }

const MAX_MOVES = 14

const locateCards = (game: GameState): ReadonlyMap<Card, string> => {
  const places = new Map<Card, string>()
  game.hand.forEach((card) => places.set(card, HAND_ANCHOR))
  game.table.forEach((card) => places.set(card, TABLE_ANCHOR))
  game.players.forEach((player) =>
    player.melds.forEach((meld) =>
      meld.cards.forEach((card) => places.set(card, playerAnchor(player.id)))
    )
  )
  return places
}

const handSizeOf = (game: GameState, playerId: PlayerId): number =>
  game.players.find((player) => player.id === playerId)?.handSize ?? 0

const originOfRevealedCard = (
  to: string,
  previous: GameState,
  next: GameState
): string => {
  if (to !== TABLE_ANCHOR) return to === HAND_ANCHOR ? DECK_ANCHOR : to
  const actor = previous.currentPlayerId
  return handSizeOf(next, actor) < handSizeOf(previous, actor)
    ? playerAnchor(actor)
    : DECK_ANCHOR
}

const hiddenDraws = (
  previous: GameState,
  next: GameState,
  viewerId: PlayerId
): readonly CardMove[] =>
  next.players
    .filter((player) => player.id !== viewerId)
    .flatMap((player) => {
      const gained = player.handSize - handSizeOf(previous, player.id)
      return Array.from({ length: Math.max(gained, 0) }, () => ({
        card: null,
        from: DECK_ANCHOR,
        to: playerAnchor(player.id),
      }))
    })

export const describeMoves = (
  previous: GameState,
  next: GameState,
  viewerId: PlayerId
): readonly CardMove[] => {
  const before = locateCards(previous)
  const visible = [...locateCards(next)].flatMap(([card, to]) => {
    const from = before.get(card) ?? originOfRevealedCard(to, previous, next)
    return before.get(card) === to ? [] : [{ card, from, to }]
  })
  return [...visible, ...hiddenDraws(previous, next, viewerId)].slice(
    0,
    MAX_MOVES
  )
}

const completedRanks = (player: GamePlayer | undefined): readonly Rank[] =>
  player?.melds.filter(isCompleteMeld).map((meld) => meld.rank) ?? []

const findPlayer = (game: GameState, playerId: PlayerId) =>
  game.players.find((player) => player.id === playerId)

const quadEvents = (
  previous: GameState,
  next: GameState
): readonly TableEvent[] =>
  next.players.flatMap((player) => {
    const known = completedRanks(findPlayer(previous, player.id))
    return completedRanks(player)
      .filter((rank) => !known.includes(rank))
      .map((rank) => ({
        kind: "quadCompleted" as const,
        playerId: player.id,
        rank,
      }))
  })

const stealEvents = (
  previous: GameState,
  next: GameState
): readonly TableEvent[] => {
  const thiefId = previous.currentPlayerId
  const thief = findPlayer(next, thiefId)
  return previous.players
    .filter((player) => player.id !== thiefId)
    .flatMap((victim) =>
      victim.melds
        .filter((meld) => {
          const stillThere = findPlayer(next, victim.id)?.melds.some(
            (kept) => kept.rank === meld.rank
          )
          const taken = thief?.melds.some((held) => held.rank === meld.rank)
          return !stillThere && taken
        })
        .map((meld) => ({
          kind: "stolen" as const,
          thiefId,
          victimId: victim.id,
          rank: meld.rank,
        }))
    )
}

export const describeEvents = (
  previous: GameState,
  next: GameState
): readonly TableEvent[] => [
  ...quadEvents(previous, next),
  ...stealEvents(previous, next),
]
