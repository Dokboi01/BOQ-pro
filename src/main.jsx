import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available! Reload to update?')) {
      updateSW(true)
    }
  },
})

createRoot(document.getElementById('root')).render(
  <>
    <App />
    {window.location.protocol !== 'file:' && <Analytics />}
  </>,
)
