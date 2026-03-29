export interface FetchConfig {
  retries?: number
  timeoutMs?: number
  backoffMs?: number
}

export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  config: FetchConfig = {}
): Promise<Response> {
  const { retries = 2, timeoutMs = 15000, backoffMs = 1000 } = config

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)

      if ((response.status === 529 || response.status >= 500) && attempt < retries) {
        const delay = Math.min(backoffMs * Math.pow(2, attempt), 8000)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      return response
    } catch (err) {
      clearTimeout(timer)

      if (err instanceof DOMException && err.name === 'AbortError') {
        if (attempt < retries) {
          const delay = Math.min(backoffMs * Math.pow(2, attempt), 8000)
          await new Promise(r => setTimeout(r, delay))
          continue
        }
        throw new Error('Request timed out. Please check your connection and try again.')
      }

      if (attempt < retries) {
        const delay = Math.min(backoffMs * Math.pow(2, attempt), 8000)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      throw err
    }
  }

  throw new Error('Unexpected: all retries exhausted')
}
