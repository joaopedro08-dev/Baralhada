"use client"

import { Menu, X } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { LeaveMatchButton } from "@/components/game/room/leave-button"
import { HistoryList } from "@/components/game/table/history-list"
import { HintsToggle } from "@/components/game/table/hints-toggle"
import { HowToPlay } from "@/components/game/table/how-to-play"
import { PauseToggle } from "@/components/game/table/pause-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { GameState, Hints, RoomState } from "@/lib/game/domain/types"

function MenuSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-heading text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function CardCounter({ hints }: { hints: Hints }) {
  return (
    <ul className="grid grid-cols-7 gap-1 text-center text-xs">
      {hints.cardCounts.map(({ rank, missing }) => (
        <li key={rank} className="rounded-md bg-muted py-1">
          <span className="block font-heading text-sm font-bold">{rank}</span>
          <span className="text-muted-foreground">faltam {missing}</span>
        </li>
      ))}
    </ul>
  )
}

export function GameMenu({
  room,
  game,
  hints,
  hintsEnabled,
  onHintsChange,
}: {
  room: RoomState
  game: GameState
  hints: Hints | null
  hintsEnabled: boolean
  onHintsChange: (enabled: boolean) => void
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <GameButton aria-label="Abrir menu" className="px-0">
          <Menu aria-hidden />
        </GameButton>
      </SheetTrigger>
      <SheetContent
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto sm:max-w-sm"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 p-4 pb-2">
          <div>
            <SheetTitle className="text-lg">Menu</SheetTitle>
            <SheetDescription className="text-sm">
              Sala <span className="font-mono">{room.code}</span> · turno{" "}
              {game.turnNumber}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              aria-label="Fechar menu"
              className="size-11"
            >
              <X aria-hidden className="size-5" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4 pt-2">
          <MenuSection title="Dicas">
            <HintsToggle
              allowed={room.hintsAllowed}
              enabled={hintsEnabled}
              onChange={onHintsChange}
            />
            {hints && hints.plays.length > 0 && (
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                {hints.plays.map((play) => (
                  <li key={play.sentence}>{play.sentence}</li>
                ))}
              </ol>
            )}
            {hints && <CardCounter hints={hints} />}
          </MenuSection>

          <Separator />

          <PauseToggle room={room} />

          <Separator />

          <MenuSection title="Como jogar">
            <HowToPlay />
          </MenuSection>

          <Separator />

          <div className="lg:hidden">
            <MenuSection title="Histórico de jogadas">
              <HistoryList history={game.history} />
            </MenuSection>
          </div>

          <LeaveMatchButton className="w-full" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
