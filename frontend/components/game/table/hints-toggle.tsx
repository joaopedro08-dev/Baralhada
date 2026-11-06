"use client"

import { Lightbulb, LightbulbOff } from "lucide-react"

import { Toggle } from "@/components/ui/toggle"

export function HintsToggle({
  allowed,
  enabled,
  onChange,
}: {
  allowed: boolean
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  if (!allowed) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        <LightbulbOff aria-hidden className="size-4 shrink-0" />O anfitrião
        desligou as dicas nesta partida.
      </p>
    )
  }
  return (
    <Toggle
      variant="outline"
      pressed={enabled}
      onPressedChange={onChange}
      className="h-11 w-full justify-start gap-2 px-3 text-sm"
    >
      {enabled ? (
        <Lightbulb aria-hidden className="size-4" />
      ) : (
        <LightbulbOff aria-hidden className="size-4" />
      )}
      {enabled ? "Dicas ligadas" : "Dicas desligadas"}
    </Toggle>
  )
}
