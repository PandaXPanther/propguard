# PropGuard

**Don't blow your prop firm challenge because you didn't notice your drawdown.**

PropGuard connects to your trading account and watches your equity 24/7. The moment you're approaching a daily loss limit or max drawdown — it fires a Discord alert before you breach.

Free. Open source. Takes 5 minutes to set up.

---

## The problem

You paid $150–$500 for a TopStep, Apex, or FTMO evaluation. You're trading well. Then one bad session pushes you over the daily loss limit you forgot to track — and the challenge is gone.

The prop firm's dashboard doesn't alert you. It just records the breach.

PropGuard does what they don't.

---

## What it does

- Polls your account equity every 30 seconds
- Compares against your firm's exact rules (daily loss %, max drawdown %, profit target)
- **Warning alert** when you're within 0.5–1% of a limit — time to reduce size or stop
- **Breach alert** when a limit is hit — stop trading immediately
- **Profit target alert** when you've hit your goal — time to request payout
- Live web dashboard: [propguard-dashboard.pages.dev](https://propguard-dashboard.pages.dev)

---

## Supported prop firms

| Firm | Daily Loss | Max Drawdown | Profit Target |
|------|-----------|--------------|---------------|
| Apex Trader Funding | 3% | 6% | 10% |
| TopStep | 3% | 5% | 10% |
| FTMO | 5% | 10% | 10% |
| Custom | You set it | You set it | You set it |

---

## Setup (5 minutes)

### 1. Get a free Alpaca paper trading account
Sign up at [alpaca.markets](https://alpaca.markets) — free, no real money needed. Generate an API key under Paper Trading.

### 2. Create a Discord webhook
In any Discord channel: **Edit Channel → Integrations → Webhooks → New Webhook → Copy URL**

### 3. Clone and configure
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

### 4. Run
```bash
node propguard.mjs
```

### 5. Run as a background service
```bash
# Create systemd service so it survives reboots
sudo nano /etc/systemd/system/propguard.service
# Paste the service config from the wiki, then:
systemctl enable propguard && systemctl start propguard
```

---

## Alert examples

**⚠️ Warning — approaching daily loss limit**
> Daily Loss: 2.6% / 3% | Remaining: $200 | Equity: $49,800

**🚨 Breach — stop trading**
> DAILY LOSS LIMIT BREACHED
> Daily Loss: $1,520 (3.04%) | Limit: 3% | Equity: $48,480

**🏆 Profit target reached**
> Profit: $5,100 (10.2%) — consider requesting payout

---

## Roadmap
- [ ] cTrader OpenAPI support (FTMO, FundedNext)
- [ ] Multi-account monitoring
- [ ] Email + SMS alerts
- [ ] Payout tracker

---

## Contributing
PRs welcome. If PropGuard saved your challenge, drop a star.
