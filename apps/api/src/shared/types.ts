export interface RequestContext {
  ipAddress: string
  userAgent: string
}

export interface AuthenticatedUser {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  orgId: string
  orgSlug: string
  role: string
  permissions: string[]
}

export interface AuthenticatedSession {
  sessionId: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      sessionInfo?: AuthenticatedSession
      permissionScope?: string
    }
  }
}
