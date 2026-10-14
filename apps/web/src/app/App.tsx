import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { reportWebVitals } from '@/shared/lib'
import { AppProviders, MockApiGate } from './providers'
import { router } from './routes/router.tsx'
import './styles/globals.css'

export function App() {
  useEffect(() => {
    reportWebVitals()
  }, [])
  return (
    <MockApiGate>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </MockApiGate>
  )
}
