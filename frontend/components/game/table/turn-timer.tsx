"use client"

import { useCallback, useSyncExternalStore } from "react"
import { m } from "framer-motion"
import { Timer } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const URGENT_SECONDS = 10
const TURN_SECONDS = 60
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

export function TurnClock({ deadlineAt }: { deadlineAt: number | null }) {
  const seconds = useSecondsLeft(deadlineAt)
  if (seconds === null) return null
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

export function TurnProgress({ deadlineAt }: { deadlineAt: number | null }) {
  const seconds = useSecondsLeft(deadlineAt)
  if (seconds === null) return null
  return (
    <Progress
      aria-hidden
      value={Math.min(100, (seconds / TURN_SECONDS) * 100)}
      className="h-1 shrink-0 rounded-none bg-felt-deep [&>[data-slot=progress-indicator]]:bg-gold"
    />
  )
}
