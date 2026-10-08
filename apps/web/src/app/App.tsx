import { RouterProvider } from 'react-router'
import { AppProviders } from './providers'
import { router } from './routes/router.tsx'

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
