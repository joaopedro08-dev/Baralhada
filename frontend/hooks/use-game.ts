"use client"

import { useSyncExternalStore } from "react"

import {
  initialGameSessionState,
  type GameSessionState,
} from "@/lib/game/application/game-session"
import { gameSession } from "@/lib/game/session"

const getServerState = (): GameSessionState => initialGameSessionState

export const useGame = (): GameSessionState =>
  useSyncExternalStore(
    gameSession.subscribe,
    gameSession.getState,
    getServerState
  )
