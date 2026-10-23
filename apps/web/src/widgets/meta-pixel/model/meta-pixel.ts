type PixelCommand = unknown[]
type PixelQueue = ((...args: PixelCommand) => void) & {
  callMethod?: (...args: PixelCommand) => void
  queue: PixelCommand[]
  push: PixelQueue
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    fbq?: PixelQueue
    _fbq?: PixelQueue
  }
}

const initialized = new Set<string>()
let previous_view: string | null = null
let server_view_checked = false

function pixelQueue(): PixelQueue {
  if (window.fbq) return window.fbq
  const fbq = ((...args: PixelCommand) => {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  }) as PixelQueue
  fbq.queue = []
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  window.fbq = fbq
  window._fbq = fbq
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.append(script)
  return fbq
}

/** One PageView per navigation, including SPA routes and React StrictMode remounts. */
export function trackMetaPageView(pixel_id: string | null | undefined, navigation: string): void {
  if (!pixel_id || !/^[0-9]{5,25}$/.test(pixel_id)) {
    previous_view = null
    return
  }
  const view = `${pixel_id}:${navigation}`
  if (previous_view === view) return
  // The base code in the server HTML already sent the first PageView.
  if (!server_view_checked) {
    server_view_checked = true
    const server_id = document.querySelector('script[data-meta-pixel-id]')?.getAttribute('data-meta-pixel-id')
    if (server_id && window.fbq) {
      initialized.add(server_id)
      if (server_id === pixel_id) {
        previous_view = view
        return
      }
    }
  }
  const fbq = pixelQueue()
  if (!initialized.has(pixel_id)) {
    fbq('init', pixel_id)
    initialized.add(pixel_id)
  }
  fbq('trackSingle', pixel_id, 'PageView')
  previous_view = view
}
