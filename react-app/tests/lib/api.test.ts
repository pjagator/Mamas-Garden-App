import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resilientFetch } from '@/lib/api'

describe('resilientFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the response on a successful fetch', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    const response = await resilientFetch('https://example.com/api')
    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries on 529 status and eventually returns', async () => {
    const fail = new Response('overloaded', { status: 529 })
    const success = new Response(JSON.stringify({ ok: true }), { status: 200 })
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(fail)
      .mockResolvedValueOnce(success)
    )

    const response = await resilientFetch('https://example.com/api', {}, { retries: 2, backoffMs: 1 })
    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('retries on 500 status', async () => {
    const fail = new Response('error', { status: 500 })
    const success = new Response('ok', { status: 200 })
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(fail)
      .mockResolvedValueOnce(success)
    )

    const response = await resilientFetch('https://example.com/api', {}, { retries: 2, backoffMs: 1 })
    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry on 4xx errors', async () => {
    const notFound = new Response('not found', { status: 404 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound))

    const response = await resilientFetch('https://example.com/api', {}, { retries: 2, backoffMs: 1 })
    expect(response.status).toBe(404)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws after all retries are exhausted on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(
      resilientFetch('https://example.com/api', {}, { retries: 1, backoffMs: 1 })
    ).rejects.toThrow('Failed to fetch')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws timeout error when request exceeds timeoutMs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    }))

    await expect(
      resilientFetch('https://example.com/api', {}, { retries: 0, timeoutMs: 50 })
    ).rejects.toThrow('Request timed out')
  })
})
