import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { applyResolvedTheme, readStoredThemePreference, resolveThemePreference } from './utils/theme'

applyResolvedTheme(resolveThemePreference(readStoredThemePreference()))

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available! Reload to update?')) {
      updateSW(true)
    }
  },
})

createRoot(document.getElementById('root')).render(
  <App />,
)
