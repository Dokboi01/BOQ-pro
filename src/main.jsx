import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { safeStorageGet, safeStorageRemove, safeStorageSet } from './utils/safeStorage'

const rootElement = document.getElementById('root')
const STARTUP_RECOVERY_KEY = 'boq_pro_startup_recovery_v1'

const getErrorMessage = (input) => {
  if (!input) return ''
  if (typeof input === 'string') return input
  return input.message || input.reason?.message || String(input.reason || input)
}

const isChunkLoadFailure = (input) => {
  const message = getErrorMessage(input)
  return /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|preload/i.test(message)
}

const renderStartupFailure = (title, message) => {
  if (!rootElement) return

  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
      <div style="width:min(560px,100%);background:white;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 20px 40px rgba(15,23,42,0.08);padding:28px;">
        <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">BOQ Pro Recovery</div>
        <h1 style="margin:16px 0 10px;font-size:28px;line-height:1.05;">${title}</h1>
        <p style="margin:0 0 20px;color:#475569;line-height:1.7;">${message}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button id="boq-reload" style="border:none;border-radius:12px;background:#0f172a;color:white;padding:12px 16px;font-weight:700;cursor:pointer;">Reload App</button>
          <button id="boq-hard-reset" style="border:1px solid #cbd5e1;border-radius:12px;background:white;color:#0f172a;padding:12px 16px;font-weight:700;cursor:pointer;">Clear Update Cache</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('boq-reload')?.addEventListener('click', () => {
    window.location.reload()
  })

  document.getElementById('boq-hard-reset')?.addEventListener('click', async () => {
    safeStorageRemove(STARTUP_RECOVERY_KEY)
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))
    }
    window.location.reload()
  })
}

const recoverFromStaleUpdate = async (reason) => {
  const previousAttempt = safeStorageGet(STARTUP_RECOVERY_KEY)

  if (!previousAttempt) {
    safeStorageSet(STARTUP_RECOVERY_KEY, JSON.stringify({
      reason,
      attemptedAt: new Date().toISOString(),
    }))

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))
    }

    window.location.reload()
    return
  }

  renderStartupFailure(
    'BOQ Pro needs a clean refresh',
    'A previous app version is still cached on this device. Use "Clear Update Cache" to reload the latest working build.'
  )
}

window.addEventListener('vite:preloadError', async (event) => {
  event.preventDefault()
  await recoverFromStaleUpdate('vite-preload-error')
})

window.addEventListener('error', async (event) => {
  if (isChunkLoadFailure(event.error || event.message)) {
    event.preventDefault()
    await recoverFromStaleUpdate('script-error')
  }
})

window.addEventListener('unhandledrejection', async (event) => {
  if (isChunkLoadFailure(event.reason)) {
    event.preventDefault()
    await recoverFromStaleUpdate('unhandled-rejection')
  }
})

let updateSW = () => {}
const shouldRegisterSW = import.meta.env.PROD
  && typeof window !== 'undefined'
  && window.location.protocol !== 'file:'

if (shouldRegisterSW) {
  updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('New content available! Reload to update?')) {
        safeStorageRemove(STARTUP_RECOVERY_KEY)
        updateSW(true)
      }
    },
    onRegisteredSW() {
      safeStorageRemove(STARTUP_RECOVERY_KEY)
    },
  })
}

try {
  if (!rootElement) {
    throw new Error('BOQ Pro could not find the root mount element.')
  }

  createRoot(rootElement).render(
    <App />,
  )
} catch (error) {
  console.error('Startup render failed:', error)
  renderStartupFailure(
    'BOQ Pro could not start',
    'The application hit a startup error before the interface could load. Reload the app, and if it keeps happening, use "Clear Update Cache".'
  )
}
