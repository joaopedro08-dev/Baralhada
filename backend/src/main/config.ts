import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  METRICS_PORT: z.coerce.number().int().min(0).max(65535).default(9464),
  PUBLIC_URL: z.url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().optional(),
  FRONTEND_DIR: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
  TURN_SECONDS: z.coerce.number().positive().default(60),
  RECONNECT_GRACE_SECONDS: z.coerce.number().positive().default(120),
  EMPTY_ROOM_TTL_SECONDS: z.coerce.number().positive().default(600),
  SWEEP_INTERVAL_SECONDS: z.coerce.number().positive().default(5),
  MAX_ROOMS: z.coerce.number().int().positive().default(1000),
  TRUST_PROXY: z.stringbool().default(false),
  CLIENT_IP_HEADER: z.string().min(1).default("x-forwarded-for"),
  MAX_CONNECTIONS_PER_IP: z.coerce.number().int().positive().default(30),
  ROOM_CREATIONS_PER_MINUTE: z.coerce.number().int().positive().default(10),
})

export interface AppConfig {
  readonly production: boolean
  readonly host: string
  readonly port: number
  readonly metricsPort: number
  readonly publicUrl: string
  readonly corsOrigins: readonly string[]
  readonly frontendDir: string | null
  readonly logLevel: string
  readonly sweepIntervalMs: number
  readonly trustProxy: boolean
  readonly clientIpHeader: string
  readonly maxConnectionsPerAddress: number
  readonly roomCreationsPerMinute: number
  readonly game: {
    readonly turnDurationMs: number
    readonly reconnectGraceMs: number
    readonly emptyRoomTtlMs: number
    readonly maxRooms: number
  }
}

const parseOrigins = (value: string | undefined): readonly string[] =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => new URL(origin).origin)

export const loadConfig = (env: NodeJS.ProcessEnv): AppConfig => {
  const parsed = envSchema.parse(env)
  return {
    production: parsed.NODE_ENV === "production",
    host: parsed.HOST,
    port: parsed.PORT,
    metricsPort: parsed.METRICS_PORT,
    publicUrl: parsed.PUBLIC_URL.replace(/\/$/, ""),
    corsOrigins: parseOrigins(parsed.CORS_ORIGIN),
    frontendDir: parsed.FRONTEND_DIR ?? null,
    logLevel: parsed.LOG_LEVEL,
    sweepIntervalMs: parsed.SWEEP_INTERVAL_SECONDS * 1000,
    trustProxy: parsed.TRUST_PROXY,
    clientIpHeader: parsed.CLIENT_IP_HEADER.toLowerCase(),
    maxConnectionsPerAddress: parsed.MAX_CONNECTIONS_PER_IP,
    roomCreationsPerMinute: parsed.ROOM_CREATIONS_PER_MINUTE,
    game: {
      turnDurationMs: parsed.TURN_SECONDS * 1000,
      reconnectGraceMs: parsed.RECONNECT_GRACE_SECONDS * 1000,
      emptyRoomTtlMs: parsed.EMPTY_ROOM_TTL_SECONDS * 1000,
      maxRooms: parsed.MAX_ROOMS,
    },
  }
}
