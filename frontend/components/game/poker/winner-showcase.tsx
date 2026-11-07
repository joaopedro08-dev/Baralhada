"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, m } from "framer-motion"
import { Coins, Crown } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import { formatChips, HAND_NAMES } from "@/lib/game/domain/poker/guide"
import {
  categoryTitle,
  describeLevel,
  HAND_LADDER,
} from "@/lib/game/domain/poker/showcase"
import type { Showcase, ShowcaseTone } from "@/lib/game/domain/poker/showcase"
import { cardName } from "@/lib/game/domain/cards"
import type { Card } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const TONE_RINGS: Readonly<Record<ShowcaseTone, string>> = {
  good: "ring-emerald-400/80",
  bad: "ring-rose-400/70",
  neutral: "ring-gold/70",
}

const BANNER_DELAY_S = 0.35
const LADDER_DELAY_S = 0.8
const LADDER_STEP_S = 0.07
const CARDS_DELAY_S = 1.2
const COMPACT_AFTER_MS = 3600

function Marquee({ title }: { title: string }) {
  const letters = [...title.toUpperCase()]
  return (
    <m.div
      initial={{ scaleX: 0.3, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{
        delay: BANNER_DELAY_S,
        type: "spring",
        stiffness: 260,
        damping: 18,
      }}
      className="relative overflow-hidden rounded-xl bg-black/50 px-3 py-2 ring-2 ring-gold/80"
    >
      <span
        aria-hidden
        className="marquee-bulbs absolute inset-x-1 top-0.5 h-1.5"
      />
      <span
        aria-hidden
        className="marquee-bulbs absolute inset-x-1 bottom-0.5 h-1.5"
      />
      <p className="sheen text-center font-heading text-2xl leading-tight font-extrabold tracking-[0.18em] sm:text-3xl">
        {letters.map((letter, index) => (
          <m.span
            key={`${letter}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: BANNER_DELAY_S + 0.2 + index * 0.035 }}
            className="inline-block whitespace-pre"
          >
            {letter}
          </m.span>
        ))}
      </p>
    </m.div>
  )
}

function Ladder({ level }: { level: number }) {
  return (
    <div className="flex flex-col gap-1">
      <ol aria-hidden className="flex gap-1">
        {HAND_LADDER.map((category, index) => {
          const lit = index < level
          const reached = index === level - 1
          return (
            <m.li
              key={category}
              title={HAND_NAMES[category]}
              initial={{ opacity: 0.25, scaleY: 0.6 }}
              animate={{
                opacity: lit ? 1 : 0.25,
                scaleY: reached ? [1, 1.6, 1] : 1,
              }}
              transition={{
                delay: LADDER_DELAY_S + index * LADDER_STEP_S,
                duration: reached ? 0.5 : 0.2,
              }}
              className={cn(
                "h-2 flex-1 rounded-full",
                lit ? "bg-gold" : "bg-white/25",
                reached && "shadow-[0_0_10px_2px_var(--gold)]"
              )}
            />
          )
        })}
      </ol>
      <div className="flex justify-between text-[0.65rem] text-felt-muted">
        <span>carta alta</span>
        <span className="font-semibold text-gold">{describeLevel(level)}</span>
        <span>royal flush</span>
      </div>
    </div>
  )
}

function WinningCards({ cards }: { cards: readonly Card[] }) {
  return (
    <ul
      aria-label={`Cartas vencedoras: ${cards.map(cardName).join(", ")}`}
      className="flex justify-center gap-1 perspective-[600px]"
    >
      {cards.map((card, index) => (
        <m.li
          key={card}
          initial={{ rotateY: 90, y: 14, opacity: 0 }}
          animate={{ rotateY: 0, y: 0, opacity: 1 }}
          transition={{
            delay: CARDS_DELAY_S + index * 0.1,
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        >
          <CardFace
            card={card}
            size="pile"
            className="hint-best h-14 w-10 lg:h-14 lg:w-10 [&>span]:text-base lg:[&>span]:text-base [&>svg]:size-4 lg:[&>svg]:size-4"
          />
        </m.li>
      ))}
    </ul>
  )
}

function ShowcaseBody({ showcase }: { showcase: Showcase }) {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setCompact(true), COMPACT_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <m.span
          initial={{ rotate: -40, scale: 0.2 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 480, damping: 12 }}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-gold-foreground"
        >
          <Crown aria-hidden className="size-5" />
        </m.span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg leading-tight font-bold">
            {showcase.headline}
          </p>
          <ul className="flex flex-wrap gap-x-3 text-sm text-felt-muted">
            {showcase.winners.map((winner) => (
              <li key={winner.id} className="inline-flex items-center gap-1">
                <Coins aria-hidden className="size-3.5 text-gold" />
                {winner.label}
                <m.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                  className="font-semibold text-emerald-300 tabular-nums"
                >
                  +{formatChips(winner.amount)}
                </m.span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Marquee title={categoryTitle(showcase.category)} />
      <div
        className={cn(
          "grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-500",
          compact && "max-lg:grid-rows-[0fr] max-lg:opacity-0"
        )}
      >
        <div className="flex min-h-0 flex-col gap-2.5 overflow-hidden">
          {showcase.level !== null && <Ladder level={showcase.level} />}
          {showcase.cards.length > 0 && <WinningCards cards={showcase.cards} />}
          {showcase.notes.length > 0 && (
            <p className="text-center text-xs text-felt-muted">
              {showcase.notes.join(" ")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const describeForReaders = (showcase: Showcase): string =>
  [
    showcase.headline,
    showcase.category ? `com ${HAND_NAMES[showcase.category]}` : "",
    showcase.level !== null ? `(${describeLevel(showcase.level)})` : "",
    ...showcase.notes,
  ]
    .filter(Boolean)
    .join(" ")

export function WinnerShowcase({ showcase }: { showcase: Showcase | null }) {
  return (
    <>
      <p role="status" className="sr-only">
        {showcase ? describeForReaders(showcase) : ""}
      </p>
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4 lg:top-26 lg:left-auto lg:w-80 lg:px-3">
        <AnimatePresence mode="wait">
          {showcase && (
            <m.div
              key={showcase.key}
              aria-hidden
              initial={{ opacity: 0, y: -28, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className={cn(
                "w-full max-w-sm rounded-2xl bg-felt-deep/95 p-3 text-felt-foreground shadow-2xl ring-2 backdrop-blur",
                TONE_RINGS[showcase.tone]
              )}
            >
              <ShowcaseBody showcase={showcase} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
