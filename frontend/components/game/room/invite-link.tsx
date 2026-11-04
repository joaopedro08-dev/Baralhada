"use client"

import { useRef, useSyncExternalStore } from "react"
import { Copy, Share2 } from "lucide-react"
import { toast } from "sonner"

import { GameButton } from "@/components/game/game-button"
import { Input } from "@/components/ui/input"

const subscribeToNothing = () => () => undefined
const canShareNatively = () => "share" in navigator
const cannotShareOnServer = () => false

export function InviteLink({ url }: { url: string }) {
  const field = useRef<HTMLInputElement>(null)
  const canShare = useSyncExternalStore(
    subscribeToNothing,
    canShareNatively,
    cannotShareOnServer
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copiado! Mande para os amigos.")
    } catch {
      field.current?.select()
      toast("Selecionamos o link. Copie e mande para os amigos.")
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: "Rouba Monte", url })
    } catch {
      return
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        ref={field}
        readOnly
        value={url}
        aria-label="Link de convite"
        onFocus={(event) => event.target.select()}
        className="h-11 min-w-0 flex-1 px-3 text-sm md:text-sm"
      />
      <GameButton tone="panel" variant="secondary" onClick={() => void copy()}>
        <Copy aria-hidden />
        Copiar
      </GameButton>
      {canShare && (
        <GameButton
          tone="panel"
          variant="secondary"
          aria-label="Compartilhar link"
          onClick={() => void share()}
          className="px-0"
        >
          <Share2 aria-hidden />
        </GameButton>
      )}
    </div>
  )
}
