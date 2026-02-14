import type { PolicyDetailMainSection } from '@/features/policies/detail/controller/use-policy-detail-main-controller'
import { FieldSection } from '@/shared/ui/composites/field-section'
import { InlineEditField } from '@/shared/ui/composites/inline-edit-field'

export interface PolicyDetailMainSectionsProps {
  sections: PolicyDetailMainSection[]
}

export function PolicyDetailMainSections({
  sections,
}: PolicyDetailMainSectionsProps) {
  return (
    <>
      {sections.map((section) => (
        <FieldSection
          key={section.key}
          title={section.title}
          subtitle={section.subtitle}
        >
          <div className="grid gap-1 md:grid-cols-2">
            {section.fields.map((field) => (
              <InlineEditField
                key={`${section.key}-${field.label}`}
                {...field}
                className={
                  field.variant === 'textarea' ? 'md:col-span-2' : undefined
                }
              />
            ))}
          </div>
        </FieldSection>
      ))}
    </>
  )
}
