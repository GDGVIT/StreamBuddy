import http from 'node:http'

// Google won't sign in inside an embedded app window, so the sign-in page opens in the
// user's real browser. Supabase then redirects the browser to this tiny local server,
// which grabs the one-time `code` and hands it back. The renderer exchanges it for a
// session (it holds the PKCE code verifier).
//
// openExternal: opens a URL in the browser (Electron's shell.openExternal)
// onCallback:   called when the browser comes back (used to bring the app to the front)
export function createOAuthLoopback ({ port, callbackPath = '/auth/callback', timeoutMs, openExternal, onCallback = () => {} }) {
  let server = null
  let cancelPending = null // rejects the attempt that's currently waiting, if any

  function wait (authUrl) {
    return new Promise((resolve, reject) => {
      // Clicking "Continue with Google" again replaces the attempt that's still waiting
      cancelPending?.()

      let timer = null
      function finish () {
        clearTimeout(timer)
        server?.close()
        server = null
        cancelPending = null
      }
      cancelPending = () => {
        finish()
        reject(Object.assign(new Error('Google sign-in was cancelled.'), { cancelled: true }))
      }

      server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://127.0.0.1:${port}`)
        if (url.pathname !== callbackPath) {
          res.writeHead(404)
          res.end()
          return
        }
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error_description') || url.searchParams.get('error')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(resultPage(Boolean(code)))
        finish()
        onCallback()
        if (code) resolve(code)
        else reject(new Error(error || 'Google sign-in was cancelled.'))
      })

      server.on('error', (err) => {
        finish()
        reject(err.code === 'EADDRINUSE'
          ? new Error(`Port ${port} is busy. Close whatever is using it and try again.`)
          : err)
      })

      timer = setTimeout(() => {
        finish()
        reject(new Error('Google sign-in timed out.'))
      }, timeoutMs)

      // Loopback only, so nothing on the network can reach it (and no firewall prompt)
      server.listen(port, '127.0.0.1', () => {
        Promise.resolve(openExternal(authUrl)).catch(err => {
          finish()
          reject(err)
        })
      })
    })
  }

  function cancel () {
    cancelPending?.()
  }

  return { wait, cancel }
}

// The page the browser shows after it's been redirected back to the app
export function resultPage (ok) {
  const message = ok
    ? 'You\'re signed in. You can close this tab and go back to StreamBuddy.'
    : 'Sign-in didn\'t complete. Close this tab and try again in StreamBuddy.'
  return `<!doctype html><html><head><meta charset="utf-8"><title>StreamBuddy</title></head>
<body style="font-family:system-ui,sans-serif;background:#C799FC;display:grid;place-items:center;height:100vh;margin:0">
<p style="background:#fff;border:3px solid #000;box-shadow:6px 6px 0 #000;padding:24px 32px;border-radius:12px;font-size:18px">${message}</p>
</body></html>`
}
