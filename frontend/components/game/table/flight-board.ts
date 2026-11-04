import type { Card } from "@/lib/game/domain/types"

export interface Flight {
  readonly id: number
  readonly card: Card | null
  readonly from: DOMRect
  readonly toAnchor: string
  readonly delay: number
}

export type FlightPlan = Omit<Flight, "id" | "delay">

const STAGGER_SECONDS = 0.07
const NO_FLIGHTS: readonly Flight[] = []

let flights = NO_FLIGHTS
let nextId = 1
const listeners = new Set<() => void>()

const publish = (next: readonly Flight[]): void => {
  flights = next
  listeners.forEach((listener) => listener())
}

export const flightBoard = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getFlights: (): readonly Flight[] => flights,

  getServerFlights: (): readonly Flight[] => NO_FLIGHTS,

  launch(plans: readonly FlightPlan[]): void {
    if (plans.length === 0) return
    const launched = plans.map((plan, order) => ({
      ...plan,
      id: nextId++,
      delay: order * STAGGER_SECONDS,
    }))
    publish([...flights, ...launched])
  },

  land(id: number): void {
    publish(flights.filter((flight) => flight.id !== id))
  },

  clear(): void {
    if (flights.length > 0) publish(NO_FLIGHTS)
  },
}
