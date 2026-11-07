import type { CachetaState } from "@/lib/game/domain/cacheta/types"

export const buildCacheta = (
  changes: Partial<CachetaState> = {}
): CachetaState => ({
  kind: "cacheta",
  hand: ["7H", "7C", "7D", "2S", "3S", "4S", "9D", "10D", "6H"],
  drawnCard: null,
  players: [
    { id: "eu", nickname: "Ana", handSize: 9, points: 10, status: "playing" },
    {
      id: "beto",
      nickname: "Beto",
      handSize: 9,
      points: 10,
      status: "playing",
    },
  ],
  round: 1,
  vira: "5C",
  wildRank: "6",
  stockSize: 85,
  discardTop: null,
  discardSize: 0,
  currentPlayerId: "eu",
  turnNumber: 1,
  stage: "start",
  pending: null,
  moves: { draw: true, take: false, discard: false, knock: false },
  lastRound: null,
  eliminations: [],
  winnerId: null,
  endReason: null,
  history: [],
  ...changes,
})
