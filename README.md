# SIM Allocation Control — standalone project

## Run it locally

```bash
npm install
npm run dev
```

Vite will print a local URL, typically:

```
Local:   http://localhost:5173/
Network: http://<your-lan-ip>:5173/
```

## Tunnel it with ngrok

In a **second terminal**, on the same machine:

```bash
ngrok http 5173
```

ngrok will give you a public forwarding URL like `https://abcd1234.ngrok-free.app` —
share that with whoever needs access. Keep both terminals (Vite + ngrok) running.

## Important: the Gmail "send" feature won't work outside claude.ai

This component calls `https://api.anthropic.com/v1/messages` directly with an
`mcp_servers` block pointing at Gmail, and **no API key** — that only works
inside a Claude.ai artifact, where Anthropic's backend proxies the request and
attaches your account's connector authorization automatically.

Run standalone (via `npm run dev` + ngrok, or any other host), those fetch
calls will fail — you'll see "Sending…" hang or return an auth error, because
there's no key attached and no Gmail connector behind it.

To make live email sending work in a self-hosted version, you'd need to:
1. Add your own Anthropic API key (`ANTHROPIC_API_KEY`) — never expose it in
   frontend code; proxy the call through a small backend route instead.
2. Set up your own Gmail-sending path — either Anthropic's MCP connector
   flow authenticated for your own Google account, or simpler, a normal
   Gmail API / SMTP integration called from your backend.

Everything else (SIM allocation table, employee view, auto-block logic,
spam reports, monthly reconciliation popup) is plain React state and works
fully standalone with no backend at all.
