import { Lightbulb } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const TIPS = [
  'Selecciona primero el cliente para ver sus afiliados disponibles.',
  'El paciente puede ser el afiliado titular o uno de sus dependientes.',
  'Describe el reclamo de forma clara y detallada para agilizar el proceso.',
  'Los documentos de soporte se pueden agregar después de crear el reclamo.',
]

export function ClaimTipsCard() {
  return (
    <Card className="border-transparent bg-[var(--color-blue-50)] shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-sm">
          <span className="flex size-6 items-center justify-center rounded-md bg-[var(--color-blue-500)]/10">
            <Lightbulb className="size-3.5 text-[var(--color-blue-500)]" />
          </span>
          <span className="font-semibold text-[var(--color-blue-700)]">Consejos</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {TIPS.map((tip) => (
            <li
              key={tip}
              className="flex gap-2.5 text-[0.8rem] leading-relaxed text-[var(--color-blue-700)]/70"
            >
              <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--color-blue-500)]/30" />
              {tip}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
