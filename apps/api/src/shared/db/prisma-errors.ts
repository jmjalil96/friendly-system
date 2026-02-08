import { Prisma } from '@prisma/client'

/**
 * Extracts field names from a Prisma P2002 unique constraint violation.
 * Handles both standard Prisma engine and driver adapter (e.g. @prisma/adapter-pg) error shapes.
 */
export function getUniqueViolationFields(
  error: Prisma.PrismaClientKnownRequestError,
): string[] {
  // Standard Prisma engine path
  const target = error.meta?.target
  if (Array.isArray(target)) {
    return target as string[]
  }

  // Driver adapter path (@prisma/adapter-pg)
  const driverError = error.meta?.driverAdapterError as
    | { cause?: { constraint?: { fields?: string[] } } }
    | undefined
  if (driverError?.cause?.constraint?.fields) {
    return driverError.cause.constraint.fields
  }

  // Fallback: try to extract from error message
  const match = error.message.match(/fields: \(`(.+?)`\)/)
  if (match) {
    return match[1].split('`,`').map((f) => f.trim())
  }

  return []
}
