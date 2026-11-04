import type { HintsResult } from "../../application/use-cases/get-hints.js"
import type { PlayerId } from "../../domain/game/model.js"
import { toPlayerView } from "../../domain/game/player-view.js"
import { canStart, hostIdOf, statusOf } from "../../domain/room/room.js"
import type { Room } from "../../domain/room/room.js"
import type { GameStateDto, HintsDto, RoomStateDto } from "./contract.js"
import { describeHistory, describePlay, describeRisk } from "./messages.js"

const HISTORY_LIMIT = 50

const presentGame = (
  room: Room,
  viewerId: PlayerId,
  history: readonly string[]
): GameStateDto | null => {
  if (!room.game) return null
  const { viewerId: _viewer, events: _events, ...view } = toPlayerView(room.game, viewerId)
  return { ...view, history }
}

export const createRoomStatePresenter = (
  room: Room,
  serverNow: number
): ((viewerId: PlayerId) => RoomStateDto) => {
  const history = room.game ? describeHistory(room.game, HISTORY_LIMIT) : []
  const shared = {
    code: room.code,
    version: room.version,
    serverNow,
    status: statusOf(room),
    hostId: hostIdOf(room),
    canStart: canStart(room),
    players: room.players.map(({ id, nickname, connected }) => ({ id, nickname, connected })),
    turnDeadlineAt: room.turnDeadlineAt,
    matchStartsAt: room.matchStartsAt,
  }
  return (viewerId) => ({ ...shared, viewerId, game: presentGame(room, viewerId, history) })
}

export const presentHints = ({ hints, players }: HintsResult): HintsDto => {
  const nameOf = (id: PlayerId) => players.find((player) => player.id === id)?.nickname ?? "Jogador"
  return {
    plays: hints.plays.map((play) => ({
      action: play.action,
      sentence: describePlay(play, nameOf),
    })),
    highlights: hints.highlights,
    risks: hints.risks.map((risk) => ({
      rank: risk.rank,
      unseenCards: risk.unseenCards,
      sentence: describeRisk(risk),
    })),
    cardCounts: hints.cardCounts,
  }
}
