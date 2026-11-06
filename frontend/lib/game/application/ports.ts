import type {
  AnyAction,
  AnyHints,
  GameId,
  PlayerId,
  RoomState,
  Seat,
} from "@/lib/game/domain/types"

export type Ack<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false
      readonly error: { readonly code: string; readonly message: string }
    }

export type GrantedSeat = Omit<Seat, "nickname" | "inviteUrl">

export interface ClientCommands {
  "room:create": {
    input: { nickname: string; gameId: GameId }
    output: GrantedSeat
  }
  "room:join": {
    input: { code: string; nickname: string }
    output: GrantedSeat
  }
  "room:reconnect": {
    input: { code: string; nickname: string; reconnectToken: string }
    output: GrantedSeat
  }
  "room:leave": { input: undefined; output: null }
  "room:kick": { input: { playerId: PlayerId }; output: null }
  "room:game": { input: { gameId: GameId }; output: null }
  "room:team": { input: { playerId: PlayerId; team: number }; output: null }
  "room:teams-draw": { input: undefined; output: null }
  "room:hints": { input: { allowed: boolean }; output: null }
  "game:start": { input: undefined; output: null }
  "game:action": { input: AnyAction; output: null }
  "game:hints": { input: undefined; output: AnyHints }
}

export type ClientCommand = keyof ClientCommands

export type CommandArgs<C extends ClientCommand> =
  ClientCommands[C]["input"] extends undefined
    ? []
    : [ClientCommands[C]["input"]]

export type DisconnectReason = "replaced" | "lost"

export interface GatewayListeners {
  onConnected(): void
  onConnectionFailed(): void
  onDisconnected(reason: DisconnectReason): void
  onRoomState(state: RoomState): void
  onRemoved(): void
}

export interface GameGateway {
  connect(listeners: GatewayListeners): void
  resume(): void
  restart(): void
  isConnected(): boolean
  send<C extends ClientCommand>(
    command: C,
    ...args: CommandArgs<C>
  ): Promise<Ack<ClientCommands[C]["output"]>>
}

export interface SeatStore {
  load(): Seat | null
  save(seat: Seat): void
  forget(): void
}

export interface AddressBar {
  invitedRoomCode(): string | null
  showRoom(code: string | null): void
  inviteLink(code: string): string
}
