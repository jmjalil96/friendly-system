import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // Auth queries override this to true (see authQueryOptions in use-auth.ts)
      refetchOnWindowFocus: false,
    },
  },
})
