"use client"

import { useActionCommands } from "@/components/game/table/use-action-commands"
import type { TrucoAction } from "@/lib/game/domain/truco/types"

export const useTrucoCommands = (turnNumber: number) =>
  useActionCommands<TrucoAction>(turnNumber)
