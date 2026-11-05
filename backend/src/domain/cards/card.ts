export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const
export const SUITS = ["C", "D", "H", "S"] as const

export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]
export type Card = `${Rank}${Suit}`

export const COPIES_PER_RANK = SUITS.length
export const DECK_SIZE = RANKS.length * COPIES_PER_RANK

export const createFullDeck = (): readonly Card[] =>
  RANKS.flatMap((rank) => SUITS.map((suit): Card => `${rank}${suit}`))

export const rankOf = (card: Card): Rank => card.slice(0, -1) as Rank

export const sameRank = (first: Card, second: Card): boolean => rankOf(first) === rankOf(second)
