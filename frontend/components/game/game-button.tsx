import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const TONES = {
  gold: "bg-gold text-gold-foreground hover:bg-gold/85 focus-visible:ring-gold/60",
  felt: "border-felt-line bg-felt-deep text-felt-foreground hover:bg-felt-line/40 focus-visible:ring-gold/60",
  panel: "",
} as const

export function GameButton({
  tone = "felt",
  className,
  ...props
}: React.ComponentProps<typeof Button> & { tone?: keyof typeof TONES }) {
  return (
    <Button
      className={cn(
        "h-11 min-w-11 gap-1.5 px-4 text-sm font-semibold transition-transform active:scale-[0.97] disabled:opacity-65 [&_svg:not([class*='size-'])]:size-4",
        TONES[tone],
        className
      )}
      {...props}
    />
  )
}
