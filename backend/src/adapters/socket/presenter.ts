import type { GameCatalog } from "../../domain/room/game-catalog.js"
import type { AnyGameRules } from "../../domain/room/game-rules.js"
import { hostIdOf, startProblemOf, statusOf } from "../../domain/room/room.js"
import type { Room } from "../../domain/room/room.js"
import { teamsOf } from "../../domain/room/teams.js"
import type { PlayerId } from "../../domain/shared/seat.js"
import type { GameStateDto, RoomStateDto } from "./contract.js"
import type { GameAdapter, GameAdapters } from "./game-adapter.js"

export type RoomStatePresenter = (viewerId: PlayerId) => RoomStateDto

export interface ResolvedGame {
  readonly rules: AnyGameRules
  readonly adapter: GameAdapter
}

export class RoomPresenter {
  constructor(
    private readonly catalog: GameCatalog,
    private readonly adapters: GameAdapters,
    private readonly turnDurationOverrideMs: number | null,
    private readonly reconnectGraceMs = 120_000
  ) {}

  resolve(gameId: string): ResolvedGame {
    const rules = this.catalog.find(gameId)
    const adapter = this.adapters.find(gameId)
    if (!rules || !adapter) throw new Error(`Jogo sem adaptador: ${gameId}`)
    return { rules, adapter }
  }

  present(room: Room, serverNow: number): RoomStatePresenter {
    const { rules, adapter } = this.resolve(room.gameId)
    const problem = startProblemOf(room, rules)
    const presentGame =
      room.game === null
        ? null
        : (adapter.presenter(room.game) as (viewerId: PlayerId) => GameStateDto)
    const shared = {
      code: room.code,
      version: room.version,
      gameId: room.gameId,
      serverNow,
      status: statusOf(room, rules),
      hostId: hostIdOf(room),
      canStart: problem === null,
      startProblem: problem,
      players: room.players.map(({ id, nickname, connected, disconnectedAt }) => ({
        id,
        nickname,
        connected,
        reconnectDeadlineAt:
          disconnectedAt === null ? null : disconnectedAt + this.reconnectGraceMs,
      })),
      teams: rules.teamCount === null ? null : teamsOf(room, rules.teamCount),
      hintsAllowed: room.hintsAllowed,
      matchWins: room.matchWins,
      turnDurationMs:
        room.turnDurationSeconds === null
          ? this.turnDurationOverrideMs ?? rules.turnDurationMs
          : room.turnDurationSeconds * 1000,
      turnDurationSeconds: room.turnDurationSeconds,
      turnDeadlineAt: room.turnDeadlineAt,
      matchStartsAt: room.matchStartsAt,
      pausedUntil: room.pausedUntil,
      pausedAt: room.pausedAt,
    }
    return (viewerId) => ({ ...shared, viewerId, game: presentGame?.(viewerId) ?? null })
  }
}
