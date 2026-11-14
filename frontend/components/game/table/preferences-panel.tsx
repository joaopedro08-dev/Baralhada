"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  loadPlayerPreferences,
  updatePlayerPreferences,
} from "@/lib/game/infrastructure/player-preferences"

export function PreferencesPanel() {
  const [preferences, setPreferences] = useState(loadPlayerPreferences)
  const update = (patch: Parameters<typeof updatePlayerPreferences>[0]) => {
    updatePlayerPreferences(patch)
    setPreferences(loadPlayerPreferences())
  }
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-heading text-sm font-semibold">Preferências</h3>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="min-h-11"
          aria-pressed={preferences.soundsEnabled === true}
          onClick={() => update({ soundsEnabled: preferences.soundsEnabled !== true })}
        >
          Sons: {preferences.soundsEnabled === true ? "ligados" : "desligados"}
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          aria-pressed={preferences.reducedMotion === true}
          onClick={() => update({ reducedMotion: preferences.reducedMotion !== true })}
        >
          Animações: {preferences.reducedMotion === true ? "reduzidas" : "normais"}
        </Button>
      </div>
      <Button
        variant="outline"
        className="min-h-11"
        aria-pressed={preferences.tutorialAutoOpen}
        onClick={() =>
          update({ tutorialAutoOpen: preferences.tutorialAutoOpen !== true })
        }
      >
        Tutorial automático: {preferences.tutorialAutoOpen ? "ligado" : "desligado"}
      </Button>
      <Button
        variant="outline"
        className="min-h-11"
        aria-pressed={preferences.showRoomCodeByDefault}
        onClick={() =>
          update({
            showRoomCodeByDefault: !preferences.showRoomCodeByDefault,
          })
        }
      >
        Código da sala:{" "}
        {preferences.showRoomCodeByDefault ? "visível" : "oculto"}
      </Button>
      <Button
        variant="outline"
        className="min-h-11"
        aria-pressed={preferences.cardSize === "large"}
        onClick={() =>
          update({ cardSize: preferences.cardSize === "large" ? "normal" : "large" })
        }
      >
        Cartas: {preferences.cardSize === "large" ? "grandes" : "normais"}
      </Button>
    </section>
  )
}
