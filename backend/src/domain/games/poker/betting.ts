import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { PokerErrorCode } from "./errors.js"
import {
  findPlayer,
  getPlayer,
  isFinished,
  replacePlayer,
  seatsAfter,
  withEvents,
} from "./model.js"
import type { BettingMove, Deal, PlayerId, PokerGame, PokerPlayer } from "./model.js"

export type PokerAction =
  | { readonly type: "fold" }
  | { readonly type: "check" }
  | { readonly type: "call" }
  | { readonly type: "bet"; readonly amount: number }
  | { readonly type: "raise"; readonly amount: number }

export interface BetRange {
  readonly min: number
  readonly max: number
}

export interface PokerMoves {
  readonly fold: boolean
  readonly check: boolean
  readonly call: number | null
  readonly bet: BetRange | null
  readonly raise: BetRange | null
}

export const NO_MOVES: PokerMoves = {
  fold: false,
  check: false,
  call: null,
  bet: null,
  raise: null,
}

type Outcome = Result<PokerGame, PokerErrorCode>

export const toCallOf = (deal: Deal, player: PokerPlayer): number =>
  Math.max(0, deal.currentBet - player.bet)

const othersCanRespond = (game: PokerGame, playerId: PlayerId): boolean =>
  game.players.some((player) => player.id !== playerId && player.status === "active")

export const needsToAct = (game: PokerGame, player: PokerPlayer): boolean => {
  if (player.status !== "active") return false
  if (player.bet < game.deal.currentBet) return true
  return !player.acted && othersCanRespond(game, player.id)
}

export const nextActorAfter = (game: PokerGame, seatId: PlayerId): PlayerId | null =>
  seatsAfter(game.players, seatId).find((player) => needsToAct(game, player))?.id ?? null

const betRange = (game: PokerGame, player: PokerPlayer): BetRange => ({
  min: Math.min(game.deal.blinds.big, player.chips),
  max: player.chips,
})

const raiseRange = (game: PokerGame, player: PokerPlayer): BetRange => {
  const allIn = player.bet + player.chips
  return { min: Math.min(game.deal.currentBet + game.deal.minRaise, allIn), max: allIn }
}

const isOnTurn = (game: PokerGame, playerId: PlayerId): boolean =>
  !isFinished(game) && game.pending === null && game.deal.actorId === playerId

export const movesOf = (game: PokerGame, playerId: PlayerId): PokerMoves => {
  const player = findPlayer(game, playerId)
  if (!player || !isOnTurn(game, playerId) || player.status !== "active") return NO_MOVES
  const toCall = toCallOf(game.deal, player)
  const canPress = player.chips > toCall && othersCanRespond(game, playerId)
  const opening = game.deal.currentBet === 0
  return {
    fold: toCall > 0,
    check: toCall === 0,
    call: toCall > 0 ? Math.min(toCall, player.chips) : null,
    bet: opening && canPress ? betRange(game, player) : null,
    raise: !opening && canPress && !player.acted ? raiseRange(game, player) : null,
  }
}

const putChips = (player: PokerPlayer, amount: number): PokerPlayer => {
  const chips = player.chips - amount
  return {
    ...player,
    chips,
    bet: player.bet + amount,
    committed: player.committed + amount,
    status: chips === 0 ? "allIn" : player.status,
    acted: true,
  }
}

const amountRefusal = (
  range: BetRange | null,
  amount: number,
  closed: PokerErrorCode
): PokerErrorCode | null => {
  if (!range) return closed
  if (amount > range.max) return "AMOUNT_TOO_LARGE"
  return amount < range.min ? "AMOUNT_TOO_SMALL" : null
}

const pressTo = (game: PokerGame, player: PokerPlayer, total: number): PokerGame => {
  const { deal } = game
  const raiseSize = total - deal.currentBet
  const reopens = raiseSize >= deal.minRaise
  const pressed = putChips(player, total - player.bet)
  return {
    ...game,
    players: game.players.map((seated) => {
      if (seated.id === player.id) return pressed
      return reopens && seated.status === "active" ? { ...seated, acted: false } : seated
    }),
    deal: {
      ...deal,
      currentBet: total,
      minRaise: reopens ? raiseSize : deal.minRaise,
    },
  }
}

const settle = (
  game: PokerGame,
  player: PokerPlayer,
  move: BettingMove,
  amount: number
): PokerGame =>
  withEvents(game, {
    type: "acted",
    playerId: player.id,
    move,
    amount,
    allIn: getPlayer(game, player.id).status === "allIn",
  })

const press = (
  game: PokerGame,
  player: PokerPlayer,
  move: "bet" | "raise",
  amount: number,
  range: BetRange | null
): Outcome => {
  const refusal = amountRefusal(range, amount, move === "bet" ? "CANNOT_BET" : "CANNOT_RAISE")
  if (refusal) return err(refusal)
  return ok(settle(pressTo(game, player, amount), player, move, amount))
}

export const applyMove = (game: PokerGame, player: PokerPlayer, action: PokerAction): Outcome => {
  const moves = movesOf(game, player.id)
  switch (action.type) {
    case "fold":
      if (!moves.fold) return err("CANNOT_FOLD")
      return ok(
        settle(replacePlayer(game, { ...player, status: "folded", acted: true }), player, "fold", 0)
      )
    case "check":
      if (!moves.check) return err("CANNOT_CHECK")
      return ok(settle(replacePlayer(game, { ...player, acted: true }), player, "check", 0))
    case "call":
      if (moves.call === null) return err("NOTHING_TO_CALL")
      return ok(
        settle(replacePlayer(game, putChips(player, moves.call)), player, "call", moves.call)
      )
    case "bet":
      return press(game, player, "bet", action.amount, moves.bet)
    case "raise":
      return press(game, player, "raise", action.amount, moves.raise)
  }
}
