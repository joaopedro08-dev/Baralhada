import type { NextConfig } from "next"

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL

if (process.env.VERCEL && !SERVER_URL) {
  throw new Error(
    "Defina NEXT_PUBLIC_SERVER_URL com o endereço do backend no Render."
  )
}

const socketSources = (serverUrl: string): string => {
  const { protocol, host } = new URL(serverUrl)
  const socketProtocol = protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${host} ${socketProtocol}//${host}`
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${SERVER_URL ? socketSources(SERVER_URL) : "ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const BASE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
]

const PRODUCTION_HEADERS = [
  ...BASE_HEADERS,
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000",
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const production = process.env.NODE_ENV === "production"
    return [
      {
        source: "/:path*",
        headers: production ? PRODUCTION_HEADERS : BASE_HEADERS,
      },
    ]
  },
}

export default nextConfig
