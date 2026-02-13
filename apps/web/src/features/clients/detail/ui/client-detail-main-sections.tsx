import type { ClientDetailMainSection } from '@/features/clients/detail/controller/use-client-detail-main-controller'
import { FieldSection } from '@/shared/ui/composites/field-section'
import { InlineEditField } from '@/shared/ui/composites/inline-edit-field'

export interface ClientDetailMainSectionsProps {
  sections: ClientDetailMainSection[]
}

export function ClientDetailMainSections({
  sections,
}: ClientDetailMainSectionsProps) {
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
              />
            ))}
          </div>
        </FieldSection>
      ))}
    </>
  )
}
