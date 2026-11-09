"use client"

import { Menu, X } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { LeaveMatchButton } from "@/components/game/room/leave-button"
import { HintsToggle } from "@/components/game/table/hints-toggle"
import { HistoryList } from "@/components/game/table/history-list"
import { HowToPlay } from "@/components/game/table/how-to-play"
import { PauseToggle } from "@/components/game/table/pause-toggle"
import type { RuleSection } from "@/components/game/table/how-to-play"
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
import type { RoomState } from "@/lib/game/domain/types"

export function MatchMenu({
  room,
  subtitle,
  hintsEnabled,
  onHintsChange,
  hintsReady,
  hintsContent,
  rules,
  history,
  historyTitle,
  leaveNotice,
}: {
  room: RoomState
  subtitle: string
  hintsEnabled: boolean
  onHintsChange: (enabled: boolean) => void
  hintsReady: boolean
  hintsContent: React.ReactNode
  rules: readonly RuleSection[]
  history: readonly string[]
  historyTitle: string
  leaveNotice: string
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
              Sala <span className="font-mono">{room.code}</span> · {subtitle}
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
            {hintsContent}
            {room.hintsAllowed && hintsEnabled && !hintsReady && (
              <p className="text-sm text-muted-foreground">
                As dicas aparecem na sua vez.
              </p>
            )}
          </section>

          <Separator />

          <PauseToggle room={room} />

          <Separator />

          <section className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold">Como jogar</h3>
            <HowToPlay sections={rules} />
          </section>

          <Separator />

          <div className="lg:hidden">
            <section className="flex flex-col gap-2">
              <h3 className="font-heading text-sm font-semibold">
                {historyTitle}
              </h3>
              <HistoryList history={history} />
            </section>
          </div>

          <LeaveMatchButton className="w-full" notice={leaveNotice} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
