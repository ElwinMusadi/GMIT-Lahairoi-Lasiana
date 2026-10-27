import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionProvider } from '@/components/session-provider'
import { router } from '@/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </SessionProvider>
  </StrictMode>,
)
