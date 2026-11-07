"use client"

import { AnimatePresence, m } from "framer-motion"

import {
  DealtCard,
  FlipCard,
  HiddenCard,
  overlapOf,
} from "@/components/game/blackjack/blackjack-cards"
import {
  dealerLabel,
  roundLabel,
  TWENTY_ONE,
} from "@/lib/game/domain/blackjack/guide"
import type { BlackjackState } from "@/lib/game/domain/blackjack/types"
import { cn } from "@/lib/utils"

const ARC_ID = "blackjack-arc"

function FeltArc() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 90"
      className="pointer-events-none absolute bottom-1 left-1/2 h-14 w-auto -translate-x-1/2 opacity-75 sm:h-16"
    >
      <defs>
        <path id={ARC_ID} d="M 16 14 Q 200 104 384 14" fill="none" />
      </defs>
      <path
        d="M 6 6 Q 200 112 394 6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeDasharray="2 6"
        className="text-gold"
      />
      <text className="fill-gold font-heading text-[15px] font-bold tracking-[0.18em] uppercase">
        <textPath href={`#${ARC_ID}`} startOffset="50%" textAnchor="middle">
          Paga 3 para 2 · banca para no 17
        </textPath>
      </text>
    </svg>
  )
}

function RoundTrack({ game }: { game: BlackjackState }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-heading text-xs font-semibold tracking-[0.2em] text-felt-muted uppercase">
        {roundLabel(game)}
      </span>
      <ol aria-hidden className="flex gap-1">
        {Array.from({ length: game.rounds }, (_, index) => (
          <li
            key={index}
            className={cn(
              "h-1.5 w-4 rounded-full transition-colors",
              index < game.round - 1 && "bg-gold/70",
              index === game.round - 1 &&
                "bg-gold shadow-[0_0_8px_var(--gold)]",
              index >= game.round && "bg-white/20"
            )}
          />
        ))}
      </ol>
    </div>
  )
}

export function DealerZone({ game }: { game: BlackjackState }) {
  const { dealer } = game
  const [up, ...rest] = dealer.cards
  const bust = dealer.hidden === 0 && dealer.total > TWENTY_ONE
  return (
    <section
      aria-label="Banca"
      className="relative flex shrink-0 flex-col items-center gap-3 overflow-hidden rounded-t-2xl rounded-b-[3rem] bg-felt-deep/40 px-3 pt-3 pb-16 ring-1 ring-felt-line sm:pb-20"
    >
      <RoundTrack game={game} />
      <div className="flex min-h-[4.5rem] items-end justify-center lg:min-h-20">
        <ul className="flex items-end">
          {up && (
            <DealtCard
              key={`${game.round}-${up}`}
              card={up}
              index={0}
              size="medium"
            />
          )}
          {dealer.hidden > 0 && (
            <li className={overlapOf("medium")}>
              <HiddenCard size="medium" />
            </li>
          )}
          {rest.map((card, index) => (
            <li key={`${game.round}-${card}`} className={overlapOf("medium")}>
              {index === 0 ? (
                <FlipCard card={card} size="medium" />
              ) : (
                <m.div
                  initial={{ y: -80, x: 60, rotate: -20, opacity: 0 }}
                  animate={{ y: 0, x: 0, rotate: 2, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                >
                  <FlipCard card={card} size="medium" />
                </m.div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <AnimatePresence mode="wait">
        <m.p
          key={dealerLabel(game)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className={cn(
            "rounded-full px-3 py-1 font-heading text-sm font-bold ring-1",
            bust
              ? "bg-rose-500/20 text-rose-200 ring-rose-400/60"
              : "bg-black/40 text-felt-foreground ring-felt-line"
          )}
        >
          Banca · {dealerLabel(game)}
        </m.p>
      </AnimatePresence>
      <FeltArc />
    </section>
  )
}
