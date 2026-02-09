import { createFileRoute } from '@tanstack/react-router'
import { useLogout } from '../../features/auth/hooks/use-auth'

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})

function HomePage() {
  const { logout, logoutStatus } = useLogout()

  const handleLogout = () => {
    void logout()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">friendly-system</h1>
      <button
        onClick={handleLogout}
        disabled={logoutStatus === 'pending'}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        {logoutStatus === 'pending' ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  )
}
