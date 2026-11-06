import type { Metadata, Viewport } from "next"
import { Geist_Mono, Public_Sans, Space_Grotesk } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SEAT_BOOT_SCRIPT } from "@/lib/game/infrastructure/local-seat-store"
import { cn } from "@/lib/utils"

const spaceGroteskHeading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
})

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL

export const metadata: Metadata = {
  metadataBase: productionHost
    ? new URL(`https://${productionHost}`)
    : undefined,
  title: "Baralhada",
  description:
    "Jogue Rouba Monte, Truco Paulista e Três Trincas online com os amigos, no PC ou no celular.",
  openGraph: {
    title: "Baralhada",
    description:
      "Salas privadas para jogar baralho com os amigos: Rouba Monte, Truco Paulista e Três Trincas.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b3b2c" },
    { media: "(prefers-color-scheme: dark)", color: "#07211a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        publicSans.variable,
        spaceGroteskHeading.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SEAT_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
