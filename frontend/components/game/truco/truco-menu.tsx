"use client"

import { Menu, X } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { LeaveMatchButton } from "@/components/game/room/leave-button"
import { HistoryList } from "@/components/game/table/history-list"
import { HintsToggle } from "@/components/game/table/hints-toggle"
import { HowToPlay } from "@/components/game/table/how-to-play"
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
import { cardName, rankName } from "@/lib/game/domain/cards"
import { TRUCO_RULE_SECTIONS } from "@/lib/game/domain/truco/how-to-play"
import type { TrucoHints, TrucoState } from "@/lib/game/domain/truco/types"
import type { RoomState, Suit } from "@/lib/game/domain/types"

const LEAVE_NOTICE =
  "Se você sair agora, o seu time perde e a partida termina para todos."

const SUIT_LABELS: Readonly<Record<Suit, string>> = {
  C: "paus",
  H: "copas",
  S: "espadas",
  D: "ouros",
}

function StrengthRuler({ hints }: { hints: TrucoHints }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Da mais fraca à mais forte:{" "}
        <span className="font-semibold">
          {hints.order.map(rankName).join(", ")}
        </span>
        , e no topo a manilha{" "}
        <span className="font-semibold">{rankName(hints.manilha)}</span> (
        {[...hints.manilhaSuits]
          .reverse()
          .map((suit) => SUIT_LABELS[suit])
          .join(", ")}
        ).
      </p>
      {hints.hand.length > 0 && (
        <ul className="flex flex-col gap-1">
          {hints.hand.map((entry) => (
            <li key={entry.card} className="flex justify-between gap-2">
              <span>
                {cardName(entry.card)}
                {entry.manilha && " (manilha)"}
              </span>
              <span className="text-muted-foreground tabular-nums">
                força {entry.position} de 13
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TrucoMenu({
  room,
  game,
  hints,
  hintsEnabled,
  onHintsChange,
}: {
  room: RoomState
  game: TrucoState
  hints: TrucoHints | null
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
              Sala <span className="font-mono">{room.code}</span> · mão{" "}
              {game.handNumber}
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
          <section className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold">Dicas</h3>
            <HintsToggle
              allowed={room.hintsAllowed}
              enabled={hintsEnabled}
              onChange={onHintsChange}
            />
            {hints && hints.suggestions.length > 0 && (
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                {hints.suggestions.map((suggestion) => (
                  <li key={suggestion.sentence}>{suggestion.sentence}</li>
                ))}
              </ol>
            )}
            {hints && <StrengthRuler hints={hints} />}
            {room.hintsAllowed && hintsEnabled && !hints && (
              <p className="text-sm text-muted-foreground">
                As dicas aparecem na sua vez.
              </p>
            )}
          </section>

          <Separator />

          <section className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold">Como jogar</h3>
            <HowToPlay sections={TRUCO_RULE_SECTIONS} />
          </section>

          <Separator />

          <div className="lg:hidden">
            <section className="flex flex-col gap-2">
              <h3 className="font-heading text-sm font-semibold">
                Histórico da mão
              </h3>
              <HistoryList history={game.history} />
            </section>
          </div>

          <LeaveMatchButton className="w-full" notice={LEAVE_NOTICE} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
