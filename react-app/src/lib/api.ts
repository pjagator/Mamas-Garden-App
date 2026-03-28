import { supabaseUrl, supabaseAnonKey } from './supabase'

interface ResilientFetchConfig {
  retries?: number
  timeoutMs?: number
  backoffMs?: number
  maxBackoffMs?: number
}

/**
 * Fetch wrapper with retries, exponential backoff, and timeout.
 * Ported from the vanilla app's js/network.js resilientFetch.
 */
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  config: ResilientFetchConfig = {}
): Promise<Response> {
  const {
    retries = 2,
    timeoutMs = 15000,
    backoffMs = 1000,
    maxBackoffMs = 8000,
  } = config

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.ok || response.status < 500) {
        return response
      }

      lastError = new Error(`HTTP ${response.status}`)
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err instanceof Error ? err : new Error(String(err))
    }

    if (attempt < retries) {
      const delay = Math.min(backoffMs * Math.pow(2, attempt), maxBackoffMs)
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  throw lastError ?? new Error('resilientFetch failed')
}

/** Call an edge function via direct fetch (not sb.functions.invoke) */
export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  config?: ResilientFetchConfig
): Promise<T> {
  const response = await resilientFetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    },
    config
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Edge function error: ${response.status}`)
  }

  return response.json()
}

/** Check if the browser is online */
export function isOnline(): boolean {
  return navigator.onLine
}

/** Subscribe to connection changes. Returns an unsubscribe function. */
export function onConnectionChange(
  callback: (online: boolean) => void
): () => void {
  const onOnline = () => callback(true)
  const onOffline = () => callback(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
