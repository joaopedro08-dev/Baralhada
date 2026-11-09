"use client"

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react"

import { Chip } from "@/components/game/poker/chips"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap"
import { chipBreakdown } from "@/lib/game/domain/poker/chips"
import type { ChipValue } from "@/lib/game/domain/poker/chips"
import type { PokerState } from "@/lib/game/domain/poker/types"

interface ChipFlight {
  readonly id: number
  readonly value: ChipValue
  readonly from: DOMRect
  readonly to: DOMRect
  readonly delay: number
}

type FlightPlan = Omit<ChipFlight, "id">

const TOKENS_PER_FLIGHT = 3
const TOKEN_STAGGER_S = 0.06
const PAYOUT_DELAY_S = 0.9
const FLIGHT_SECONDS = 0.6
const ARC_HEIGHT = 46
const NO_FLIGHTS: readonly ChipFlight[] = []

let flights = NO_FLIGHTS
let nextId = 1
const listeners = new Set<() => void>()

const publish = (next: readonly ChipFlight[]): void => {
  flights = next
  listeners.forEach((listener) => listener())
}

const chipBoard = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getFlights: (): readonly ChipFlight[] => flights,
  getServerFlights: (): readonly ChipFlight[] => NO_FLIGHTS,
  launch(plans: readonly FlightPlan[]): void {
    if (plans.length > 0) {
      publish([...flights, ...plans.map((plan) => ({ ...plan, id: nextId++ }))])
    }
  },
  land(id: number): void {
    publish(flights.filter((flight) => flight.id !== id))
  },
  clear(): void {
    if (flights.length > 0) publish(NO_FLIGHTS)
  },
}

const rectOf = (selector: string): DOMRect | null =>
  document.querySelector(selector)?.getBoundingClientRect() ?? null

const plansBetween = (
  from: DOMRect | null,
  to: DOMRect | null,
  amount: number,
  startDelay: number
): readonly FlightPlan[] => {
  if (!from || !to) return []
  return chipBreakdown(amount, TOKENS_PER_FLIGHT).map((value, index) => ({
    value,
    from,
    to,
    delay: startDelay + index * TOKEN_STAGGER_S,
  }))
}

const isNewResult = (previous: PokerState, next: PokerState): boolean =>
  next.lastHand !== null && next.lastHand.number !== previous.lastHand?.number

const streetClosed = (previous: PokerState, next: PokerState): boolean =>
  next.board.length > previous.board.length || isNewResult(previous, next)

const planFlights = (
  previous: PokerState,
  next: PokerState
): readonly FlightPlan[] => {
  const collected = streetClosed(previous, next)
    ? previous.players
        .filter((player) => player.bet > 0)
        .flatMap((player) =>
          plansBetween(
            rectOf(`[data-bet-spot="${player.id}"]`),
            rectOf("[data-pot]"),
            player.bet,
            0
          )
        )
    : []
  const summary = next.lastHand
  const paid =
    summary && isNewResult(previous, next)
      ? Object.entries(summary.winnings).flatMap(([playerId, amount]) =>
          plansBetween(
            rectOf("[data-pot]"),
            rectOf(`[data-seat="${playerId}"]`),
            amount,
            PAYOUT_DELAY_S
          )
        )
      : []
  return [...collected, ...paid]
}

function FlyingChip({ flight }: { flight: ChipFlight }) {
  const body = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const element = body.current
      if (!element) return
      const start = {
        x: flight.from.left + flight.from.width / 2,
        y: flight.from.top + flight.from.height / 2,
      }
      const end = {
        x: flight.to.left + flight.to.width / 2,
        y: flight.to.top + flight.to.height / 2,
      }
      gsap.set(element, {
        x: start.x,
        y: start.y,
        xPercent: -50,
        yPercent: -50,
      })
      gsap.to(element, {
        delay: flight.delay,
        duration: FLIGHT_SECONDS,
        ease: "power2.inOut",
        rotation: gsap.utils.random(-200, 200),
        motionPath: {
          curviness: 1.2,
          path: [
            start,
            {
              x: (start.x + end.x) / 2,
              y: Math.min(start.y, end.y) - ARC_HEIGHT,
            },
            end,
          ],
        },
        onComplete: () => chipBoard.land(flight.id),
      })
    },
    { dependencies: [flight.id] }
  )

  return (
    <span ref={body} className="absolute top-0 left-0 will-change-transform">
      <Chip value={flight.value} className="size-5" />
    </span>
  )
}

export function ChipFlights({ game }: { game: PokerState }) {
  const previous = useRef(game)
  const flying = useSyncExternalStore(
    chipBoard.subscribe,
    chipBoard.getFlights,
    chipBoard.getServerFlights
  )

  useEffect(() => chipBoard.clear, [])

  useLayoutEffect(() => {
    const before = previous.current
    previous.current = game
    if (before === game || prefersReducedMotion()) return
    chipBoard.launch(planFlights(before, game))
  }, [game])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {flying.map((flight) => (
        <FlyingChip key={flight.id} flight={flight} />
      ))}
    </div>
  )
}
