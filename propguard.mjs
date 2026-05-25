/**
 * PropGuard — Real-time prop firm account compliance monitor
 * Polls Alpaca paper/live account, checks against prop firm rule presets,
 * fires Discord alerts when approaching limits.
 */

import { readFileSync, existsSync } from 'fs';
import https from 'https';

// ── Config ────────────────────────────────────────────────────────────────────

const ENV_PATH = '/root/projects/propguard/.env';

function loadEnv() {
  if (!existsSync(ENV_PATH)) throw new Error(`Missing .env at ${ENV_PATH}`);
  return readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .reduce((acc, l) => {
      const [k, ...v] = l.split('=');
      acc[k.trim()] = v.join('=').trim();
      return acc;
    }, {});
}

const env = loadEnv();

const {
  ALPACA_API_KEY,
  ALPACA_API_SECRET,
  ALPACA_BASE_URL = 'https://paper-api.alpaca.markets', // paper by default
  DISCORD_WEBHOOK_URL,
  ACCOUNT_SIZE,         // starting balance e.g. 50000
  PRESET,               // apex | topstep | ftmo | custom
  DAILY_LOSS_LIMIT_PCT, // for custom preset
  MAX_DRAWDOWN_PCT,     // for custom preset
  PROFIT_TARGET_PCT,    // for custom preset (optional)
  POLL_INTERVAL_SEC = '30',
  ALERT_COOLDOWN_MIN = '15', // min minutes between repeat alerts for same breach
} = env;

// ── Prop firm presets (% of account size) ────────────────────────────────────

const PRESETS = {
  apex: {
    name: 'Apex Trader Funding',
    dailyLossPct: 3,    // 3% daily loss limit
    maxDrawdownPct: 6,  // 6% trailing drawdown
    profitTargetPct: 10,
    warningBuffer: 0.5, // alert when within 0.5% of limit
  },
  topstep: {
    name: 'TopStep',
    dailyLossPct: 3,
    maxDrawdownPct: 5,
    profitTargetPct: 10,
    warningBuffer: 0.5,
  },
  ftmo: {
    name: 'FTMO',
    dailyLossPct: 5,
    maxDrawdownPct: 10,
    profitTargetPct: 10,
    warningBuffer: 1,
  },
  custom: {
    name: 'Custom',
    dailyLossPct: parseFloat(DAILY_LOSS_LIMIT_PCT || '3'),
    maxDrawdownPct: parseFloat(MAX_DRAWDOWN_PCT || '5'),
    profitTargetPct: parseFloat(PROFIT_TARGET_PCT || '10'),
    warningBuffer: 0.5,
  },
};

const rules = PRESETS[PRESET?.toLowerCase() || 'apex'];
if (!rules) throw new Error(`Unknown PRESET: ${PRESET}. Use: apex | topstep | ftmo | custom`);

const startingBalance = parseFloat(ACCOUNT_SIZE || '50000');
const pollMs = parseInt(POLL_INTERVAL_SEC) * 1000;
const alertCooldownMs = parseInt(ALERT_COOLDOWN_MIN) * 60 * 1000;

console.log(`PropGuard starting — ${rules.name} rules on ${ALPACA_BASE_URL}`);
console.log(`Account size: $${startingBalance.toLocaleString()} | Poll: ${POLL_INTERVAL_SEC}s`);
console.log(`Daily loss limit: ${rules.dailyLossPct}% | Max drawdown: ${rules.maxDrawdownPct}% | Profit target: ${rules.profitTargetPct}%`);

// ── State ─────────────────────────────────────────────────────────────────────

let dailyHighEquity = startingBalance; // resets each day
let allTimeHighEquity = startingBalance; // for trailing drawdown
let lastAlertByType = {}; // type -> timestamp
let lastDay = new Date().toDateString();

// ── Alpaca API ────────────────────────────────────────────────────────────────

function alpacaGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, ALPACA_BASE_URL);
    const req = https.request({
      host: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
        'Accept': 'application/json',
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Alpaca ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Discord alert ─────────────────────────────────────────────────────────────

async function sendAlert(type, title, description, color, fields) {
  const now = Date.now();
  if (lastAlertByType[type] && now - lastAlertByType[type] < alertCooldownMs) return;
  lastAlertByType[type] = now;

  const body = JSON.stringify({
    embeds: [{
      title,
      description,
      color,
      fields: fields.map(f => ({ name: f.name, value: f.value, inline: true })),
      footer: { text: `PropGuard · ${rules.name}` },
      timestamp: new Date().toISOString(),
    }],
  });

  return new Promise((resolve, reject) => {
    const url = new URL(DISCORD_WEBHOOK_URL);
    const req = https.request({
      host: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      res.resume();
      resolve();
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Core compliance check ─────────────────────────────────────────────────────

async function check() {
  const account = await alpacaGet('/v2/account');
  const equity = parseFloat(account.equity);
  const dayPl = parseFloat(account.equity) - parseFloat(account.last_equity);

  // Day rollover
  const today = new Date().toDateString();
  if (today !== lastDay) {
    dailyHighEquity = equity;
    lastAlertByType = {};
    lastDay = today;
    console.log(`[${new Date().toISOString()}] Day rolled over. Daily high reset to $${equity.toFixed(2)}`);
  }

  // Update highs
  if (equity > dailyHighEquity) dailyHighEquity = equity;
  if (equity > allTimeHighEquity) allTimeHighEquity = equity;

  // Calculate metrics
  const dailyLossDollars = dailyHighEquity - equity;
  const dailyLossPct = (dailyLossDollars / startingBalance) * 100;
  const maxDDDollars = allTimeHighEquity - equity;
  const maxDDPct = (maxDDDollars / startingBalance) * 100;
  const profitDollars = equity - startingBalance;
  const profitPct = (profitDollars / startingBalance) * 100;

  const dailyLimit = rules.dailyLossPct;
  const ddLimit = rules.maxDrawdownPct;
  const profitTarget = rules.profitTargetPct;
  const buf = rules.warningBuffer;

  console.log(`[${new Date().toISOString()}] Equity: $${equity.toFixed(2)} | Daily P&L: $${dayPl.toFixed(2)} | Daily loss: ${dailyLossPct.toFixed(2)}% | DD: ${maxDDPct.toFixed(2)}%`);

  // ── Breach: daily loss limit hit ──────────────────────────────────────────
  if (dailyLossPct >= dailyLimit) {
    await sendAlert('daily_breach', '🚨 DAILY LOSS LIMIT BREACHED', 'Stop trading immediately.', 0xFF0000, [
      { name: 'Daily Loss', value: `$${dailyLossDollars.toFixed(2)} (${dailyLossPct.toFixed(2)}%)` },
      { name: 'Limit', value: `${dailyLimit}%` },
      { name: 'Equity', value: `$${equity.toFixed(2)}` },
    ]);
    return;
  }

  // ── Breach: max drawdown hit ──────────────────────────────────────────────
  if (maxDDPct >= ddLimit) {
    await sendAlert('dd_breach', '🚨 MAX DRAWDOWN BREACHED', 'Account may be terminated. Stop trading.', 0xFF0000, [
      { name: 'Drawdown', value: `$${maxDDDollars.toFixed(2)} (${maxDDPct.toFixed(2)}%)` },
      { name: 'Limit', value: `${ddLimit}%` },
      { name: 'Equity', value: `$${equity.toFixed(2)}` },
    ]);
    return;
  }

  // ── Warning: approaching daily loss limit ─────────────────────────────────
  if (dailyLossPct >= dailyLimit - buf) {
    const remaining = ((dailyLimit - dailyLossPct) / 100) * startingBalance;
    await sendAlert('daily_warn', '⚠️ Approaching Daily Loss Limit', `$${remaining.toFixed(0)} left before breach.`, 0xFF8C00, [
      { name: 'Daily Loss', value: `${dailyLossPct.toFixed(2)}% / ${dailyLimit}%` },
      { name: 'Remaining', value: `$${remaining.toFixed(2)}` },
      { name: 'Equity', value: `$${equity.toFixed(2)}` },
    ]);
  }

  // ── Warning: approaching max drawdown ────────────────────────────────────
  if (maxDDPct >= ddLimit - buf) {
    const remaining = ((ddLimit - maxDDPct) / 100) * startingBalance;
    await sendAlert('dd_warn', '⚠️ Approaching Max Drawdown Limit', `$${remaining.toFixed(0)} left before breach.`, 0xFF8C00, [
      { name: 'Drawdown', value: `${maxDDPct.toFixed(2)}% / ${ddLimit}%` },
      { name: 'Remaining', value: `$${remaining.toFixed(2)}` },
      { name: 'Equity', value: `$${equity.toFixed(2)}` },
    ]);
  }

  // ── Info: profit target hit ───────────────────────────────────────────────
  if (profitPct >= profitTarget) {
    await sendAlert('profit_hit', '🏆 Profit Target Reached!', 'Consider requesting payout.', 0x00FF00, [
      { name: 'Profit', value: `$${profitDollars.toFixed(2)} (${profitPct.toFixed(2)}%)` },
      { name: 'Target', value: `${profitTarget}%` },
      { name: 'Equity', value: `$${equity.toFixed(2)}` },
    ]);
  }
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

async function poll() {
  try {
    await check();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Poll error:`, err.message);
  }
}

poll();
setInterval(poll, pollMs);
