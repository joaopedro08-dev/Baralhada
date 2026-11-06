"use client"

import { Lightbulb, LightbulbOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const SWITCH_ID = "dicas-da-sala"

export function HintsSetting({
  allowed,
  editable,
  busy,
  onChange,
}: {
  allowed: boolean
  editable: boolean
  busy: boolean
  onChange: (allowed: boolean) => void
}) {
  const Icon = allowed ? Lightbulb : LightbulbOff
  const description = allowed
    ? "Cada jogador vê sugestões de jogada e pode desligá-las no menu."
    : "Ninguém recebe sugestões: vale só a cabeça de cada um."

  return (
    <section
      aria-labelledby="titulo-dicas"
      className={cn(
        "flex items-center gap-3 rounded-lg p-3 ring-1 transition-colors",
        allowed ? "bg-gold/10 ring-gold/40" : "bg-muted ring-border"
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-5 shrink-0",
          allowed ? "text-gold" : "text-muted-foreground"
        )}
      />
      <div className="min-w-0 flex-1">
        <h2 id="titulo-dicas" className="font-heading text-base font-semibold">
          {editable ? (
            <label htmlFor={SWITCH_ID}>Dicas na partida</label>
          ) : (
            "Dicas na partida"
          )}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {editable ? (
        <Switch
          id={SWITCH_ID}
          checked={allowed}
          disabled={busy}
          onCheckedChange={onChange}
          aria-describedby="titulo-dicas"
        />
      ) : (
        <Badge variant={allowed ? "default" : "outline"} className="shrink-0">
          {allowed ? "Ligadas" : "Desligadas"}
        </Badge>
      )}
    </section>
  )
}
