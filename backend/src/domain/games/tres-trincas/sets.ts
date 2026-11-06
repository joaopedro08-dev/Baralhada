import { RANKS, rankOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import { SET_SIZE } from "./model.js"
import type { CardSet } from "./model.js"

export interface Jokers {
  readonly dead: Rank
  readonly wild: Rank
}

const PRIMARY_WILD: Rank = "2"
const BACKUP_WILD: Rank = "J"

export const jokersFor = (vira: Card): Jokers => {
  const dead = rankOf(vira)
  return { dead, wild: dead === PRIMARY_WILD ? BACKUP_WILD : PRIMARY_WILD }
}

export const isDead = (card: Card, jokers: Jokers): boolean => rankOf(card) === jokers.dead

export const isWild = (card: Card, jokers: Jokers): boolean => rankOf(card) === jokers.wild

export const isSet = (cards: readonly Card[], jokers: Jokers): boolean => {
  if (cards.length !== SET_SIZE || cards.some((card) => isDead(card, jokers))) return false
  const naturals = new Set(cards.filter((card) => !isWild(card, jokers)).map(rankOf))
  return naturals.size <= 1
}

export const setRankOf = (set: CardSet, jokers: Jokers): Rank =>
  set.map(rankOf).find((rank) => rank !== jokers.wild) ?? jokers.wild

export const splitIntoSets = (
  cards: readonly Card[],
  jokers: Jokers
): readonly CardSet[] | null => {
  const [first, ...rest] = cards
  if (!first) return []
  if (cards.length % SET_SIZE !== 0) return null
  for (let second = 0; second < rest.length; second++) {
    for (let third = second + 1; third < rest.length; third++) {
      const set = [first, rest[second] as Card, rest[third] as Card]
      if (!isSet(set, jokers)) continue
      const others = splitIntoSets(
        rest.filter((_, index) => index !== second && index !== third),
        jokers
      )
      if (others) return [set, ...others]
    }
  }
  return null
}

const naturalGroups = (hand: readonly Card[], jokers: Jokers): readonly Card[][] =>
  RANKS.filter((rank) => rank !== jokers.dead && rank !== jokers.wild)
    .map((rank) => hand.filter((card) => rankOf(card) === rank))
    .filter((group) => group.length > 0)
    .sort((first, second) => second.length - first.length)

export const findSets = (hand: readonly Card[], jokers: Jokers): readonly CardSet[] => {
  const wilds = hand.filter((card) => isWild(card, jokers))
  const sets: CardSet[] = []
  const leftovers: Card[][] = []
  for (const group of naturalGroups(hand, jokers)) {
    if (group.length >= SET_SIZE) sets.push(group.slice(0, SET_SIZE))
    const rest = group.slice(group.length >= SET_SIZE ? SET_SIZE : 0)
    if (rest.length > 0) leftovers.push(rest)
  }
  for (const group of leftovers.sort((first, second) => second.length - first.length)) {
    const needed = SET_SIZE - group.length
    if (wilds.length < needed) break
    sets.push([...group, ...wilds.splice(0, needed)])
  }
  while (wilds.length >= SET_SIZE) sets.push(wilds.splice(0, SET_SIZE))
  return sets
}
