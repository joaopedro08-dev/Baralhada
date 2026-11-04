import type { Metadata, Viewport } from "next"
import { Geist_Mono, Public_Sans, Space_Grotesk } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
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

export const metadata: Metadata = {
  title: "Rouba Monte",
  description:
    "Jogue Rouba Monte online com 2 a 6 amigos, no PC ou no celular.",
  openGraph: {
    title: "Rouba Monte",
    description: "Junte quadras, roube as dos amigos e vença a mesa.",
    type: "website",
    locale: "pt_BR",
  },
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
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
