import { rankOf } from "@/lib/game/domain/cards"
import type { CardRole, HandGroup } from "@/lib/game/domain/tres-trincas/types"
import { RANKS } from "@/lib/game/domain/types"
import type { Card, Rank } from "@/lib/game/domain/types"

const ROLE_ORDER: Readonly<Record<CardRole, number>> = {
  natural: 0,
  wild: 1,
  dead: 2,
}

const roleOf = (rank: Rank, wildRank: Rank, deadRank: Rank): CardRole => {
  if (rank === deadRank) return "dead"
  return rank === wildRank ? "wild" : "natural"
}

export const groupHand = (
  hand: readonly Card[],
  wildRank: Rank,
  deadRank: Rank
): readonly HandGroup[] =>
  RANKS.map((rank) => hand.filter((card) => rankOf(card) === rank))
    .filter((cards) => cards.length > 0)
    .map((cards) => {
      const rank = rankOf(cards[0] as Card)
      return { rank, role: roleOf(rank, wildRank, deadRank), cards }
    })
    .sort(
      (first, second) =>
        ROLE_ORDER[first.role] - ROLE_ORDER[second.role] ||
        second.cards.length - first.cards.length ||
        RANKS.indexOf(first.rank) - RANKS.indexOf(second.rank)
    )
