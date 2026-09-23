import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/i18n'
import '@/index.css'
import App from '@/App'
import { syncServerClock } from '@/lib/clock'

const root = document.getElementById('root')!

/**
 * The ledger's dates come from the server, not the device, so the clock is
 * resolved before the first render: every form default and every live balance
 * reads `todayIso()`, and correcting the date afterwards would leave the values
 * already initialised from a device clock behind. `syncServerClock` falls back
 * to the device clock on its own timeout, so this cannot hang startup.
 */
syncServerClock().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
