# ₿ BTC Signal Intelligence Dashboard

Live Bitcoin technical analysis dashboard powered by AI web search. Signals update every 2 minutes via server-side API calls — no CORS issues, API key stays private.

## Features

- **Live price** with 24h change, high/low, market cap, dominance
- **Multi-timeframe signals** — 1H and 4H analysis
- **5 indicators** — EMA 9/21, RSI 14, MACD, Volume, Sentiment
- **Fear & Greed index** with visual gauge
- **Support / Resistance** levels
- **Server-side caching** — 90s cache prevents redundant API calls
- **Rate limiting** — built-in cooldown protects your API quota
- **Stale data fallback** — returns cached data if API fails

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/btc-dashboard.git
cd btc-dashboard
npm install
```

### 2. Add your Anthropic API key

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at: https://console.anthropic.com

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option B — GitHub + Vercel UI

1. Push this repo to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repo
4. Under **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-your-key-here`
5. Click **Deploy**

> ⚠️ Never commit `.env.local` — it's in `.gitignore`

---

## Architecture

```
Browser  →  /api/btc (Next.js API route)  →  Anthropic API (web search)  →  Live crypto data
              ↑ server-side only               ↑ ANTHROPIC_API_KEY secret
              ↑ 90s cache
              ↑ rate limiter (30s cooldown)
              ↑ stale fallback on error
```

The API key is **never exposed to the browser**. All Anthropic calls happen server-side in the API route.

---

## Rate Limits & Costs

- Refreshes every **2 minutes** client-side
- Server caches responses for **90 seconds**
- Hard cooldown of **30 seconds** between live fetches
- Each fetch = ~1 Anthropic API call with web search tool
- Estimated cost: ~$0.01–0.03 per fetch depending on search results

---

## Customization

- Change the ticker: edit the prompt in `pages/api/btc.js`
- Add more indicators: extend `lib/signals.js`
- Adjust refresh rate: change `REFRESH_INTERVAL` in `pages/index.js`
- Change cache TTL: change `CACHE_TTL` in `pages/api/btc.js`
