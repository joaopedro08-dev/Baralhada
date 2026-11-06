import type { TresTrincasState } from "@/lib/game/domain/tres-trincas/types"

export const buildTrincas = (
  changes: Partial<TresTrincasState> = {}
): TresTrincasState => ({
  kind: "tres-trincas",
  hand: ["9C", "9D", "KC", "KD", "3S", "7H", "2H"],
  players: [
    { id: "eu", nickname: "Ana", handSize: 7, sets: [] },
    { id: "beto", nickname: "Beto", handSize: 7, sets: [] },
  ],
  vira: "5C",
  deadRank: "5",
  wildRank: "2",
  stockSize: 37,
  discardTop: null,
  discardSize: 0,
  currentPlayerId: "eu",
  turnNumber: 1,
  stage: "start",
  moves: { draw: true, discard: false, meldLimit: 2 },
  winnerId: null,
  endReason: null,
  history: [],
  ...changes,
})
