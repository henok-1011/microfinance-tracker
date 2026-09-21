import { RouterProvider } from 'react-router-dom'

import { router } from '@/app/router'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AuthProvider } from '@/features/auth/AuthProvider'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
