"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import type { Card, GameId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const PREVIEW_CARD = "h-16 w-12 sm:h-[4.75rem] sm:w-14"
const SPRING = { type: "spring", stiffness: 160, damping: 20 } as const

const useLoopStep = (count: number, intervalMs: number) => {
  const stage = useRef<HTMLDivElement>(null)
  const visible = useInView(stage, { margin: "-15%" })
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!visible || reduced) return
    const timer = setInterval(
      () => setStep((current) => (current + 1) % count),
      intervalMs
    )
    return () => clearInterval(timer)
  }, [visible, reduced, count, intervalMs])

  return [stage, reduced ? count - 1 : step] as const
}

function Callout({ show, children }: { show: boolean; children: string }) {
  return (
    <AnimatePresence>
      {show && (
        <m.span
          initial={{ opacity: 0, scale: 0.6, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={SPRING}
          className="absolute top-3 right-3 rounded-full bg-gold px-3 py-1 font-heading text-sm font-bold text-gold-foreground shadow-lg"
        >
          {children}
        </m.span>
      )}
    </AnimatePresence>
  )
}

function Spot({
  left,
  top,
  children,
  className,
}: {
  left: string
  top: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <m.div
      className={cn("absolute -translate-x-1/2 -translate-y-1/2", className)}
      initial={false}
      animate={{ left, top }}
      transition={SPRING}
    >
      {children}
    </m.div>
  )
}

const ROUBA_TABLE: readonly Card[] = ["3D", "7C", "KH", "9S"]

function RoubaMontePreview() {
  const [stage, step] = useLoopStep(4, 1400)
  const captured = step >= 2
  return (
    <div ref={stage} className="absolute inset-0">
      {ROUBA_TABLE.map((card, index) => {
        const target = card === "7C"
        if (target && captured) return null
        return (
          <Spot key={card} left={`${16 + index * 17}%`} top="34%">
            <CardFace
              card={card}
              size="flying"
              className={cn(PREVIEW_CARD, target && step === 1 && "hint-best")}
            />
          </Spot>
        )
      })}
      <Spot left="84%" top="70%" className="flex flex-col items-center gap-1">
        <div className="relative">
          <CardBack className={cn(PREVIEW_CARD, "absolute top-1 left-1")} />
          <CardFace
            card={captured ? "7H" : "QC"}
            size="flying"
            className={cn(PREVIEW_CARD, "relative")}
          />
        </div>
        <span className="text-xs font-semibold text-felt-muted">Seu monte</span>
      </Spot>
      {!captured && (
        <Spot
          left={step === 1 ? "33%" : "45%"}
          top={step === 1 ? "52%" : "76%"}
        >
          <CardFace card="7H" size="flying" className={PREVIEW_CARD} />
        </Spot>
      )}
      <Callout show={step === 3}>+2 cartas no monte</Callout>
    </div>
  )
}

function TrucoPreview() {
  const [stage, step] = useLoopStep(5, 1300)
  return (
    <div ref={stage} className="absolute inset-0">
      <Spot left="14%" top="30%" className="flex flex-col items-center gap-1">
        <CardFace card="JH" size="flying" className={PREVIEW_CARD} />
        <span className="text-xs font-semibold text-felt-muted">Vira</span>
      </Spot>
      <span className="absolute bottom-3 left-3 rounded-full bg-felt-deep/80 px-2.5 py-1 text-xs font-semibold ring-1 ring-felt-line">
        Manilha: K
      </span>
      <Spot left="54%" top={step >= 1 ? "36%" : "-30%"}>
        <CardFace card="AS" size="flying" className={PREVIEW_CARD} />
      </Spot>
      <Spot left="62%" top={step >= 2 ? "58%" : "130%"}>
        <CardFace
          card="KC"
          size="flying"
          className={cn(PREVIEW_CARD, step >= 2 && "hint-best")}
        />
      </Spot>
      <AnimatePresence>
        {step === 3 && (
          <m.span
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={SPRING}
            className="absolute top-[18%] left-[28%] rounded-lg bg-suit-red px-3 py-1 font-heading text-2xl font-extrabold text-white uppercase shadow-xl"
          >
            Truco!
          </m.span>
        )}
      </AnimatePresence>
      <Callout show={step === 4}>Manilha de paus leva</Callout>
    </div>
  )
}

const TRINCAS: readonly (readonly Card[])[] = [
  ["9C", "9H", "2D"],
  ["KS", "KD", "KH"],
  ["5C", "5S", "2H"],
]

function TresTrincasPreview() {
  const [stage, step] = useLoopStep(4, 1300)
  return (
    <div
      ref={stage}
      className="absolute inset-0 flex items-center justify-center gap-3 px-3 sm:gap-6"
    >
      {TRINCAS.map((group, groupIndex) => (
        <AnimatePresence key={group.join()}>
          {step >= groupIndex && (
            <m.div
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={SPRING}
              className="flex -space-x-8"
            >
              {group.map((card, index) => (
                <CardFace
                  key={card}
                  card={card}
                  size="flying"
                  className={cn(
                    PREVIEW_CARD,
                    index === 0 && "-rotate-6",
                    index === 2 && "rotate-6",
                    card.startsWith("2") && "hint-possible"
                  )}
                />
              ))}
            </m.div>
          )}
        </AnimatePresence>
      ))}
      <span className="absolute bottom-3 left-3 rounded-full bg-felt-deep/80 px-2.5 py-1 text-xs font-semibold ring-1 ring-felt-line">
        O 2 é coringa
      </span>
      <Callout show={step === 3}>Bateu com 3 trincas!</Callout>
    </div>
  )
}

const BOARD: readonly Card[] = ["QS", "JS", "4D", "10S", "2H"]

function PokerPreview() {
  const [stage, step] = useLoopStep(5, 1400)
  const shown = step === 0 ? 0 : step === 1 ? 3 : step === 2 ? 4 : 5
  return (
    <div ref={stage} className="absolute inset-0">
      <div className="absolute top-[34%] left-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1 sm:gap-1.5">
        {BOARD.map((card, index) => (
          <div key={card} className="[perspective:600px]">
            {index < shown ? (
              <m.div
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.35 }}
              >
                <CardFace card={card} size="flying" className={PREVIEW_CARD} />
              </m.div>
            ) : (
              <div
                className={cn(
                  PREVIEW_CARD,
                  "rounded-lg border-2 border-dashed border-felt-line/70"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 -space-x-5">
        <CardFace
          card="AS"
          size="flying"
          className={cn(PREVIEW_CARD, "-rotate-6")}
        />
        <CardFace
          card="KS"
          size="flying"
          className={cn(PREVIEW_CARD, "rotate-6")}
        />
      </div>
      <div className="absolute bottom-5 left-4 flex items-center gap-1.5">
        <span className="relative flex">
          {[
            "oklch(0.55 0.2 27)",
            "oklch(0.27 0.02 260)",
            "oklch(0.78 0.15 85)",
          ].map((color, index) => (
            <span
              key={color}
              className="poker-chip relative -ml-2 block size-5 first:ml-0"
              style={{ "--chip": color, zIndex: index } as React.CSSProperties}
            />
          ))}
        </span>
        <span className="text-xs font-semibold text-felt-muted">
          Pote {120 + shown * 40}
        </span>
      </div>
      <Callout show={step === 4}>Royal flush!</Callout>
    </div>
  )
}

const CACHETA_MELDS: readonly (readonly Card[])[] = [
  ["7H", "7C", "7D"],
  ["4S", "5S", "6S"],
  ["9D", "10D", "JD"],
]
const CACHETA_SHUFFLE = [4, 0, 7, 2, 8, 5, 1, 6, 3]

function CachetaPreview() {
  const [stage, step] = useLoopStep(4, 1500)
  const grouped = step >= 1
  return (
    <div ref={stage} className="absolute inset-0">
      <Spot left="14%" top="27%" className="flex flex-col items-center gap-1">
        <CardFace card="5C" size="flying" className={PREVIEW_CARD} />
        <span className="text-xs font-semibold text-felt-muted">Vira</span>
      </Spot>
      <span className="absolute top-[22%] left-[26%] rounded-full bg-felt-deep/80 px-2.5 py-1 text-xs font-semibold ring-1 ring-felt-line">
        Coringa: 6
      </span>
      {CACHETA_MELDS.flatMap((meld, group) =>
        meld.map((card, index) => {
          const slot = CACHETA_SHUFFLE[group * 3 + index] ?? 0
          return (
            <Spot
              key={card}
              left={
                grouped
                  ? `${16 + group * 31 + index * 7}%`
                  : `${10 + slot * 10}%`
              }
              top={grouped ? "66%" : `${64 + (slot % 2) * 6}%`}
            >
              <CardFace
                card={card}
                size="flying"
                className={cn(
                  PREVIEW_CARD,
                  step >= 2 && "hint-best",
                  card === "6S" && "hint-possible"
                )}
              />
            </Spot>
          )
        })
      )}
      <Callout show={step === 3}>Bateu limpo! −2 pontos</Callout>
    </div>
  )
}

function BlackjackPreview() {
  const [stage, step] = useLoopStep(4, 1400)
  return (
    <div ref={stage} className="absolute inset-0">
      <span className="absolute top-[9%] left-1/2 -translate-x-1/2 rounded-full bg-felt-deep/80 px-2.5 py-1 text-xs font-semibold ring-1 ring-felt-line">
        Banca para no 17
      </span>
      <Spot left="44%" top="38%">
        <CardFace card="7D" size="flying" className={PREVIEW_CARD} />
      </Spot>
      <Spot left="56%" top="38%">
        <div className="[perspective:600px]">
          <m.div
            initial={false}
            animate={{ rotateY: step >= 3 ? 0 : 180 }}
            transition={{ duration: 0.5 }}
            className="relative [transform-style:preserve-3d]"
          >
            <CardFace
              card="QC"
              size="flying"
              className={cn(PREVIEW_CARD, "[backface-visibility:hidden]")}
            />
            <CardBack
              className={cn(
                PREVIEW_CARD,
                "absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]"
              )}
            />
          </m.div>
        </div>
      </Spot>
      <Spot left="44%" top={step >= 1 ? "76%" : "130%"}>
        <CardFace
          card="AS"
          size="flying"
          className={cn(PREVIEW_CARD, "-rotate-6", step >= 2 && "hint-best")}
        />
      </Spot>
      <Spot left="56%" top={step >= 1 ? "76%" : "130%"}>
        <CardFace
          card="KH"
          size="flying"
          className={cn(PREVIEW_CARD, "rotate-6", step >= 2 && "hint-best")}
        />
      </Spot>
      <span className="absolute bottom-3 left-3 rounded-full bg-felt-deep/80 px-2.5 py-1 text-xs font-semibold ring-1 ring-felt-line">
        {step >= 2 ? "21" : "Aposta 100"}
      </span>
      <Callout show={step >= 2}>Blackjack! +150</Callout>
    </div>
  )
}

const PREVIEWS: Readonly<Record<GameId, () => React.ReactNode>> = {
  "rouba-monte": RoubaMontePreview,
  "truco-paulista": TrucoPreview,
  "tres-trincas": TresTrincasPreview,
  "poker-texas-holdem": PokerPreview,
  cacheta: CachetaPreview,
  blackjack: BlackjackPreview,
}

export function GamePreview({
  gameId,
  className,
}: {
  gameId: GameId
  className?: string
}) {
  const Preview = PREVIEWS[gameId]
  return (
    <div
      aria-hidden
      className={cn(
        "felt-table relative aspect-[16/11] w-full overflow-hidden rounded-[1.75rem] shadow-[inset_0_0_2.5rem_rgb(0_0_0/0.35)] ring-8 ring-(--poker-rail) sm:aspect-[16/10]",
        className
      )}
    >
      <div className="poker-felt-line absolute inset-[7%]" />
      <Preview />
    </div>
  )
}
