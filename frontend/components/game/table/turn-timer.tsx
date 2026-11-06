"use client"

import { useCallback, useSyncExternalStore } from "react"
import { m } from "framer-motion"
import { Timer } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const URGENT_SECONDS = 10
const TICK_MS = 250

const subscribeToClock = (listener: () => void): (() => void) => {
  const interval = window.setInterval(listener, TICK_MS)
  return () => window.clearInterval(interval)
}

const noSeconds = (): null => null

export const useSecondsLeft = (deadlineAt: number | null): number | null => {
  const readSeconds = useCallback(
    () =>
      deadlineAt === null
        ? null
        : Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
    [deadlineAt]
  )
  return useSyncExternalStore(subscribeToClock, readSeconds, noSeconds)
}

export const useWaiting = (until: number | null): boolean => {
  const readWaiting = useCallback(
    () => until !== null && until > Date.now(),
    [until]
  )
  return useSyncExternalStore(subscribeToClock, readWaiting, noWaiting)
}

const noWaiting = (): boolean => false

export function TurnClock({
  deadlineAt,
  durationMs,
}: {
  deadlineAt: number | null
  durationMs?: number
}) {
  const left = useSecondsLeft(deadlineAt)
  if (left === null) return null
  const seconds =
    durationMs === undefined ? left : Math.min(left, durationMs / 1000)
  const urgent = seconds <= URGENT_SECONDS

  return (
    <m.span
      role="timer"
      aria-label={`${seconds} segundos restantes`}
      animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={urgent ? { duration: 1, repeat: Infinity } : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-felt px-2 text-sm font-semibold tabular-nums ring-1 ring-felt-line",
        urgent && "bg-gold text-gold-foreground ring-gold"
      )}
    >
      <Timer aria-hidden className="size-4" />
      {seconds} s
    </m.span>
  )
}

export function TurnProgress({
  deadlineAt,
  durationMs,
}: {
  deadlineAt: number | null
  durationMs: number
}) {
  const seconds = useSecondsLeft(deadlineAt)
  if (seconds === null) return null
  return (
    <Progress
      aria-hidden
      value={Math.min(100, ((seconds * 1000) / durationMs) * 100)}
      className="h-1 shrink-0 rounded-none bg-felt-deep [&>[data-slot=progress-indicator]]:bg-gold"
    />
  )
}
