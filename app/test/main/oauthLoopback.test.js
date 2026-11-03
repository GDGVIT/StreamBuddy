// @vitest-environment node
import net from 'node:net'
import { describe, expect, it, vi } from 'vitest'
import { createOAuthLoopback } from '../../src/main/oauthLoopback'

const AUTH_URL = 'https://project.supabase.co/auth/v1/authorize?provider=google'

// A port nothing is listening on right now
function freePort () {
  return new Promise((resolve) => {
    const probe = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

// Starts a sign-in attempt; `browser(path)` then plays the browser being redirected back
async function startSignIn (options = {}) {
  const port = await freePort()
  let opened
  const browserOpened = new Promise(resolve => { opened = resolve })
  const openExternal = vi.fn(async (url) => opened(url))
  const onCallback = vi.fn()
  const oauth = createOAuthLoopback({ port, timeoutMs: 5000, openExternal, onCallback, ...options })
  const result = oauth.wait(AUTH_URL)
  result.catch(() => {}) // tests inspect rejections themselves
  const browser = async (pathAndQuery) => {
    await browserOpened
    return fetch(`http://127.0.0.1:${port}${pathAndQuery}`)
  }
  return { oauth, result, browser, openExternal, onCallback, port }
}

describe('Google sign-in loopback', () => {
  it('opens the sign-in page and returns the code the browser comes back with', async () => {
    const { result, browser, openExternal, onCallback } = await startSignIn()
    const res = await browser('/auth/callback?code=abc123')
    expect(await result).toBe('abc123')
    expect(openExternal).toHaveBeenCalledWith(AUTH_URL)
    expect(onCallback).toHaveBeenCalledOnce()
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('You\'re signed in')
  })

  it('stops listening once sign-in is done', async () => {
    const { result, browser } = await startSignIn()
    await browser('/auth/callback?code=abc123')
    await result
    await expect(browser('/auth/callback?code=again')).rejects.toThrow()
  })

  it('passes on the error when Google sign-in fails', async () => {
    const { result, browser } = await startSignIn()
    const res = await browser('/auth/callback?error=access_denied&error_description=The+user+denied+access')
    await expect(result).rejects.toThrow('The user denied access')
    expect(await res.text()).toContain('didn\'t complete')
  })

  it('ignores other requests (like favicon.ico) and keeps waiting', async () => {
    const { result, browser } = await startSignIn()
    expect((await browser('/favicon.ico')).status).toBe(404)
    await browser('/auth/callback?code=later')
    expect(await result).toBe('later')
  })

  it('can be cancelled by the user', async () => {
    const { oauth, result, browser } = await startSignIn()
    await browser('/favicon.ico') // wait until it's listening
    oauth.cancel()
    await expect(result).rejects.toMatchObject({ message: 'Google sign-in was cancelled.', cancelled: true })
  })

  it('a second click replaces the attempt that is still waiting', async () => {
    const { oauth, result: first, browser } = await startSignIn()
    await browser('/favicon.ico')
    const second = oauth.wait(AUTH_URL)
    await expect(first).rejects.toMatchObject({ cancelled: true })
    await browser('/auth/callback?code=second')
    expect(await second).toBe('second')
  })

  it('gives up after the timeout', async () => {
    const { result } = await startSignIn({ timeoutMs: 50 })
    await expect(result).rejects.toThrow('Google sign-in timed out.')
  })

  it('explains when the port is already in use', async () => {
    const port = await freePort()
    const blocker = net.createServer().listen(port, '127.0.0.1')
    await new Promise(resolve => blocker.once('listening', resolve))
    try {
      const oauth = createOAuthLoopback({ port, timeoutMs: 5000, openExternal: vi.fn() })
      await expect(oauth.wait(AUTH_URL)).rejects.toThrow(`Port ${port} is busy`)
    } finally {
      blocker.close()
    }
  })

  it('fails cleanly if the browser cannot be opened', async () => {
    const { result } = await startSignIn({ openExternal: vi.fn().mockRejectedValue(new Error('No browser')) })
    await expect(result).rejects.toThrow('No browser')
  })
})
