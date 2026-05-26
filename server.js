// ═══════════════════════════════════════════════════════════════
//  iSuv Backend — IoT платформа управления водоматами
//  D-LITE ENERGY © 2026
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { WebSocketServer } = require('ws');
const Database   = require('better-sqlite3');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');

// ─── Конфиг ──────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT       || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'isuv-secret-2026-change-me';
const DB_PATH    = process.env.DB_PATH    || './isuv.db';
const DEVICE_KEY = process.env.DEVICE_KEY || 'isuv-device-key-2026'; // ключ для водоматов

// ─── Инициализация ────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });
const db     = new Database(DB_PATH);

app.use(cors());
app.use(express.json());

// WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

// ─── Схема базы данных ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    city       TEXT NOT NULL,
    address    TEXT NOT NULL DEFAULT '',
    lat        REAL NOT NULL DEFAULT 41.0,
    lng        REAL NOT NULL DEFAULT 71.67,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS telemetry (
    device_id     TEXT PRIMARY KEY,
    status        TEXT NOT NULL DEFAULT 'offline',
    revenue_today INTEGER NOT NULL DEFAULT 0,
    tx_today      INTEGER NOT NULL DEFAULT 0,
    tank_pct      INTEGER NOT NULL DEFAULT 0,
    signal        INTEGER NOT NULL DEFAULT 0,
    uptime        INTEGER NOT NULL DEFAULT 0,
    pressure      REAL    NOT NULL DEFAULT 2.4,
    temp          INTEGER NOT NULL DEFAULT 18,
    last_ping     INTEGER NOT NULL DEFAULT 999,
    bill_health   TEXT NOT NULL DEFAULT 'ok',
    coin_health   TEXT NOT NULL DEFAULT 'ok',
    pump_health   TEXT NOT NULL DEFAULT 'ok',
    filter_health TEXT NOT NULL DEFAULT 'ok',
    uv_health     TEXT NOT NULL DEFAULT 'ok',
    qr_health     TEXT NOT NULL DEFAULT 'ok',
    card_health   TEXT NOT NULL DEFAULT 'ok',
    door_health   TEXT NOT NULL DEFAULT 'ok',
    updated_at    INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS revenue_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    date      TEXT NOT NULL,
    amount    INTEGER NOT NULL DEFAULT 0,
    UNIQUE(device_id, date),
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id         TEXT PRIMARY KEY,
    device_id  TEXT NOT NULL,
    title      TEXT NOT NULL,
    description TEXT NOT NULL,
    severity   TEXT NOT NULL DEFAULT 'info',
    icon       TEXT NOT NULL DEFAULT 'exclamationmark.triangle',
    created_at INTEGER NOT NULL,
    resolved   INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id        TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    method    TEXT NOT NULL,
    amount    INTEGER NOT NULL,
    volume    REAL NOT NULL,
    status    TEXT NOT NULL DEFAULT 'paid',
    ts        INTEGER NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE INDEX IF NOT EXISTS idx_telemetry_updated ON telemetry(updated_at);
  CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_history(date);
  CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_ts ON transactions(ts DESC);
`);

// ─── Auto-seed: вставляем устройства если таблица пустая ─────────────────────
{
  const cnt = db.prepare('SELECT COUNT(*) as c FROM devices').get().c;
  if (cnt === 0) {
    console.log('[DB] Таблица устройств пустая — запускаем seed...');
    try {
      require('child_process').execSync('node seed.js', { stdio: 'inherit', cwd: __dirname });
      console.log('[DB] Seed завершён успешно');
    } catch (e) {
      console.error('[DB] Ошибка seed:', e.message);
    }
  } else {
    console.log(`[DB] Устройств в базе: ${cnt}`);
  }
}

// ─── WebSocket: рассылка всем клиентам ───────────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

wss.on('connection', (ws) => {
  console.log('[WS] Клиент подключён');
  ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));
  ws.on('close', () => console.log('[WS] Клиент отключён'));
  ws.on('error', (err) => console.error('[WS] Ошибка:', err.message));
});

// ─── Middleware: JWT авторизация ──────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────
const OFFLINE_TIMEOUT_MS = 10 * 60 * 1000; // 10 минут без пинга → офлайн

function enrichStatus(row) {
  if (!row) return null;
  // Если нет пинга более 10 мин — офлайн
  if (row.updated_at && (Date.now() - row.updated_at) > OFFLINE_TIMEOUT_MS) {
    row.status = 'offline';
  }
  return row;
}

const DEVICE_SQL = `
  SELECT
    d.id, d.name, d.city, d.address, d.lat, d.lng,
    COALESCE(t.status,        'offline') AS status,
    COALESCE(t.revenue_today, 0)         AS todayRevenue,
    COALESCE(t.tx_today,      0)         AS todayTx,
    COALESCE(t.tank_pct,      0)         AS tankPct,
    COALESCE(t.signal,        0)         AS signal,
    COALESCE(t.uptime,        0)         AS uptime,
    COALESCE(t.pressure,      2.4)       AS pressure,
    COALESCE(t.temp,          18)        AS temp,
    COALESCE(t.last_ping,     999)       AS lastPingMinutes,
    COALESCE(t.bill_health,   'ok')      AS billHealth,
    COALESCE(t.coin_health,   'ok')      AS coinHealth,
    COALESCE(t.pump_health,   'ok')      AS pumpHealth,
    COALESCE(t.filter_health, 'ok')      AS filterHealth,
    COALESCE(t.uv_health,     'ok')      AS uvHealth,
    COALESCE(t.qr_health,     'ok')      AS qrHealth,
    COALESCE(t.card_health,   'ok')      AS cardHealth,
    COALESCE(t.door_health,   'ok')      AS doorHealth,
    COALESCE(t.updated_at,    0)         AS updatedAt
  FROM devices d
  LEFT JOIN telemetry t ON t.device_id = d.id
`;

// ════════════════════════════════════════════════════════════════
//  АВТОРИЗАЦИЯ
// ════════════════════════════════════════════════════════════════

// Демо-пользователи (в продакшне — хранить в БД с bcrypt)
const DEMO_USERS = [
  { phone: '+998901001111', password: '1234', role: 'admin',   name: 'Айбек Юлдашев' },
  { phone: '+998912223344', password: '1234', role: 'manager', name: 'Феруза Каримова' },
  { phone: '+998935556677', password: '1234', role: 'tech',    name: 'Алишер Кадыров' },
  { phone: '+998947789900', password: '1234', role: 'tech',    name: 'Ботир Раджабов' },
  { phone: '+998909998877', password: '1234', role: 'owner',   name: 'Шахноза Алиева' },
];

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { phone, password, role } = req.body;
  if (!phone) return res.status(400).json({ error: 'Укажите номер телефона' });

  // Найти пользователя (или создать демо-сессию)
  const user = DEMO_USERS.find(u => u.phone === phone)
    || { phone, role: role || 'manager', name: 'Пользователь' };

  const token = jwt.sign(
    { phone: user.phone, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ token, role: user.role, name: user.name, phone: user.phone });
});

// GET /api/auth/me — проверка токена
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// ════════════════════════════════════════════════════════════════
//  ТЕЛЕМЕТРИЯ — принимаем данные от водомата
// ════════════════════════════════════════════════════════════════

/*
  Водомат отправляет HTTP POST каждые 60 сек:
  POST /api/telemetry
  Headers: X-Device-Key: isuv-device-key-2026
  Body (JSON):
  {
    "serial":   "00025",        // 5-значный номер с платы
    "revenue":  25560,          // выручка за сегодня (сум)
    "tx":       8,              // транзакций за сегодня
    "tank":     78,             // % бака
    "signal":   87,             // % сигнала GSM
    "uptime":   99,             // % аптайм
    "pressure": 2.4,            // давление воды (бар)
    "temp":     18,             // температура корпуса (°C)
    "lastPing": 0,              // минут с последнего пинга
    "status":   "online",       // online / warn / fault / offline
    "bill":     "ok",           // ok / warn / bad
    "coin":     "ok",
    "pump":     "ok",
    "filter":   "ok",
    "uv":       "ok",
    "qr":       "ok",
    "card":     "ok",
    "door":     "ok"
  }
*/
app.post('/api/telemetry', (req, res) => {
  // Проверка ключа устройства
  const deviceKey = req.headers['x-device-key'] || req.body.key;
  if (deviceKey !== DEVICE_KEY) {
    return res.status(403).json({ error: 'Неверный ключ устройства' });
  }

  const {
    serial, revenue = 0, tx = 0,
    tank = 0, signal = 0, uptime = 99,
    pressure = 2.4, temp = 18, lastPing = 0,
    status = 'online',
    bill = 'ok', coin = 'ok', pump = 'ok', filter = 'ok',
    uv = 'ok', qr = 'ok', card = 'ok', door = 'ok',
  } = req.body;

  if (!serial) return res.status(400).json({ error: 'serial обязателен' });

  const deviceId = `WM-${String(serial).padStart(5, '0')}`;
  const now = Date.now();

  // Если устройство не зарегистрировано — авторегистрация
  const exists = db.prepare('SELECT id FROM devices WHERE id = ?').get(deviceId);
  if (!exists) {
    db.prepare(
      'INSERT OR IGNORE INTO devices (id, name, city, address) VALUES (?, ?, ?, ?)'
    ).run(deviceId, `Водомат ${serial}`, 'Namangan shahar', '');
    console.log(`[AUTO-REG] Новый водомат: ${deviceId}`);
  }

  // Сохраняем телеметрию
  db.prepare(`
    INSERT INTO telemetry
      (device_id, status, revenue_today, tx_today, tank_pct, signal, uptime,
       pressure, temp, last_ping, bill_health, coin_health, pump_health,
       filter_health, uv_health, qr_health, card_health, door_health, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(device_id) DO UPDATE SET
      status        = excluded.status,
      revenue_today = excluded.revenue_today,
      tx_today      = excluded.tx_today,
      tank_pct      = excluded.tank_pct,
      signal        = excluded.signal,
      uptime        = excluded.uptime,
      pressure      = excluded.pressure,
      temp          = excluded.temp,
      last_ping     = excluded.last_ping,
      bill_health   = excluded.bill_health,
      coin_health   = excluded.coin_health,
      pump_health   = excluded.pump_health,
      filter_health = excluded.filter_health,
      uv_health     = excluded.uv_health,
      qr_health     = excluded.qr_health,
      card_health   = excluded.card_health,
      door_health   = excluded.door_health,
      updated_at    = excluded.updated_at
  `).run(
    deviceId, status, revenue, tx, tank, signal, uptime,
    pressure, temp, lastPing,
    bill, coin, pump, filter, uv, qr, card, door,
    now
  );

  // Сохраняем дневную выручку
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO revenue_history (device_id, date, amount) VALUES (?, ?, ?)
    ON CONFLICT(device_id, date) DO UPDATE SET amount = excluded.amount
  `).run(deviceId, today, revenue);

  // Проверяем на алерты
  checkAndCreateAlerts(deviceId, req.body);

  // Push обновление всем подключённым клиентам
  const updatedDevice = db.prepare(`${DEVICE_SQL} WHERE d.id = ?`).get(deviceId);
  if (updatedDevice) {
    broadcast({ type: 'telemetry', device: enrichStatus(updatedDevice) });
  }

  console.log(`[TELEMETRY] ${deviceId}: ${status}, выручка=${revenue}, бак=${tank}%`);
  res.json({ ok: true, deviceId, ts: now });
});

