import { TriangleAlert } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"

export function RefusalMessage({ children }: { children: React.ReactNode }) {
  return (
    <Alert variant="destructive" className="px-3 py-2">
      <TriangleAlert aria-hidden />
      <AlertDescription className="text-sm font-medium">
        {children}
      </AlertDescription>
    </Alert>
  )
}
