import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'
import { Label } from '@/shared/ui/primitives/label'
import { Textarea } from '@/shared/ui/primitives/textarea'

const MAX_LENGTH = 5000

export interface ClaimDescriptionCardProps {
  description: string
  onDescriptionChange: (value: string) => void
}

export function ClaimDescriptionCard({
  description,
  onDescriptionChange,
}: ClaimDescriptionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 sm:gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-blue-500)] text-base font-bold text-white sm:size-11 sm:rounded-2xl sm:text-lg">
            02
          </span>
          <span className="text-[var(--color-gray-900)]">Descripción</span>
        </CardTitle>
        <CardDescription className="pl-12 sm:pl-14">
          Detalla el motivo y la información relevante del reclamo
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Label htmlFor="claim-description" className="text-[0.8rem] font-semibold text-[var(--color-gray-600)]">Descripción del reclamo</Label>
        <Textarea
          id="claim-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={6}
          maxLength={MAX_LENGTH}
          placeholder="Describe el reclamo de forma clara y detallada..."
          className="flex-1 resize-none [field-sizing:fixed]"
        />
        <div className="flex items-center justify-between pt-1">
          <p className="text-[0.75rem] text-[var(--color-gray-400)]">
            Sé lo más detallado posible
          </p>
          <p className="text-[0.75rem] tabular-nums text-[var(--color-gray-400)]">
            {description.length} / {MAX_LENGTH}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
