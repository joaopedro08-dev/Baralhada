"use client"

import { useCallback, useEffect, useState } from "react"
import {
  animate,
  AnimatePresence,
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion"
import { Flame, Sparkles, TrendingDown, X } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import type {
  NoticeTone,
  ScoreLine,
  ScoreNotice,
} from "@/lib/game/domain/score-notice"
import { trucoNotice } from "@/lib/game/domain/score-notice"
import type { TrucoState } from "@/lib/game/domain/truco/types"
import { cn } from "@/lib/utils"

const NOTICE_MS = 4200
const COUNT_DELAY_S = 0.35

const TONES: Readonly<
  Record<NoticeTone, { ring: string; badge: string; icon: typeof Sparkles }>
> = {
  good: {
    ring: "ring-emerald-400/70",
    badge: "bg-emerald-400 text-emerald-950",
    icon: Sparkles,
  },
  bad: {
    ring: "ring-rose-400/70",
    badge: "bg-rose-400 text-rose-950",
    icon: TrendingDown,
  },
  neutral: {
    ring: "ring-gold/60",
    badge: "bg-gold text-gold-foreground",
    icon: Flame,
  },
}

export const useScoreNotice = () => {
  const [notice, setNotice] = useState<ScoreNotice | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const dismiss = useCallback(() => setNotice(null), [])
  return { notice, show: setNotice, dismiss }
}

export const useStateNotice = <State,>(
  state: State,
  compute: (previous: State, next: State) => ScoreNotice | null
) => {
  const { notice, show, dismiss } = useScoreNotice()
  const [seen, setSeen] = useState(state)

  if (seen !== state) {
    setSeen(state)
    const next = compute(seen, state)
    if (next) show(next)
  }

  return { notice, dismiss }
}

export const useTrucoNotice = (game: TrucoState) =>
  useStateNotice(game, trucoNotice)

function CountingNumber({ from, to }: { from: number; to: number }) {
  const calm = useReducedMotion()
  const value = useMotionValue(calm ? to : from)
  const shown = useTransform(value, (current) => Math.round(current))

  useEffect(() => {
    if (calm) return
    const controls = animate(value, to, {
      delay: COUNT_DELAY_S,
      duration: 0.6,
      ease: "easeOut",
    })
    return () => controls.stop()
  }, [calm, to, value])

  return <m.span className="tabular-nums">{shown}</m.span>
}

function Line({ line }: { line: ScoreLine }) {
  const changed = line.before !== line.value
  return (
    <li
      className={cn(
        "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5",
        line.mine ? "bg-felt" : "bg-black/25",
        line.lead && "ring-1 ring-gold"
      )}
    >
      <span className="truncate text-sm font-medium">{line.label}</span>
      <m.span
        className={cn(
          "font-heading text-xl font-extrabold",
          line.lead && "text-gold"
        )}
        animate={changed ? { scale: [1, 1.35, 1] } : undefined}
        transition={{ delay: COUNT_DELAY_S + 0.45, duration: 0.4 }}
      >
        <CountingNumber from={line.before} to={line.value} />
      </m.span>
    </li>
  )
}

export function LiveScore({
  notice,
  onDismiss,
}: {
  notice: ScoreNotice | null
  onDismiss: () => void
}) {
  return (
    <>
      <p role="status" className="sr-only">
        {notice ? `${notice.title}. ${notice.detail}` : ""}
      </p>
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
        <AnimatePresence mode="wait">
          {notice && (
            <m.div
              key={notice.key}
              aria-hidden
              layout
              initial={{ opacity: 0, y: -24, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className={cn(
                "pointer-events-auto w-full max-w-sm rounded-2xl bg-felt-deep/95 p-3 text-felt-foreground shadow-2xl ring-2 backdrop-blur",
                TONES[notice.tone].ring
              )}
            >
              <NoticeBody notice={notice} onDismiss={onDismiss} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

function NoticeBody({
  notice,
  onDismiss,
}: {
  notice: ScoreNotice
  onDismiss: () => void
}) {
  const tone = TONES[notice.tone]
  const Icon = tone.icon
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        <m.span
          initial={{ rotate: -30, scale: 0.4 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 14 }}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            tone.badge
          )}
        >
          <Icon aria-hidden className="size-5" />
        </m.span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg leading-tight font-bold">
            {notice.title}
          </p>
          <p className="text-sm text-felt-muted">{notice.detail}</p>
        </div>
        <button
          type="button"
          tabIndex={-1}
          onClick={onDismiss}
          className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-full text-felt-muted hover:bg-white/10 hover:text-felt-foreground"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      {notice.cards.length > 0 && (
        <ul className="flex justify-center gap-1.5">
          {notice.cards.map((card, position) => (
            <m.li
              key={card}
              initial={{ rotateY: 90, y: 10, opacity: 0 }}
              animate={{ rotateY: 0, y: 0, opacity: 1 }}
              transition={{ delay: 0.15 + position * 0.12 }}
            >
              <CardFace card={card} size="pile" className="h-14 w-10" />
            </m.li>
          ))}
        </ul>
      )}
      <ul className="flex gap-2">
        {notice.lines.map((line) => (
          <Line key={line.id} line={line} />
        ))}
      </ul>
    </div>
  )
}
