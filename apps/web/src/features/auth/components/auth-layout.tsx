import type { ReactNode } from 'react'
import { MarketingPanel } from './marketing-panel'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <MarketingPanel />
      {children}
    </div>
  )
}