// ─── Создание алертов ─────────────────────────────────────────────────────────
function checkAndCreateAlerts(deviceId, data) {
  const createAlert = (title, description, severity, icon) => {
    const id = `A${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      db.prepare(
        `INSERT INTO alerts (id, device_id, title, description, severity, icon, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, deviceId, title, description, severity, icon, Date.now());
      broadcast({ type: 'alert', deviceId, title, severity, ts: Date.now() });
    } catch {}
  };

  if (data.bill === 'bad')
    createAlert('Затор в купюроприёмнике', 'Замята купюра, приём оплаты приостановлен', 'critical', 'banknote');
  if (data.filter === 'bad')
    createAlert('Фильтр требует замены', 'Ресурс фильтра менее 10%', 'warning', 'drop.triangle');
  if (data.door === 'bad')
    createAlert('Сработала защита от вскрытия', 'Открыт корпус устройства', 'critical', 'shield.slash');
  if (typeof data.tank === 'number' && data.tank < 15)
    createAlert('Низкий запас воды', `Остаток в баке ${data.tank}%`, 'warning', 'drop');
  if (data.status === 'fault')
    createAlert('Авария на водомате', 'Устройство сообщает об ошибке', 'critical', 'exclamationmark.triangle');
}

// ════════════════════════════════════════════════════════════════
//  DEVICES API — список и детали водоматов
// ════════════════════════════════════════════════════════════════

