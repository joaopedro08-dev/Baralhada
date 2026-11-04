export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const
export const SUITS = ["C", "D", "H", "S"] as const

export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]
export type Card = `${Rank}${Suit}`

export const QUAD_SIZE = 4
export const TOTAL_QUADS = RANKS.length

export const createFullDeck = (): readonly Card[] =>
  RANKS.flatMap((rank) => SUITS.map((suit): Card => `${rank}${suit}`))

export const rankOf = (card: Card): Rank => card.slice(0, -1) as Rank

export const shareRank = (cards: readonly Card[]): boolean =>
  cards.every((card) => rankOf(card) === rankOf(cards[0] as Card))
