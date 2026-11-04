import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { RULE_SECTIONS } from "@/lib/game/domain/how-to-play"

export function HowToPlay() {
  return (
    <Accordion type="single" collapsible>
      {RULE_SECTIONS.map(({ title, text }) => (
        <AccordionItem key={title} value={title}>
          <AccordionTrigger className="min-h-11 items-center px-3 text-sm">
            {title}
          </AccordionTrigger>
          <AccordionContent className="px-1 text-sm/relaxed">
            {text}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
