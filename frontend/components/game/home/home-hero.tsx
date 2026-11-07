"use client"

import {
  AnimatePresence,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion"
import { Check, Hand, Smartphone, UserRoundX, Users, Zap } from "lucide-react"

import { SuitIcon } from "@/components/game/cards/card-face"
import { GAME_IDENTITY } from "@/components/game/game-identity"
import { Badge } from "@/components/ui/badge"
import { GAMES } from "@/lib/game/domain/catalog"
import type { GameInfo } from "@/lib/game/domain/catalog"
import type { GameId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const FAN_ANGLES = [-15, -5, 5, 15] as const
const FAN_LEFTS = ["20%", "40%", "60%", "80%"] as const

const PERKS = [
  { icon: Zap, label: "Tempo real" },
  { icon: UserRoundX, label: "Sem cadastro" },
  { icon: Smartphone, label: "PC ou celular" },
] as const

const playerRange = ({ playerCounts }: GameInfo): string =>
  `${playerCounts[0]}–${playerCounts.at(-1)}`

function GameCard({ game, selected }: { game: GameInfo; selected: boolean }) {
  const { suit, short } = GAME_IDENTITY[game.id]
  return (
    <span
      className={cn(
        "relative flex h-[8.25rem] w-24 flex-col justify-between rounded-xl bg-playing-card p-2 text-left text-suit-black shadow-xl ring-1 ring-black/20 transition-shadow sm:h-44 sm:w-32 sm:p-2.5",
        selected && "ring-4 shadow-gold/40 ring-gold"
      )}
    >
      <span className="flex items-start justify-between">
        <SuitIcon suit={suit} className="size-4 sm:size-5" />
        {selected && (
          <Check
            aria-hidden
            className="size-5 rounded-full bg-gold p-0.5 text-gold-foreground"
          />
        )}
      </span>
      <SuitIcon suit={suit} className="mx-auto size-9 sm:size-12" />
      <span className="flex flex-col gap-0.5">
        <span className="font-heading text-[0.8rem] leading-tight font-bold sm:text-sm">
          {short}
        </span>
        <span className="flex items-center gap-1 text-[0.7rem] font-medium text-suit-black/70 sm:text-xs">
          <Users aria-hidden className="size-3" />
          {playerRange(game)}
        </span>
      </span>
    </span>
  )
}

function GameFan({
  gameId,
  onChoose,
}: {
  gameId: GameId
  onChoose: (gameId: GameId) => void
}) {
  const reduced = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const springX = useSpring(pointerX, { stiffness: 120, damping: 18 })
  const springY = useSpring(pointerY, { stiffness: 120, damping: 18 })
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10])
  const rotateX = useTransform(springY, [-0.5, 0.5], [8, -8])

  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== "mouse") return
    const box = event.currentTarget.getBoundingClientRect()
    pointerX.set((event.clientX - box.left) / box.width - 0.5)
    pointerY.set((event.clientY - box.top) / box.height - 0.5)
  }

  const settle = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <div
      onPointerMove={track}
      onPointerLeave={settle}
      className="mx-auto w-full max-w-[19.5rem] [perspective:900px] sm:max-w-[27rem] lg:mx-0"
    >
      <m.div
        role="group"
        aria-label="Escolha o jogo da nova sala"
        style={{ rotateX, rotateY }}
        className="relative h-48 w-full [transform-style:preserve-3d] sm:h-60"
      >
        {GAMES.map((game, index) => {
          const selected = game.id === gameId
          return (
            <m.button
              key={game.id}
              type="button"
              aria-pressed={selected}
              aria-label={`Escolher ${game.name}`}
              onClick={() => onChoose(game.id)}
              className="absolute bottom-2 -ml-12 origin-bottom rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-sky-400 sm:-ml-16"
              style={{ left: FAN_LEFTS[index], zIndex: selected ? 10 : index }}
              initial={{ opacity: 0, y: 70, rotate: 0 }}
              animate={{
                opacity: 1,
                y: selected ? -26 : 0,
                rotate: FAN_ANGLES[index],
              }}
              whileHover={{ y: selected ? -30 : -14 }}
              whileTap={{ scale: 0.96 }}
              transition={{
                type: "spring",
                stiffness: 210,
                damping: 18,
                delay: 0.05 * index,
              }}
            >
              <GameCard game={game} selected={selected} />
            </m.button>
          )
        })}
      </m.div>
    </div>
  )
}

export function HomeHero({
  gameId,
  onChoose,
}: {
  gameId: GameId
  onChoose: (gameId: GameId) => void
}) {
  const { short, accent } = GAME_IDENTITY[gameId]

  return (
    <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
      <Badge
        variant="outline"
        className="h-8 gap-2 border-gold/60 bg-felt-deep/60 px-3 text-sm text-felt-foreground"
      >
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-gold" />
        </span>
        Baralho online com os amigos
      </Badge>

      <h1 className="font-heading text-[2.75rem] leading-[0.95] font-extrabold tracking-tight sm:text-6xl xl:text-7xl short:text-4xl">
        <span className="sr-only">Baralhada: </span>
        Hoje tem
        <span className="relative grid overflow-hidden">
          {Object.values(GAME_IDENTITY).map((identity) => (
            <span
              key={identity.short}
              aria-hidden
              className="invisible col-start-1 row-start-1 whitespace-nowrap"
            >
              {identity.short}
            </span>
          ))}
          <AnimatePresence initial={false}>
            <m.span
              key={gameId}
              initial={{ y: "105%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-105%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className={cn(
                "absolute inset-x-0 top-0 block whitespace-nowrap",
                accent
              )}
            >
              {short}
            </m.span>
          </AnimatePresence>
        </span>
        na mesa.
      </h1>

      <p className="max-w-md text-base/relaxed text-balance text-felt-muted sm:text-lg short:hidden">
        Crie uma sala, mande o código no grupo e jogue Rouba Monte, Truco, Três
        Trincas, Poker, Cacheta ou Blackjack em segundos, cada um no seu
        aparelho.
      </p>

      <div className="flex w-full flex-col items-center gap-2 lg:items-start short:hidden">
        <GameFan gameId={gameId} onChoose={onChoose} />
        <p className="flex items-center gap-1.5 text-sm text-felt-muted">
          <Hand aria-hidden className="size-4 text-gold" />
          Puxe uma carta para escolher o jogo
        </p>
      </div>

      <ul className="flex flex-wrap justify-center gap-2 lg:justify-start">
        {PERKS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-1.5 rounded-full bg-felt-deep/80 px-3 py-1.5 text-sm font-medium ring-1 ring-felt-line"
          >
            <Icon aria-hidden className="size-4 text-gold" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
