"use client"

import { useEffect } from "react"
import {
  animate,
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion"

import { chipBreakdown } from "@/lib/game/domain/poker/chips"
import type { ChipValue } from "@/lib/game/domain/poker/chips"
import { formatChips } from "@/lib/game/domain/poker/guide"
import { cn } from "@/lib/utils"

const CHIP_COLORS: Readonly<Record<ChipValue, string>> = {
  1000: "oklch(0.78 0.15 85)",
  500: "oklch(0.48 0.19 305)",
  100: "oklch(0.27 0.02 260)",
  25: "oklch(0.55 0.15 150)",
  5: "oklch(0.55 0.2 27)",
  1: "oklch(0.58 0.13 245)",
}

const STACK_LIMIT = 6

export function Chip({
  value,
  className,
  style,
}: {
  value: ChipValue
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      aria-hidden
      className={cn("poker-chip relative block size-4", className)}
      style={{ ["--chip" as string]: CHIP_COLORS[value], ...style }}
    />
  )
}

export function ChipCount({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const calm = useReducedMotion()
  const motion = useMotionValue(value)
  const shown = useTransform(motion, (current) =>
    formatChips(Math.round(current))
  )

  useEffect(() => {
    if (calm) {
      motion.set(value)
      return
    }
    const controls = animate(motion, value, { duration: 0.7, ease: "easeOut" })
    return () => controls.stop()
  }, [calm, motion, value])

  return <m.span className={cn("tabular-nums", className)}>{shown}</m.span>
}

export function ChipStack({
  amount,
  label = true,
  className,
}: {
  amount: number
  label?: boolean
  className?: string
}) {
  const chips = chipBreakdown(amount, STACK_LIMIT)
  return (
    <span className={cn("inline-flex items-end gap-1", className)}>
      <span className="relative flex h-6 w-4 flex-col-reverse items-center">
        {chips.map((value, index) => (
          <m.span
            key={`${index}-${value}`}
            initial={{ y: -10, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 520,
              damping: 22,
              delay: index * 0.04,
            }}
            className="absolute"
            style={{ bottom: index * 3 }}
          >
            <Chip value={value} />
          </m.span>
        ))}
      </span>
      {label && (
        <span className="rounded-full bg-black/55 px-1.5 text-xs leading-5 font-bold text-white tabular-nums">
          {formatChips(amount)}
        </span>
      )}
    </span>
  )
}
