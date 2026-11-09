import type { GamePlayer, GameState, RoomState } from "@/lib/game/domain/types"

export const buildPlayer = (
  id: string,
  changes: Partial<GamePlayer> = {}
): GamePlayer => ({
  id,
  nickname: id.toUpperCase(),
  handSize: 4,
  pileSize: 0,
  pileTop: null,
  ...changes,
})

export const buildGame = (changes: Partial<GameState> = {}): GameState => ({
  kind: "rouba-monte",
  hand: [],
  table: [],
  deckSize: 20,
  players: [buildPlayer("eu"), buildPlayer("ana")],
  currentPlayerId: "eu",
  turnNumber: 3,
  drewThisTurn: false,
  endReason: null,
  winnerIds: [],
  history: [],
  ...changes,
})

export const buildRoom = (changes: Partial<RoomState> = {}): RoomState => ({
  code: "ABC234",
  version: 1,
  gameId: "rouba-monte",
  status: "lobby",
  hostId: "eu",
  viewerId: "eu",
  canStart: false,
  startProblem: "NOT_ENOUGH_PLAYERS",
  players: [],
  teams: null,
  hintsAllowed: true,
  pausedUntil: null,
  pausedAt: null,
  turnDurationMs: 60_000,
  turnDeadlineAt: null,
  matchStartsAt: null,
  serverNow: 0,
  game: null,
  ...changes,
})
