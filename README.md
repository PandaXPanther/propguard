# PropGuard

**Keep your prop firm challenge alive by tracking drawdown before it becomes a breach.**

PropGuard connects to an Alpaca paper or live trading account, checks equity against common prop firm limits, and sends Discord alerts when you are getting close to a daily loss, max drawdown, or profit target threshold.

It is free, open source, and designed to run on your own machine or server.

## Why It Exists

Prop firm dashboards usually show you the breach after it happens. PropGuard watches the account while you trade, so you can reduce size, stop trading, or request a payout before the firm dashboard becomes the first place you notice a problem.

## What It Does

- Polls account equity every 30 seconds
- Checks daily loss, max drawdown, and profit target rules
- Supports Apex Trader Funding, TopStep, FTMO, and custom rule presets
- Sends Discord warning alerts when you are close to a limit
- Sends breach alerts when a limit has been hit
- Sends profit target alerts when the account reaches its goal
- Provides a live dashboard: [PropGuard Dashboard](https://master.propguard-dashboard.pages.dev/)

## Supported Presets

| Firm | Daily Loss | Max Drawdown | Profit Target |
|------|------------|--------------|---------------|
| Apex Trader Funding | 3% | 6% | 10% |
| TopStep | 3% | 5% | 10% |
| FTMO | 5% | 10% | 10% |
| Custom | You set it | You set it | You set it |

## Setup

### 1. Create an Alpaca account

Sign up at [alpaca.markets](https://alpaca.markets). Paper trading is free and does not require real money. Generate an API key from the Paper Trading section.

### 2. Create a Discord webhook

In Discord, open the channel settings and go to **Integrations > Webhooks > New Webhook**, then copy the webhook URL.

### 3. Clone and configure PropGuard

```bash
git clone https://github.com/PandaXPanther/propguard
cd propguard
cp .env.example .env
```

Edit `.env`:

```env
ALPACA_API_KEY=your_key
ALPACA_API_SECRET=your_secret
ALPACA_BASE_URL=https://paper-api.alpaca.markets
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
ACCOUNT_SIZE=50000
PRESET=apex
```

### 4. Run PropGuard

```bash
node propguard.mjs
```

### 5. Run it as a background service

For a long-running setup, create a systemd service and point it at `propguard.mjs` in this project directory. Enable the service after confirming the app starts correctly from the command line.

```bash
systemctl enable propguard
systemctl start propguard
```

## Alert Examples

**Warning: approaching daily loss limit**

> Daily Loss: 2.6% / 3% | Remaining: $200 | Equity: $49,800

**Breach: stop trading**

> DAILY LOSS LIMIT BREACHED
> Daily Loss: $1,520 (3.04%) | Limit: 3% | Equity: $48,480

**Profit target reached**

> Profit: $5,100 (10.2%) | Consider requesting payout

## Roadmap

- [ ] cTrader OpenAPI support for FTMO and FundedNext
- [ ] Multi-account monitoring
- [ ] Email and SMS alerts
- [ ] Payout tracker

## Contributing

Issues and pull requests are welcome. If PropGuard helped you protect a challenge, a star on the repo is appreciated.
