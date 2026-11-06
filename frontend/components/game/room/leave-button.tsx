"use client"

import { LogOut } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { gameSession } from "@/lib/game/session"

const ROUBA_MONTE_LEAVE_NOTICE =
  "Sua mão e seu monte voltam para o baralho de compra. Você só pode entrar de novo quando esta partida terminar."

export function LeaveMatchButton({
  className,
  notice = ROUBA_MONTE_LEAVE_NOTICE,
}: {
  className?: string
  notice?: string
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <GameButton tone="panel" variant="outline" className={className}>
          <LogOut aria-hidden />
          Sair da partida
        </GameButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            Sair da partida?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm/relaxed">
            {notice}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 text-sm">
            Continuar jogando
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-11 text-sm"
            onClick={() => void gameSession.leaveRoom()}
          >
            Sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function LeaveRoomButton({ className }: { className?: string }) {
  return (
    <GameButton
      tone="panel"
      variant="ghost"
      onClick={() => void gameSession.leaveRoom()}
      className={className}
    >
      <LogOut aria-hidden />
      Sair da sala
    </GameButton>
  )
}
