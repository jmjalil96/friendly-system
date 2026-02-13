import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'
import { cn } from '@/shared/lib/cn'

export type WorkflowStepState = 'pending' | 'completed' | 'current' | 'terminal'

export interface WorkflowStepItem {
  id: string
  label: string
  state: WorkflowStepState
  metaText?: string
}

export interface WorkflowCardProps {
  title: string
  icon?: ReactNode
  steps: WorkflowStepItem[]
  footer?: ReactNode
  className?: string
}

const STEP_INDICATOR_CLASSNAMES: Record<WorkflowStepState, string> = {
  pending:
    'border-[var(--color-gray-200)] bg-white text-[var(--color-gray-400)]',
  completed:
    'border-[var(--color-blue-300)] bg-[var(--color-blue-50)] text-[var(--color-blue-700)]',
  current:
    'border-[var(--color-blue-700)] bg-[var(--color-blue-700)] text-white shadow-[0_0_0_3px_var(--color-blue-100)]',
  terminal:
    'border-[var(--color-gray-300)] bg-[var(--color-gray-50)] text-[var(--color-gray-500)]',
}

const STEP_LABEL_CLASSNAMES: Record<WorkflowStepState, string> = {
  pending: 'text-[var(--color-gray-500)]',
  completed: 'text-[var(--color-gray-900)]',
  current: 'text-[var(--color-blue-700)]',
  terminal: 'text-[var(--color-gray-500)]',
}

function isStepResolved(state: WorkflowStepState): boolean {
  return state === 'current' || state === 'completed'
}

export function WorkflowCard({
  title,
  icon,
  steps,
  footer,
  className,
}: WorkflowCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--color-gray-900)]">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-0">
          {steps.map((step, index) => {
            const isCompleted = step.state === 'completed'

            return (
              <li key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full border-2 text-[0.68rem] font-bold transition-colors',
                      STEP_INDICATOR_CLASSNAMES[step.state],
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-3.5" strokeWidth={2.5} />
                    ) : (
                      index + 1
                    )}
                  </span>

                  {index < steps.length - 1 ? (
                    <span
                      className={cn(
                        'my-0.5 block h-5 w-0.5 rounded-full',
                        isStepResolved(step.state)
                          ? 'bg-[var(--color-blue-200)]'
                          : 'bg-[var(--color-gray-200)]',
                      )}
                    />
                  ) : null}
                </div>

                <div className="pt-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      STEP_LABEL_CLASSNAMES[step.state],
                    )}
                  >
                    {step.label}
                  </p>
                  {step.metaText ? (
                    <p className="text-[0.72rem] text-[var(--color-gray-400)]">
                      {step.metaText}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>

        {footer ? (
          <div className="border-t border-[var(--color-gray-100)] pt-3">
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