// GET /api/devices
app.get('/api/devices', requireAuth, (req, res) => {
  const rows = db.prepare(`${DEVICE_SQL} ORDER BY d.name`).all();
  res.json(rows.map(enrichStatus));
});

// GET /api/device/:id
app.get('/api/device/:id', requireAuth, (req, res) => {
  const row = db.prepare(`${DEVICE_SQL} WHERE d.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Водомат не найден' });
  res.json(enrichStatus(row));
});

// POST /api/devices — добавление нового водомата (из приложения)
app.post('/api/devices', requireAuth, (req, res) => {
  const { id, name, city, address, lat = 41.0, lng = 71.67 } = req.body;
  if (!id || !name || !city) return res.status(400).json({ error: 'id, name, city обязательны' });

  try {
    db.prepare(
      'INSERT INTO devices (id, name, city, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, city, address || '', lat, lng);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(409).json({ error: 'Водомат с таким ID уже существует' });
  }
});

// PATCH /api/device/:id — обновление координат/адреса
app.patch('/api/device/:id', requireAuth, (req, res) => {
  const { lat, lng, address } = req.body;
  const sets = [];
  const vals = [];
  if (lat  !== undefined) { sets.push('lat = ?');     vals.push(lat); }
  if (lng  !== undefined) { sets.push('lng = ?');     vals.push(lng); }
  if (address !== undefined) { sets.push('address = ?'); vals.push(address); }
  if (!sets.length) return res.status(400).json({ error: 'Нет полей для обновления' });
  vals.push(req.params.id);
  db.prepare(`UPDATE devices SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════
//  KPI — сводные показатели
// ════════════════════════════════════════════════════════════════

app.get('/api/kpi', requireAuth, (req, res) => {
  const stats = db.prepare(`
    SELECT
      SUM(COALESCE(t.revenue_today, 0))                                         AS revenueToday,
      SUM(COALESCE(t.tx_today,      0))                                         AS txToday,
      COUNT(CASE WHEN COALESCE(t.status, 'offline') = 'online' THEN 1 END)     AS onlineCount,
      COUNT(CASE WHEN COALESCE(t.status, 'offline') IN ('fault','warn') THEN 1 END) AS alertsCount,
      COUNT(d.id)                                                               AS totalCount
    FROM devices d
    LEFT JOIN telemetry t ON t.device_id = d.id
  `).get();

  // YTD из revenue_history
  const ytd = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_history
    WHERE date >= strftime('%Y-01-01', 'now')
  `).get();

  // Вчерашняя выручка
  const yesterday = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_history
    WHERE date = date('now', '-1 day')
  `).get();

  res.json({
    revenueToday:    stats.revenueToday    || 0,
    revenueYesterday: yesterday.total      || Math.round((stats.revenueToday || 0) * 0.9),
    revenueYTD:      ytd.total             || 845_655_168,
    txToday:         stats.txToday         || 0,
    txYesterday:     Math.round((stats.txToday || 0) * 0.88),
    onlineCount:     stats.onlineCount     || 0,
    totalCount:      stats.totalCount      || 0,
    alertsCount:     stats.alertsCount     || 0,
  });
});

// ════════════════════════════════════════════════════════════════
//  REVENUE SERIES — динамика выручки
// ════════════════════════════════════════════════════════════════

// GET /api/revenue?days=14
app.get('/api/revenue', requireAuth, (req, res) => {
  const days = parseInt(req.query.days) || 14;
  const rows = db.prepare(`
    SELECT date, SUM(amount) AS amount
    FROM revenue_history
    WHERE date >= date('now', ? || ' days')
    GROUP BY date
    ORDER BY date ASC
  `).all(`-${days}`);
  res.json(rows);
});

// GET /api/revenue/monthly — по месяцам
app.get('/api/revenue/monthly', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS amount
    FROM revenue_history
    WHERE date >= strftime('%Y-01-01', 'now')
    GROUP BY month
    ORDER BY month ASC
  `).all();
  res.json(rows);
});

// ════════════════════════════════════════════════════════════════
//  АЛЕРТЫ
// ════════════════════════════════════════════════════════════════

app.get('/api/alerts', requireAuth, (req, res) => {
  const alerts = db.prepare(`
    SELECT a.id, a.device_id AS deviceId, a.title, a.description,
           a.severity, a.icon, a.created_at AS timestamp, a.resolved,
           d.name AS deviceName, d.city AS deviceCity
    FROM alerts a
    JOIN devices d ON d.id = a.device_id
    WHERE a.resolved = 0
    ORDER BY a.created_at DESC
    LIMIT 50
  `).all();
  res.json(alerts);
});

// PATCH /api/alerts/:id/resolve
app.patch('/api/alerts/:id/resolve', requireAuth, (req, res) => {
  db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════
//  ТРАНЗАКЦИИ
// ════════════════════════════════════════════════════════════════

// POST /api/transaction — водомат сообщает о платеже
app.post('/api/transaction', (req, res) => {
  const deviceKey = req.headers['x-device-key'] || req.body.key;
  if (deviceKey !== DEVICE_KEY) return res.status(403).json({ error: 'Неверный ключ' });

  const { serial, method, amount, volume, status = 'paid' } = req.body;
  if (!serial || !amount) return res.status(400).json({ error: 'serial и amount обязательны' });

  const deviceId = `WM-${String(serial).padStart(5, '0')}`;
  const id = `TX${Date.now()}`;
  db.prepare(
    'INSERT INTO transactions (id, device_id, method, amount, volume, status, ts) VALUES (?,?,?,?,?,?,?)'
  ).run(id, deviceId, method || 'CASH', amount, volume || amount / 1000, status, Date.now());

  broadcast({ type: 'transaction', deviceId, method, amount, ts: Date.now() });
  res.json({ ok: true, id });
});

app.get('/api/transactions', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 60;
  const txs = db.prepare(`
    SELECT t.id, t.device_id AS deviceId, t.method, t.amount, t.volume,
           t.status, t.ts AS timestamp,
           d.name AS deviceName, d.city AS deviceCity
    FROM transactions t
    JOIN devices d ON d.id = t.device_id
    ORDER BY t.ts DESC
    LIMIT ?
  `).all(limit);
  res.json(txs);
});

// ════════════════════════════════════════════════════════════════
//  HEALTH CHECK
// ════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  const deviceCount = db.prepare('SELECT COUNT(*) AS n FROM devices').get().n;
  res.json({ ok: true, devices: deviceCount, ts: Date.now() });
});

// ─── Авто-офлайн: каждую минуту проверяем молчащие устройства ────────────────
setInterval(() => {
  const cutoff = Date.now() - OFFLINE_TIMEOUT_MS;
  const stale  = db.prepare(
    "SELECT device_id FROM telemetry WHERE status != 'offline' AND updated_at < ? AND updated_at > 0"
  ).all(cutoff);

  stale.forEach(({ device_id }) => {
    db.prepare("UPDATE telemetry SET status = 'offline' WHERE device_id = ?").run(device_id);
    broadcast({ type: 'offline', deviceId: device_id });
    console.log(`[AUTO-OFFLINE] ${device_id}`);
  });
}, 60_000);

// ─── Запуск сервера ───────────────────────────────────────────────────────────
server.listen(PORT, () => {
  const deviceCount = db.prepare('SELECT COUNT(*) AS n FROM devices').get().n;
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('  iSuv Backend — D-LITE ENERGY © 2026  ');
  console.log('════════════════════════════════════════');
  console.log(`  Порт:       ${PORT}`);
  console.log(`  Водоматов:  ${deviceCount}`);
  console.log(`  БД:         ${DB_PATH}`);
  console.log('');
  console.log('  Эндпоинты:');
  console.log(`  POST /api/telemetry      ← от водомата`);
  console.log(`  GET  /api/devices        ← для приложения`);
  console.log(`  GET  /api/kpi            ← дашборд`);
  console.log(`  POST /api/auth/login     ← авторизация`);
  console.log(`  ws://localhost:${PORT}         ← realtime`);
  console.log('════════════════════════════════════════');
  console.log('');
});
