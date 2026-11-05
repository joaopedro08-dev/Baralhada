import type { Card, GameState, PlayerId } from "@/lib/game/domain/types"

export const HAND_ANCHOR = "hand"
export const TABLE_ANCHOR = "table"
export const DECK_ANCHOR = "deck"
export const playerAnchor = (playerId: PlayerId): string => `player:${playerId}`

export interface CardMove {
  readonly card: Card | null
  readonly from: string
  readonly to: string
}

export interface PileStolen {
  readonly thiefId: PlayerId
  readonly victimId: PlayerId
  readonly count: number
}

const MAX_MOVES = 14

const locateCards = (game: GameState): ReadonlyMap<Card, string> => {
  const places = new Map<Card, string>()
  game.hand.forEach((card) => places.set(card, HAND_ANCHOR))
  game.table.forEach((card) => places.set(card, TABLE_ANCHOR))
  game.players.forEach(
    (player) =>
      player.pileTop && places.set(player.pileTop, playerAnchor(player.id))
  )
  return places
}

const findPlayer = (game: GameState, playerId: PlayerId) =>
  game.players.find((player) => player.id === playerId)

const handSizeOf = (game: GameState, playerId: PlayerId): number =>
  findPlayer(game, playerId)?.handSize ?? 0

const pileSizeOf = (game: GameState, playerId: PlayerId): number =>
  findPlayer(game, playerId)?.pileSize ?? 0

const originOfRevealedCard = (
  to: string,
  previous: GameState,
  next: GameState
): string => {
  const actor = previous.currentPlayerId
  if (to === HAND_ANCHOR) return DECK_ANCHOR
  if (handSizeOf(next, actor) < handSizeOf(previous, actor)) {
    return playerAnchor(actor)
  }
  return to === TABLE_ANCHOR ? DECK_ANCHOR : to
}

const revealedMoves = (
  previous: GameState,
  next: GameState,
  before: ReadonlyMap<Card, string>,
  after: ReadonlyMap<Card, string>
): readonly CardMove[] =>
  [...after].flatMap(([card, to]) => {
    const from = before.get(card) ?? originOfRevealedCard(to, previous, next)
    return from === to ? [] : [{ card, from, to }]
  })

const buriedMoves = (
  previous: GameState,
  next: GameState,
  before: ReadonlyMap<Card, string>,
  after: ReadonlyMap<Card, string>
): readonly CardMove[] => {
  const actor = previous.currentPlayerId
  const to = playerAnchor(actor)
  if (pileSizeOf(next, actor) <= pileSizeOf(previous, actor)) return []
  return [...before]
    .filter(([card, from]) => !after.has(card) && from !== to)
    .map(([card, from]) => ({ card, from, to }))
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
  const after = locateCards(next)
  return [
    ...buriedMoves(previous, next, before, after),
    ...revealedMoves(previous, next, before, after),
    ...hiddenDraws(previous, next, viewerId),
  ].slice(0, MAX_MOVES)
}

export const describeSteal = (
  previous: GameState,
  next: GameState
): PileStolen | null => {
  const thiefId = previous.currentPlayerId
  const victim = previous.players.find(
    (player) =>
      player.id !== thiefId &&
      player.pileSize > 0 &&
      pileSizeOf(next, player.id) === 0 &&
      findPlayer(next, player.id) !== undefined
  )
  if (!victim || pileSizeOf(next, thiefId) <= pileSizeOf(previous, thiefId)) {
    return null
  }
  return { thiefId, victimId: victim.id, count: victim.pileSize }
}
