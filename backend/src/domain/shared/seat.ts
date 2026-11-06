export type PlayerId = string

export interface Seat {
  readonly id: PlayerId
  readonly nickname: string
  readonly team: number | null
}
