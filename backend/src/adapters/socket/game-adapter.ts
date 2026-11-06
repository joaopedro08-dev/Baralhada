import type { z } from "zod"
import type { PlayerId } from "../../domain/shared/seat.js"

export interface GameAdapter<State = unknown, StateDto = unknown, HintsDto = unknown> {
  readonly id: string
  readonly actionSchema: z.ZodType
  readonly errorMessages: Readonly<Record<string, string>>
  presenter(game: State): (viewerId: PlayerId) => StateDto
  hints(game: State, viewerId: PlayerId): HintsDto
}

export interface GameAdapters {
  find(gameId: string): GameAdapter | undefined
  errorMessages(): Readonly<Record<string, string>>
}

export const createGameAdapters = (adapters: readonly GameAdapter[]): GameAdapters => {
  const byId = new Map(adapters.map((adapter) => [adapter.id, adapter]))
  const messages: Readonly<Record<string, string>> = Object.assign(
    {},
    ...adapters.map((adapter) => adapter.errorMessages)
  )
  return {
    find: (gameId) => byId.get(gameId),
    errorMessages: () => messages,
  }
}
