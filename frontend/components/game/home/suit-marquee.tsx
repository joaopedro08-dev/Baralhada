import { SuitIcon } from "@/components/game/cards/card-face"
import { GAME_IDENTITY } from "@/components/game/game-identity"
import { GAMES } from "@/lib/game/domain/catalog"

const WORDS = [
  ...GAMES.map((game) => ({
    label: game.name,
    suit: GAME_IDENTITY[game.id].suit,
  })),
  { label: "Sem cadastro", suit: "S" as const },
  { label: "Tempo real", suit: "H" as const },
  { label: "No PC ou no celular", suit: "D" as const },
]

function Strip() {
  return (
    <ul className="flex shrink-0 items-center gap-8 pr-8">
      {WORDS.map(({ label, suit }) => (
        <li
          key={label}
          className="flex items-center gap-3 font-heading text-lg font-bold whitespace-nowrap text-felt-foreground/90 sm:text-xl"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-playing-card shadow">
            <SuitIcon suit={suit} className="size-4" />
          </span>
          {label}
        </li>
      ))}
    </ul>
  )
}

export function SuitMarquee() {
  return (
    <div
      aria-hidden
      className="relative -mx-4 overflow-hidden border-y border-felt-line/60 bg-felt-deep/70 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)] py-4"
    >
      <div className="suit-marquee flex w-max">
        <Strip />
        <Strip />
      </div>
    </div>
  )
}
