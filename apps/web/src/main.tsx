import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/providers/query-client'
import { onUnauthorized } from './shared/lib/api-client'
import { AUTH_QUERY_KEY } from './features/auth/api/auth.query-keys'
import './index.css'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree, context: { queryClient } })

onUnauthorized(() => {
  const currentUser = queryClient.getQueryData(AUTH_QUERY_KEY)

  if (currentUser == null) {
    return
  }

  queryClient.setQueryData(AUTH_QUERY_KEY, null)
  void router.navigate({ to: '/login', replace: true })
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
