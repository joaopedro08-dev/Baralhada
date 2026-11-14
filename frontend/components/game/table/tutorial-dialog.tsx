"use client"

import { useState } from "react"

import { HowToPlay } from "@/components/game/table/how-to-play"
import type { RuleSection } from "@/components/game/table/how-to-play"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { GameId } from "@/lib/game/domain/types"
import {
  hasSeenTutorial,
  markAllTutorialsSeen,
  markTutorialSeen,
  loadPlayerPreferences,
} from "@/lib/game/infrastructure/player-preferences"

export function TutorialDialog({
  gameId,
  gameName,
  sections,
  autoOpen = false,
  showTrigger = true,
}: {
  gameId: GameId
  gameName: string
  sections: readonly RuleSection[]
  autoOpen?: boolean
  showTrigger?: boolean
}) {
  const [open, setOpen] = useState(
    () =>
      autoOpen &&
      loadPlayerPreferences().tutorialAutoOpen &&
      !hasSeenTutorial(gameId)
  )

  const closeTutorial = (all = false) => {
    if (all) markAllTutorialsSeen()
    else markTutorialSeen(gameId)
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && open) {
      closeTutorial()
      return
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="min-h-11 w-full">
            Rever tutorial
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[min(42rem,calc(100dvh-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Como jogar {gameName}</DialogTitle>
          <DialogDescription>
            Um resumo rápido. Você pode fechar e rever pelo menu a qualquer momento.
          </DialogDescription>
        </DialogHeader>
        <HowToPlay sections={sections} />
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button className="min-h-11" onClick={() => closeTutorial()}>
            Pular tutorial
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => closeTutorial(true)}
          >
            Não mostrar de novo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
