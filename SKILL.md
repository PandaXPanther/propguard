---
name: prop-firm-compliance
description: Monitor a live or paper Alpaca account against prop firm drawdown rules in real time. Alerts on Discord when approaching or breaching daily loss, max drawdown, or profit target limits. Supports Apex, TopStep, FTMO, and custom rule presets.
---

# PropGuard — Prop Firm Compliance Monitor

Free, open-source. No subscription. Runs on your own server.

## What it does
- Polls your Alpaca account every 30 seconds
- Checks equity against your prop firm's daily loss limit, max drawdown, and profit target
- Fires Discord alerts at two levels:
  - **Warning** — within 0.5–1% of a limit (time to reduce size)
  - **Breach** — limit hit (stop trading now)
- Cooldown between repeat alerts so you don't get spammed
- Day rollover logic resets daily metrics automatically

## Supported presets

| Preset | Daily Loss | Max Drawdown | Profit Target |
|--------|-----------|--------------|---------------|
| `apex` | 3% | 6% | 10% |
| `topstep` | 3% | 5% | 10% |
| `ftmo` | 5% | 10% | 10% |
| `custom` | You set it | You set it | You set it |

## Setup (5 minutes)

### 1. Clone and configure
```bash
git clone https://github.com/sarasxryder/propguard
cd propguard
cp .env.example .env
# edit .env with your Alpaca keys, Discord webhook, account size, and preset
```

### 2. Get an Alpaca API key
Sign up free at alpaca.markets. Paper trading works out of the box — no real money needed to test.

### 3. Create a Discord webhook
In any Discord channel: Edit Channel → Integrations → Webhooks → New Webhook → Copy URL → paste into .env

### 4. Run it
```bash
node propguard.mjs
```

### 5. Run as a background service (optional)
```bash
# systemd (Linux)
# Copy propguard.service to ~/.config/systemd/user/ and enable
systemctl --user enable propguard
systemctl --user start propguard
```

## Alert examples

**Warning:**
> ⚠️ Approaching Daily Loss Limit
> Daily Loss: 2.6% / 3% | Remaining: $200 | Equity: $49,800

**Breach:**
> 🚨 DAILY LOSS LIMIT BREACHED — Stop trading immediately.
> Daily Loss: $1,520 (3.04%) | Limit: 3% | Equity: $48,480

**Profit target:**
> 🏆 Profit Target Reached! Consider requesting payout.
> Profit: $5,100 (10.2%) | Equity: $55,100

## Roadmap
- [ ] cTrader OpenAPI support (for FTMO, FundedNext)
- [ ] Multi-account monitoring
- [ ] Web dashboard
- [ ] Email alerts
